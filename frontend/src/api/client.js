const BASE = (typeof window !== "undefined")
  ? (import.meta.env?.VITE_API_BASE ?? "")
  : "http://127.0.0.1:8420";

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = {};
  if (method !== "GET" && method !== "HEAD" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
  } catch (err) {
    throw new Error(`Unable to connect to backend server (${err.message}). Is the backend running on ${BASE}?`);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res;
}

export const api = {
  base: BASE,

  // Projects
  listProjects: () => request("/api/projects"),
  createProject: (data) => request("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  getProject: (id) => request(`/api/projects/${id}`),
  updateProject: (id, data) => request(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: "DELETE" }),

  // Scripts
  listScripts: (projectId) => request(`/api/projects/${projectId}/scripts`),
  uploadScript: (projectId, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/api/projects/${projectId}/scripts`, { method: "POST", body: form });
  },
  getScript: (scriptId) => request(`/api/scripts/${scriptId}`),
  updateScene: (sceneId, data) => request(`/api/scenes/${sceneId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteScript: (scriptId) => request(`/api/scripts/${scriptId}`, { method: "DELETE" }),
  listNotes: (projectId) => request(`/api/projects/${projectId}/notes`),
  createNote: (projectId, data) => request(`/api/projects/${projectId}/notes`, { method: "POST", body: JSON.stringify(data) }),
  updateNote: (noteId, data) => request(`/api/notes/${noteId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteNote: (noteId) => request(`/api/notes/${noteId}`, { method: "DELETE" }),
  searchProject: (projectId, q) => request(`/api/projects/${projectId}/search?q=${encodeURIComponent(q)}`),

  // Characters
  listCharacters: (projectId) => request(`/api/projects/${projectId}/characters`),

  // Analysis
  analyzeScene: (sceneId, body = {}) =>
    request(`/api/scenes/${sceneId}/analyze`, { method: "POST", body: JSON.stringify(body) }),

  async analyzeAllScenes(scriptId, body, onProgress) {
    const res = await fetch(`${BASE}/api/scripts/${scriptId}/analyze-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok || !res.body) throw new Error("Analysis failed to start");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        onProgress?.(JSON.parse(line));
      }
    }
  },

  // Storyboard & ComfyUI
  generateSceneFrame: (projectId, sceneId, options = {}) =>
    request(`/api/projects/${projectId}/scenes/${sceneId}/generate-frame`, {
      method: "POST",
      body: JSON.stringify(options),
    }),
  clearSceneFrame: (projectId, sceneId) =>
    request(`/api/projects/${projectId}/scenes/${sceneId}/frame`, { method: "DELETE" }),
  getComfyUIStatus: () => request("/api/storyboard/comfyui/status"),
  testComfyUIIntegration: (url) =>
    request("/api/settings/comfyui/test", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  // Settings
  getSettings: () => request("/api/settings"),
  updateSettings: (data) => request("/api/settings", { method: "POST", body: JSON.stringify(data) }),

  // Pitch Deck & Animatic
  getPitchDeck: (projectId) => request(`/api/projects/${projectId}/pitch-deck`),
  generatePitchDeck: (projectId) => request(`/api/projects/${projectId}/pitch-deck/generate`, { method: "POST" }),
  getAnimatic: (projectId) => request(`/api/projects/${projectId}/animatic`),
  generateAnimatic: (projectId) => request(`/api/projects/${projectId}/animatic/generate`, { method: "POST" }),

  // Export
  exportUrl: (projectId, fmt) => `${BASE}/api/projects/${projectId}/export/${fmt}`,
};
