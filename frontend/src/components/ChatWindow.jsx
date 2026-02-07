import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Paperclip } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ChatWindow = ({ messages, onSend, isProcessing }) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSend(input);
      setInput("");
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/v1/files/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        onSend(
          `I have uploaded the file: ${data.filename}. Please analyze it.`,
        );
      } else {
        alert("Upload failed: " + data.detail);
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file.");
    }
  };

  return (
    <div className="chat-window">
      <div className="messages-list">
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.sender}`}>
            <div
              className={`bubble ${m.sender === "ai" ? "markdown-body" : ""}`}
            >
              {m.sender === "ai" ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--accent-primary)",
                      letterSpacing: "0.1em",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    EDITH_OUTPUT :: ANALYZING_SEQUENCE
                  </div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.text}
                  </ReactMarkdown>
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="message ai">
            <div className="bubble" style={{ display: "flex", gap: "8px" }}>
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  background: "var(--accent-primary)",
                  borderRadius: "50%",
                  animation: "pulseNeon 0.5s infinite",
                }}
              ></div>
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  background: "var(--accent-primary)",
                  borderRadius: "50%",
                  animation: "pulseNeon 0.5s infinite 0.2s",
                }}
              ></div>
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  background: "var(--accent-primary)",
                  borderRadius: "50%",
                  animation: "pulseNeon 0.5s infinite 0.4s",
                }}
              ></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <form className="input-wrapper" onSubmit={handleSubmit}>
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            style={{
              marginRight: "20px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-dim)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Paperclip size={20} strokeWidth={1.5} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <input
            type="text"
            placeholder="Command EDITH..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            style={{
              background: "var(--accent-primary)",
              borderRadius: "12px",
              padding: "10px 20px",
              border: "none",
              cursor: "pointer",
              color: "#000",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "0.7rem", letterSpacing: "2px" }}>
              EXEC
            </span>
            <Send size={16} strokeWidth={3} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
