import React from "react";
import {
  Home,
  MessageSquare,
  Database,
  Github,
  Share2,
  Settings,
  Terminal as TerminalIcon,
} from "lucide-react";

const OmniDock = ({
  activeView,
  onViewChange,
  onSettingsClick,
  onConsoleToggle,
}) => {
  const items = [
    { id: "dashboard", icon: Home, label: "Overview" },
    { id: "chat", icon: MessageSquare, label: "Neural Chat" },
    { id: "knowledge", icon: Database, label: "Knowledge" },
    { id: "devops", icon: Github, label: "Git Assist" },
    { id: "social", icon: Share2, label: "Social" },
  ];

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 p-6 flex flex-col justify-center z-1000 pointer-events-none">
      <div className="bg-white/70 backdrop-blur-2xl border border-white/40 px-3 py-6 rounded-[32px] flex flex-col items-center gap-2 pointer-events-auto shadow-2xl shadow-slate-200/50 transition-all duration-300 animate-[viewTransition_0.5s_cubic-bezier(0.16,1,0.3,1)]">
        {items.map((item) => (
          <div
            key={item.id}
            className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-text-dim cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] relative hover:bg-slate-100 hover:text-accent-primary hover:translate-x-1 hover:scale-110 ${
              activeView === item.id ? "text-accent-primary bg-slate-50" : ""
            }`}
            onClick={() => onViewChange(item.id)}
            title={item.label}
          >
            <item.icon size={24} strokeWidth={1.5} />
            {activeView === item.id && (
              <div className="absolute left-[-4px] w-1.5 h-1.5 bg-accent-primary rounded-full shadow-[0_0_10px_var(--color-accent-glow)]" />
            )}
          </div>
        ))}

        <div className="w-6 h-px bg-slate-200 my-2" />

        <div
          className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-text-dim cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] relative hover:bg-slate-100 hover:text-accent-primary hover:translate-x-1 hover:scale-110"
          onClick={onConsoleToggle}
          title="Tactical Console"
        >
          <TerminalIcon size={24} strokeWidth={1.5} />
        </div>

        <div
          className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-text-dim cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] relative hover:bg-slate-100 hover:text-accent-primary hover:translate-x-1 hover:scale-110"
          onClick={onSettingsClick}
          title="System Config"
        >
          <Settings size={24} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
};

export default OmniDock;
