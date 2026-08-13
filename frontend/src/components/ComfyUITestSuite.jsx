import { useState } from "react";
import { api } from "../api/client";
import { Button } from "./ui";

export default function ComfyUITestSuite({ comfyUrl, onTestComplete }) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  async function handleRunTest() {
    setIsRunning(true);
    setError(null);
    try {
      const data = await api.testComfyUIIntegration(comfyUrl);
      setResults(data);
      if (onTestComplete) onTestComplete(data);
    } catch (err) {
      setError(err.message || "Failed to execute ComfyUI test suite");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border-soft)",
        borderRadius: "12px",
        padding: "20px",
        marginTop: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text)" }}>
            ComfyUI Integration Live Test Suite
          </div>
          <div style={{ fontSize: "12.5px", color: "var(--text-dim)", marginTop: "2px" }}>
            Test server reachability, REST API schema compatibility, model checkpoint availability, and execution queue.
          </div>
        </div>
        <Button primary onClick={handleRunTest} disabled={isRunning}>
          {isRunning ? "Running Diagnostic Tests…" : "Run Live Test Suite"}
        </Button>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#ef4444",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            marginTop: "12px",
          }}
        >
          {error}
        </div>
      )}

      {results && (
        <div style={{ marginTop: "16px" }}>
          {/* Summary Banner */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              background: results.overall_pass ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
              border: `1px solid ${results.overall_pass ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
              color: results.overall_pass ? "#10b981" : "#f59e0b",
              fontWeight: 600,
              fontSize: "13.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{results.overall_pass ? "PASS:" : "ATTENTION:"} {results.summary}</span>
            <span style={{ fontSize: "12px", opacity: 0.85, fontFamily: "var(--font-mono)" }}>
              {results.url}
            </span>
          </div>

          {/* Telemetry metadata */}
          {results.gpu_info && results.gpu_info.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "16px",
                fontSize: "12px",
                color: "var(--text-dim)",
                fontFamily: "var(--font-mono)",
                background: "var(--surface)",
                padding: "8px 12px",
                borderRadius: "6px",
                marginBottom: "14px",
              }}
            >
              <span>Hardware: {results.gpu_info.join(", ")}</span>
              {results.vram_free_gb > 0 && <span>Free VRAM: {results.vram_free_gb} GB</span>}
            </div>
          )}

          {/* Individual Test Item Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {results.tests.map((t, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: t.passed ? "#10b981" : "#ef4444",
                    lineHeight: 1.2,
                  }}
                >
                  {t.passed ? "✓" : "✗"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
                    {t.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
