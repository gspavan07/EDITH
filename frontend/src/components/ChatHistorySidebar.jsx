import React, { useState, useEffect } from "react";
import {
  History,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  Clock,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const ChatHistorySidebar = ({
  onLoadConversation,
  onNewChat,
  currentSessionId,
}) => {
  const { isAuthenticated, session } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Load conversations from backend or localStorage
  useEffect(() => {
    loadConversations();
  }, [isAuthenticated]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      if (isAuthenticated && session?.access_token) {
        // Load from Supabase
        const token = session.access_token;
        const response = await axios.get(
          "http://localhost:8000/api/v1/chat-sessions/",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setConversations(response.data.sessions || []);
      } else {
        // Load from localStorage
        const saved = localStorage.getItem("chat_sessions");
        setConversations(saved ? JSON.parse(saved) : []);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId) => {
    try {
      if (isAuthenticated && session?.access_token) {
        const token = session.access_token;
        await axios.delete(
          `http://localhost:8000/api/v1/chat-sessions/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else {
        // Remove from localStorage
        const updated = conversations.filter((c) => c.id !== sessionId);
        setConversations(updated);
        localStorage.setItem("chat_sessions", JSON.stringify(updated));
      }
      loadConversations();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const groupByDate = (convos) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups = {
      Today: [],
      Yesterday: [],
      "Last 7 days": [],
      Older: [],
    };

    convos.forEach((convo) => {
      const date = new Date(convo.updated_at || convo.created_at);
      if (date >= today) {
        groups["Today"].push(convo);
      } else if (date >= yesterday) {
        groups["Yesterday"].push(convo);
      } else if (date >= lastWeek) {
        groups["Last 7 days"].push(convo);
      } else {
        groups["Older"].push(convo);
      }
    });

    return groups;
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const groupedConversations = groupByDate(filteredConversations);

  return (
    <>
      {/* Sidebar - Inline Layout */}
      <div
        className={`h-full bg-white border-l border-gray-200 shadow-lg transition-all duration-300 ${
          isOpen ? "w-80" : "w-0"
        } overflow-hidden shrink-0`}
      >
        <div className="h-full flex flex-col w-80">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <History size={18} className="text-indigo-600" />
                History
              </h2>
            </div>

            {/* New Chat Button */}
            <button
              onClick={onNewChat}
              className="w-full bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
            >
              <Plus size={16} />
              New Chat
            </button>

            {/* Search */}
            <div className="mt-3 relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                Loading...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <MessageSquare size={40} className="mb-2 opacity-30" />
                <p className="text-sm">No conversations</p>
                <p className="text-xs mt-1">Start chatting</p>
              </div>
            ) : (
              Object.entries(groupedConversations).map(([group, convos]) =>
                convos.length > 0 ? (
                  <div key={group}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                      {group}
                    </h3>
                    <div className="space-y-1">
                      {convos.map((convo) => (
                        <div
                          key={convo.id}
                          className={`group relative px-2.5 py-2.5 rounded-lg cursor-pointer transition-all ${
                            currentSessionId === convo.id
                              ? "bg-indigo-50 border border-indigo-200"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => onLoadConversation(convo.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {convo.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                                <Clock size={11} />
                                {new Date(
                                  convo.updated_at || convo.created_at,
                                ).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(convo.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                            >
                              <Trash2 size={13} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null,
              )
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Conversation?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This action cannot be undone. All messages in this conversation
              will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatHistorySidebar;
