import React, { useState } from "react";
import { X, ChevronDown, ChevronRight, Activity, Terminal } from "lucide-react";

const CommandConsole = ({ logs, onClear, visible, onClose }) => {
  const [expandedLog, setExpandedLog] = useState(null);

  const toggleExpand = (id) => {
    setExpandedLog(expandedLog === id ? null : id);
  };

  return (
    <div
      className={`fixed top-full left-1/2 -translate-x-1/2 w-[90vw] max-w-6xl h-[55vh] bg-white border border-gray-200 border-b-0 rounded-t-3xl shadow-2xl transition-transform duration-500 ease-out z-50 ${visible ? "-translate-y-full" : ""}`}
    >
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-gray-900">Console</span>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-xs text-gray-500 font-medium">
            Latency: 12ms | Active
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-80px)] overflow-y-auto p-6">
        {logs.length === 0 ? (
          <div className="text-gray-400 font-mono text-sm">
            Waiting for activity...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="mb-3 p-3 bg-gray-50 border border-gray-100 rounded-xl font-mono text-sm cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
              onClick={() => log.details && toggleExpand(log.id)}
            >
              <div className="flex gap-4 items-start">
                <span className="text-gray-400 shrink-0 text-xs">
                  [{new Date(log.id).toLocaleTimeString()}]
                </span>
                <span
                  className={`flex-1 ${
                    log.type === "error"
                      ? "text-red-600 font-semibold"
                      : log.type === "success"
                        ? "text-green-600 font-semibold"
                        : log.type === "thinking"
                          ? "text-amber-600"
                          : "text-gray-900"
                  }`}
                >
                  {log.text}
                </span>
                {log.details && (
                  <div className="text-gray-400">
                    {expandedLog === log.id ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </div>
                )}
              </div>

              {expandedLog === log.id && log.details && (
                <div className="mt-3 p-4 bg-gray-900 rounded-xl text-gray-300 text-xs whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommandConsole;
