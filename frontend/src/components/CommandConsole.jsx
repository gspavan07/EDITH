import React, { useState } from "react";
import { X, ChevronDown, ChevronRight, Activity, Terminal } from "lucide-react";

const CommandConsole = ({ logs, onClear, visible, onClose }) => {
  const [expandedLog, setExpandedLog] = useState(null);

  const toggleExpand = (id) => {
    setExpandedLog(expandedLog === id ? null : id);
  };

  return (
    <div className={`command-console ${visible ? "visible" : ""}`}>
      <div className="console-header">
        <div className="pulse-indicator">
          <div className="pulse-dot"></div>
          <span>EDITH.NEURAL_STREAM v3.0</span>
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-ghost)",
              fontFamily: "var(--font-mono)",
            }}
          >
            SYSTEM_LATENCY: 12ms | ADAPTERS: 4_ACTIVE
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-dim)",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div
        className="console-body"
        style={{
          height: "calc(100% - 60px)",
          overflowY: "auto",
          paddingRight: "10px",
        }}
      >
        {logs.length === 0 ? (
          <div
            style={{
              color: "var(--text-ghost)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
            }}
          >
            [WAITING_FOR_SEQUENCE_INIT...]
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              style={{
                marginBottom: "12px",
                padding: "12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
              }}
              onClick={() => log.details && toggleExpand(log.id)}
            >
              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ color: "var(--text-ghost)" }}>
                  [{new Date(log.id).toLocaleTimeString()}]
                </span>
                <span
                  style={{
                    color:
                      log.type === "error"
                        ? "#ef4444"
                        : log.type === "success"
                          ? "#22d3ee"
                          : log.type === "thinking"
                            ? "#f59e0b"
                            : "#fff",
                  }}
                >
                  {log.text}
                </span>
                {log.details &&
                  (expandedLog === log.id ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  ))}
              </div>

              {expandedLog === log.id && log.details && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "15px",
                    background: "#000",
                    border: "1px solid var(--border-glass)",
                    borderRadius: "6px",
                    color: "#94a3b8",
                    fontSize: "0.8rem",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {JSON.stringify(log.details, null, 2)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "40px",
          color: "var(--accent-primary)",
          opacity: 0.3,
          fontSize: "0.6rem",
          letterSpacing: "4px",
        }}
      >
        SECURE_AGENT_SESSION_ACTIVE
      </div>
    </div>
  );
};

export default CommandConsole;
