"""
Deterministic, rule-based screenplay parser.

Deliberately NOT AI-based: parsing is a solved problem for standard
screenplay format (Fountain-like / industry-standard slugline conventions),
and doing it with regex/heuristics means it's instant, free, works fully
offline, and gives the AI layer clean structured input to reason over
instead of raw text. This is the "never send the whole screenplay"
principle in action - by the time anything reaches an LLM, it's already
been reduced to a single scene or a compact summary.

Supports standard screenplay conventions:
    INT. COFFEE SHOP - NIGHT
    EXT. ALLEY - DAY
    INT./EXT. CAR - CONTINUOUS

Character cues are ALL-CAPS lines (optionally with an extension like
(V.O.) or (CONT'D)) immediately followed by dialogue. Parentheticals
inside dialogue blocks are captured separately. Transitions are trailing
ALL-CAPS lines ending in "TO:" (CUT TO:, DISSOLVE TO:, SMASH CUT TO:) or
FADE IN:/FADE OUT.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

SLUGLINE_RE = re.compile(
    r"^\s*(INT|EXT|INT/EXT|EXT/INT|I/E)[./\s]+(.+?)(?:\s*[-–—]\s*(.+))?\s*$",
    re.IGNORECASE,
)
TRANSITION_RE = re.compile(r"^\s*[A-Z][A-Z0-9 .'’]*\bTO:\s*$|^\s*FADE (IN|OUT)[:.]?\s*$")
CHARACTER_CUE_RE = re.compile(r"^\s*([A-Z][A-Z0-9 .'\-]{1,40})(\s*\(([^)]+)\))?\s*$")
PARENTHETICAL_RE = re.compile(r"^\s*\(([^)]+)\)\s*$")
PAGE_NUM_RE = re.compile(r"^\s*\d+\.?\s*$")

TIME_KEYWORDS = ("DAY", "NIGHT", "MORNING", "EVENING", "DUSK", "DAWN",
                  "CONTINUOUS", "LATER", "AFTERNOON", "SUNSET", "SUNRISE")


@dataclass
class ParsedDialogueLine:
    character: str
    line: str
    parenthetical: str | None = None


@dataclass
class ParsedScene:
    scene_number: int
    slugline: str
    int_ext: str
    location: str
    time_of_day: str
    action_text: str = ""
    dialogue: list[ParsedDialogueLine] = field(default_factory=list)
    characters_present: list[str] = field(default_factory=list)


@dataclass
class ParsedScript:
    title: str
    scenes: list[ParsedScene]


def _clean_lines(raw_text: str) -> list[str]:
    lines = raw_text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    out = []
    for ln in lines:
        if PAGE_NUM_RE.match(ln):
            continue
        out.append(ln.rstrip())
    return out


def _guess_title(lines: list[str]) -> str:
    for ln in lines[:40]:
        stripped = ln.strip()
        if not stripped:
            continue
        if SLUGLINE_RE.match(stripped):
            break
        # A short, non-slugline, non-transition, mostly-uppercase early line
        # is very likely the title page title.
        if (stripped.isupper() and 2 <= len(stripped) <= 60
                and not TRANSITION_RE.match(stripped)):
            return stripped.title()
    return "Untitled Screenplay"


def _split_slugline(text: str) -> tuple[str, str, str]:
    """Returns (int_ext, location, time_of_day)."""
    m = SLUGLINE_RE.match(text)
    if not m:
        return "", text.strip(), ""
    int_ext = m.group(1).upper().replace(" ", "")
    rest = m.group(2).strip() if m.group(2) else ""
    time_part = m.group(3).strip() if m.group(3) else ""

    if not time_part:
        # Sometimes the time is embedded without a dash, e.g. "KITCHEN NIGHT"
        for kw in TIME_KEYWORDS:
            if rest.upper().endswith(kw):
                time_part = kw.title()
                rest = rest[: -len(kw)].strip(" -–—")
                break
    return int_ext, rest.strip(" -–—").title(), time_part.title()


def parse_screenplay(raw_text: str) -> ParsedScript:
    lines = _clean_lines(raw_text)
    title = _guess_title(lines)

    scenes: list[ParsedScene] = []
    current: ParsedScene | None = None
    action_buffer: list[str] = []
    pending_character: str | None = None
    pending_parenthetical: str | None = None
    dialogue_buffer: list[str] = []
    scene_number = 0

    def flush_action():
        nonlocal action_buffer
        if current is not None and action_buffer:
            text = "\n".join(l for l in action_buffer if l.strip())
            if text:
                current.action_text = (current.action_text + "\n" + text).strip()
        action_buffer = []

    def flush_dialogue():
        nonlocal pending_character, pending_parenthetical, dialogue_buffer
        if current is not None and pending_character and dialogue_buffer:
            text = " ".join(l.strip() for l in dialogue_buffer if l.strip())
            if text:
                current.dialogue.append(ParsedDialogueLine(
                    character=pending_character,
                    line=text,
                    parenthetical=pending_parenthetical,
                ))
                base_name = pending_character.split("(")[0].strip()
                if base_name not in current.characters_present:
                    current.characters_present.append(base_name)
        pending_character, pending_parenthetical, dialogue_buffer = None, None, []

    i = 0
    n = len(lines)
    while i < n:
        raw_line = lines[i]
        stripped = raw_line.strip()
        i += 1

        if not stripped:
            # Blank line ends an in-progress dialogue block.
            if dialogue_buffer:
                flush_dialogue()
            continue

        if SLUGLINE_RE.match(stripped):
            flush_dialogue()
            flush_action()
            scene_number += 1
            int_ext, location, time_of_day = _split_slugline(stripped)
            current = ParsedScene(
                scene_number=scene_number,
                slugline=stripped.upper(),
                int_ext=int_ext,
                location=location,
                time_of_day=time_of_day,
            )
            scenes.append(current)
            continue

        if TRANSITION_RE.match(stripped):
            flush_dialogue()
            flush_action()
            continue

        if current is None:
            # Title page / preamble content before scene 1 - ignore for
            # structural purposes.
            continue

        # Parenthetical inside a dialogue block.
        if dialogue_buffer or pending_character:
            pm = PARENTHETICAL_RE.match(stripped)
            if pm:
                if not dialogue_buffer:
                    pending_parenthetical = pm.group(1)
                    continue
                # mid-dialogue parenthetical - fold into the line as a cue
                dialogue_buffer.append(f"({pm.group(1)})")
                continue

        cm = CHARACTER_CUE_RE.match(stripped)
        looks_like_cue = bool(cm) and stripped.isupper() and len(stripped) <= 40
        if looks_like_cue:
            flush_dialogue()
            flush_action()
            pending_character = cm.group(1).strip()
            continue

        if pending_character is not None:
            dialogue_buffer.append(stripped)
        else:
            action_buffer.append(raw_line)

    flush_dialogue()
    flush_action()

    return ParsedScript(title=title, scenes=scenes)
