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
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl shadow-lg border border-gray-100">
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col gap-3 w-full max-w-4xl mx-auto ${
              m.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`px-6 py-4 rounded-2xl text-base leading-relaxed transition-all ${
                m.sender === "user"
                  ? "bg-indigo-500 text-white rounded-tr-sm shadow-sm"
                  : "bg-gray-50 text-gray-900 border border-gray-100 rounded-tl-sm"
              }`}
            >
              {m.sender === "ai" ? (
                <div className="flex flex-col gap-3">
                  <div className="text-xs text-indigo-500 font-medium">
                    EDITH
                  </div>
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-indigo-600 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex flex-col gap-3 w-full max-w-4xl mx-auto items-start">
            <div className="px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 rounded-tl-sm text-gray-400 italic text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 w-full max-w-4xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl p-1.5 flex items-center shadow-sm transition-all focus-within:border-indigo-400 focus-within:shadow-md"
        >
          <input
            type="text"
            className="flex-1 bg-transparent border-none px-5 py-3 text-gray-900 placeholder:text-gray-400 outline-none"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="w-11 h-11 bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!input.trim() || isProcessing}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
