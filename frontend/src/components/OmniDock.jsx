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
    <div className="omni-dock-container">
      <div className="omni-dock">
        {items.map((item) => (
          <div
            key={item.id}
            className={`dock-item ${activeView === item.id ? "active" : ""}`}
            onClick={() => onViewChange(item.id)}
            title={item.label}
          >
            <item.icon size={24} strokeWidth={1.5} />
          </div>
        ))}

        <div
          style={{
            width: "1px",
            height: "24px",
            background: "var(--border-glass)",
            margin: "0 8px",
          }}
        />

        <div
          className="dock-item"
          onClick={onConsoleToggle}
          title="Tactical Console"
        >
          <TerminalIcon size={24} strokeWidth={1.5} />
        </div>

        <div
          className="dock-item"
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
