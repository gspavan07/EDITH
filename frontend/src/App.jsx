import React, { useState, useEffect } from "react";
import axios from "axios";
import OmniDock from "./components/OmniDock";
import CommandConsole from "./components/CommandConsole";
import ChatWindow from "./components/ChatWindow";
import SettingsPanel from "./components/SettingsPanel";
import DocumentExplorer from "./components/DocumentExplorer";
import "./index.css";

function App() {
  const [activeView, setActiveView] = useState("chat");
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "EDITH V3.0 ONLINE. Neural network stabilized. I am ready for tactical orchestration. How can I assist your mission?",
      sender: "ai",
    },
  ]);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);

  const handleSendMessage = async (text) => {
    const newUserMsg = { id: Date.now(), text, sender: "user" };
    setMessages((prev) => [...prev, newUserMsg]);

    setIsProcessing(true);
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "thinking",
        text: `INITIATING_SEQUENCE_PLAN: "${text.substring(0, 20)}..."`,
      },
    ]);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const response = await axios.post("http://localhost:8000/api/v1/chat/", {
        message: text,
        history: history,
      });

      const { response: aiText, log_id, intent } = response.data;

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 20, text: aiText, sender: "ai" },
      ]);

      setLogs((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "action",
          text: `DETECTED_INTENT: ${intent.toUpperCase()}`,
        },
      ]);

      // Fetch log details
      try {
        const logRes = await axios.get(
          `http://localhost:8000/api/v1/logs/${log_id}`,
        );
        const logData = logRes.data;
        if (logData.details?.steps) {
          logData.details.steps.forEach((step, idx) => {
            setLogs((prev) => [
              ...prev,
              {
                id: Date.now() + 100 + idx,
                type: "action",
                text: `EXEC_STEP_${idx + 1}: ${step.action}`,
                details: step.result,
              },
            ]);
          });
        }
      } catch (e) {}

      setLogs((prev) => [
        ...prev,
        {
          id: Date.now() + 60,
          type: "success",
          text: `SEQUENCE_COMPLETE: LOG_ID_${log_id}`,
        },
      ]);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "error",
          text: "SEQUENCE_ABORTED: SYSTEM_ERROR",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="omni-layout">
      {/* Top Pulse/Identity Area */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              background: "var(--accent-primary)",
              borderRadius: "50%",
              boxShadow: "0 0 15px var(--accent-primary)",
              animation: "pulseNeon 2s infinite",
            }}
          ></div>
          <h1
            style={{
              fontSize: "0.9rem",
              letterSpacing: "0.3em",
              fontWeight: 900,
              color: "var(--accent-primary)",
            }}
          >
            EDITH.COMMAND_CENTER v3.0
          </h1>
        </div>
        <div
          style={{
            color: "var(--text-ghost)",
            fontSize: "0.7rem",
            fontFamily: "var(--font-mono)",
            pointerEvents: "auto",
          }}
        >
          NEURAL_HEALTH: 100% | UPTIME: 3H_12M
        </div>
      </header>

      <div className="viewport-container">
        <div className="viewport-content">
          {activeView === "chat" && (
            <ChatWindow
              messages={messages}
              onSend={handleSendMessage}
              isProcessing={isProcessing}
            />
          )}
          {activeView === "knowledge" && (
            <div style={{ padding: "50px 0", height: "100%" }}>
              <DocumentExplorer onClose={() => setActiveView("chat")} />
            </div>
          )}
          {activeView === "dashboard" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-ghost)",
              }}
            >
              SYSTEM_DASHBOARD_PREPARING...
            </div>
          )}
        </div>
      </div>

      <OmniDock
        activeView={activeView}
        onViewChange={setActiveView}
        onSettingsClick={() => setShowSettings(true)}
        onConsoleToggle={() => setConsoleVisible(!consoleVisible)}
      />

      <CommandConsole
        logs={logs}
        visible={consoleVisible}
        onClose={() => setConsoleVisible(false)}
        onClear={() => setLogs([])}
      />

      {showSettings && (
        <div className="settings-overlay">
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
}

export default App;
