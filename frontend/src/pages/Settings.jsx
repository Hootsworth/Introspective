import { useEffect, useState } from "react";
import { api } from "../api/client";
import ComfyUITestSuite from "../components/ComfyUITestSuite";
import TopBar from "../components/TopBar";
import { Button } from "../components/ui";
import styles from "./Settings.module.css";

const MODES = [
  { id: "local", label: "Local Only" },
  { id: "hybrid", label: "Hybrid" },
  { id: "cloud", label: "Cloud Only" },
];

export default function Settings({ theme, setTheme }) {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  function loadSettings() {
    setError(null);
    api
      .getSettings()
      .then((s) => {
        setSettings(s);
        setForm({
          default_ai_mode: s.default_ai_mode,
          local_model: s.local_model,
          openai_model: s.openai_model,
          gemini_model: s.gemini_model,
          image_backend: s.image_backend,
          comfyui_url: s.comfyui_url || "http://127.0.0.1:8188",
          openai_api_key: "",
          gemini_api_key: "",
        });
      })
      .catch((err) => {
        setError(err.message || "Failed to load settings");
      });
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.openai_api_key) delete payload.openai_api_key;
      if (!payload.gemini_api_key) delete payload.gemini_api_key;
      const updated = await api.updateSettings(payload);
      setSettings(updated);
      setForm((f) => ({ ...f, openai_api_key: "", gemini_api_key: "" }));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <>
        <TopBar
          title="Settings"
          subtitle="API keys, model selection, and inference mode"
          theme={theme}
          setTheme={setTheme}
          backTo="/"
          backLabel="Dashboard"
        />
        <div style={{ padding: 32, maxWidth: 600 }}>
          <div style={{ color: "#ef4444", marginBottom: 16, fontSize: 14 }}>{error}</div>
          <Button primary onClick={loadSettings}>
            Retry Loading Settings
          </Button>
        </div>
      </>
    );
  }

  if (!settings) return <div style={{ padding: 32, color: "var(--text-dim)" }}>Loading…</div>;

  return (
    <>
      <TopBar
        title="Settings"
        subtitle="API keys, model selection, and inference mode"
        theme={theme}
        setTheme={setTheme}
        backTo="/"
        backLabel="Dashboard"
      />
      <div className={styles.wrap}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Appearance & Theme</div>
          <div className={styles.sectionDesc}>Customize application color scheme and UI aesthetic.</div>
          <div className={styles.modeRow}>
            <button
              type="button"
              className={`${styles.modeBtn} ${theme === "dark" ? styles.modeBtnActive : ""}`}
              onClick={() => setTheme("dark")}
            >
              Dark Mode (Default)
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${theme === "light" ? styles.modeBtnActive : ""}`}
              onClick={() => setTheme("light")}
            >
              Light Mode
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Local Inference</div>
          <div className={styles.sectionDesc}>
            Via Ollama at localhost:11434.{" "}
            <span className={`${styles.statusDot} ${settings.ollama_reachable ? styles.dotOn : styles.dotOff}`} />{" "}
            {settings.ollama_reachable ? "Reachable" : "Not reachable — start Ollama, or use Cloud mode below."}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Local model (free text — llama3.2, mlx-community/Qwen3-8B, etc.)</label>
            <input
              className={styles.input}
              value={form.local_model || ""}
              onChange={(e) => set("local_model", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Cloud Inference</div>
          <div className={styles.sectionDesc}>
            Keys are encrypted at rest on this machine and never sent anywhere except the respective provider's API.
            Cloud is only ever called in Hybrid (as fallback) or Cloud Only mode.
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              OpenAI API key{" "}
              <span className={`${styles.statusDot} ${settings.has_openai_key ? styles.dotOn : styles.dotOff}`} />
              {settings.has_openai_key ? "set" : "not set"}
            </label>
            <input
              className={styles.input}
              type="password"
              placeholder={settings.has_openai_key ? "••••••••••••••" : "sk-..."}
              value={form.openai_api_key || ""}
              onChange={(e) => set("openai_api_key", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>OpenAI model (free text — gpt-5-mini, gpt-5.5, etc.)</label>
            <input
              className={styles.input}
              value={form.openai_model || ""}
              onChange={(e) => set("openai_model", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              Gemini API key{" "}
              <span className={`${styles.statusDot} ${settings.has_gemini_key ? styles.dotOn : styles.dotOff}`} />
              {settings.has_gemini_key ? "set" : "not set"}
            </label>
            <input
              className={styles.input}
              type="password"
              placeholder={settings.has_gemini_key ? "••••••••••••••" : "AIza..."}
              value={form.gemini_api_key || ""}
              onChange={(e) => set("gemini_api_key", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Gemini model (free text — gemini-2.5-flash, gemini-2.5-pro, etc.)</label>
            <input
              className={styles.input}
              value={form.gemini_model || ""}
              onChange={(e) => set("gemini_model", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Default AI Mode</div>
          <div className={styles.sectionDesc}>New projects start with this mode. Each project can override it individually.</div>
          <div className={styles.modeRow}>
            {MODES.map((m) => (
              <button
                key={m.id}
                className={`${styles.modeBtn} ${form.default_ai_mode === m.id ? styles.modeBtnActive : ""}`}
                onClick={() => set("default_ai_mode", m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Image Backend & Storyboarding</div>
          <div className={styles.sectionDesc}>
            Select your local image generation engine and configure API endpoints.
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Image Backend Engine</label>
            <select
              className={styles.input}
              value={form.image_backend || "comfyui"}
              onChange={(e) => set("image_backend", e.target.value)}
            >
              <option value="comfyui">ComfyUI (local - recommended)</option>
              <option value="automatic1111">Automatic1111 (local)</option>
              <option value="sdxl_local">SDXL / SDXL Turbo (local)</option>
              <option value="none">None / Fallback concept slates</option>
            </select>
          </div>

          <div className={styles.field} style={{ marginTop: 14 }}>
            <label className={styles.label}>
              ComfyUI Server URL{" "}
              <span className={`${styles.statusDot} ${settings.comfyui_reachable ? styles.dotOn : styles.dotOff}`} />
              {settings.comfyui_reachable ? "Reachable" : "Not reachable"}
            </label>
            <input
              className={styles.input}
              placeholder="http://127.0.0.1:8188"
              value={form.comfyui_url || ""}
              onChange={(e) => set("comfyui_url", e.target.value)}
            />
          </div>

          {/* Embedded Diagnostic Test Suite */}
          <ComfyUITestSuite comfyUrl={form.comfyui_url} onTestComplete={loadSettings} />
        </div>

        <div className={styles.saveBar}>
          <Button primary onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved" : "Save Settings"}
          </Button>
        </div>
      </div>
    </>
  );
}
