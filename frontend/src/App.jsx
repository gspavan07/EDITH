import React, { useState, useEffect } from "react";
import axios from "axios";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import OmniDock from "./components/OmniDock";
import CommandConsole from "./components/CommandConsole";
import ChatWindow from "./components/ChatWindow";
import SettingsPanel from "./components/SettingsPanel";
import DocumentExplorer from "./components/DocumentExplorer";
import DocumentLibrary from "./components/DocumentLibrary";
import AuthModal from "./components/AuthModal";
import WelcomePrompt from "./components/WelcomePrompt";
import FeatureGuard from "./components/FeatureGuard";
import ChatHistorySidebar from "./components/ChatHistorySidebar";
import "./index.css";

function AppContent() {
  const { isAuthenticated, session } = useAuth();
  const [activeView, setActiveView] = useState("chat");
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi there!! I am Edith how can i help you today?",
      sender: "ai",
    },
  ]);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [needsSessionSave, setNeedsSessionSave] = useState(false);

  // Check if user has seen welcome prompt
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
    if (!hasSeenWelcome && !isAuthenticated) {
      // Show welcome after a brief delay
      const timer = setTimeout(() => setShowWelcome(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Auto-save session when messages change
  useEffect(() => {
    if (messages.length > 1 && needsSessionSave) {
      saveCurrentSession();
      setNeedsSessionSave(false);
    }
  }, [messages, needsSessionSave]);

  const saveCurrentSession = async () => {
    try {
      if (isAuthenticated && session?.access_token) {
        const token = session.access_token;

        if (!currentSessionId) {
          // Create new session
          const sessionRes = await axios.post(
            "http://localhost:8000/api/v1/chat-sessions/",
            { title: generateSessionTitle(messages) },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          setCurrentSessionId(sessionRes.data.id);

          // Save messages to new session
          for (const msg of messages) {
            await axios.post(
              `http://localhost:8000/api/v1/chat-sessions/${sessionRes.data.id}/messages`,
              { text: msg.text, sender: msg.sender },
              { headers: { Authorization: `Bearer ${token}` } },
            );
          }
        }
      } else {
        // Guest mode - save to localStorage
        const sessions = JSON.parse(
          localStorage.getItem("chat_sessions") || "[]",
        );
        const sessionIndex = sessions.findIndex(
          (s) => s.id === currentSessionId,
        );

        const sessionData = {
          id: currentSessionId || `session_${Date.now()}`,
          title: generateSessionTitle(messages),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: messages,
        };

        if (sessionIndex >= 0) {
          sessions[sessionIndex] = sessionData;
        } else {
          sessions.unshift(sessionData);
          setCurrentSessionId(sessionData.id);
        }

        localStorage.setItem("chat_sessions", JSON.stringify(sessions));
      }
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const generateSessionTitle = (msgs) => {
    const firstUserMsg = msgs.find((m) => m.sender === "user");
    if (firstUserMsg) {
      return (
        firstUserMsg.text.substring(0, 50) +
        (firstUserMsg.text.length > 50 ? "..." : "")
      );
    }
    return "New Conversation";
  };

  const loadConversation = async (sessionId) => {
    try {
      if (isAuthenticated && session?.access_token) {
        const token = session.access_token;
        const response = await axios.get(
          `http://localhost:8000/api/v1/chat-sessions/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setMessages(
          response.data.messages.map((m) => ({
            id: m.id,
            text: m.text,
            sender: m.sender,
          })),
        );
        setCurrentSessionId(sessionId);
      } else {
        const sessions = JSON.parse(
          localStorage.getItem("chat_sessions") || "[]",
        );
        const foundSession = sessions.find((s) => s.id === sessionId);
        if (foundSession) {
          setMessages(foundSession.messages);
          setCurrentSessionId(sessionId);
        }
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: 1,
        text: "Hi there!! I am Edith how can i help you today?",
        sender: "ai",
      },
    ]);
    setCurrentSessionId(null);
    setLogs([]);
  };

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

      // Trigger session save
      setNeedsSessionSave(true);

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
    <div className="flex flex-col h-screen relative bg-linear-to-br from-gray-50 via-white to-blue-50">
      {/* Modern Header */}
      <header className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-8 z-50 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
          <h1 className="text-sm font-semibold text-gray-900">
            EDITH <span className="text-indigo-500">v3.0</span>
          </h1>
        </div>
      </header>

      <div className="flex-1 w-full flex justify-center overflow-hidden">
        <div className="w-full h-full flex ">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeView === "chat" && (
              <ChatWindow
                messages={messages}
                onSend={handleSendMessage}
                isProcessing={isProcessing}
              />
            )}
            {activeView === "knowledge" && (
              <FeatureGuard
                isAuthenticated={isAuthenticated}
                requiresAuth={true}
                featureName="Document Library"
                message="Sign in to upload and search documents with vector AI"
                onRequestAuth={() => setShowAuthModal(true)}
              >
                <DocumentLibrary />
              </FeatureGuard>
            )}
            {activeView === "dashboard" && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Dashboard Coming Soon</p>
              </div>
            )}
          </div>

          {/* Chat History Sidebar - Only show in chat view */}
          {activeView === "chat" && (
            <ChatHistorySidebar
              onLoadConversation={loadConversation}
              onNewChat={startNewChat}
              currentSessionId={currentSessionId}
            />
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
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            onShowAuth={() => {
              setShowSettings(false);
              setShowAuthModal(true);
            }}
          />
        </div>
      )}

      {showWelcome && (
        <WelcomePrompt
          isOpen={showWelcome}
          onClose={() => setShowWelcome(false)}
          onSignIn={() => {
            setShowWelcome(false);
            setShowAuthModal(true);
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
