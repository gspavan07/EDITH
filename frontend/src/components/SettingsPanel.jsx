import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  X,
  Save,
  AlertCircle,
  Mail,
  CheckCircle2,
  Linkedin,
  ExternalLink,
  RefreshCw,
  Power,
  User,
  LogOut,
  LogIn,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const SettingsPanel = ({ onClose, onShowAuth }) => {
  const [activeTab, setActiveTab] = useState("account");
  const { user, isAuthenticated, signOut, isConfigured } = useAuth();
  const [settings, setSettings] = useState({
    USER_NAME: "",
    SMTP_EMAIL: "",
    SMTP_PASSWORD: "",
    LINKEDIN_CLIENT_ID: "",
    LINKEDIN_CLIENT_SECRET: "",
  });
  const [linkedinStatus, setLinkedinStatus] = useState({
    authenticated: false,
    loading: true,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchSettings();
    checkLinkedInStatus();
    return () => clearInterval(pollingRef.current);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/v1/settings/");
      const data = res.data;
      const newSettings = { ...settings };
      data.forEach((item) => {
        if (newSettings.hasOwnProperty(item.key)) {
          newSettings[item.key] = item.value;
        }
      });
      setSettings(newSettings);
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  const checkLinkedInStatus = async () => {
    setLinkedinStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await axios.get(
        "http://localhost:8000/api/v1/linkedin/status",
      );
      setLinkedinStatus({
        authenticated: res.data.authenticated,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to check LinkedIn status", err);
      setLinkedinStatus({ authenticated: false, loading: false });
    }
  };

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.get(
          "http://localhost:8000/api/v1/linkedin/status",
        );
        if (res.data.authenticated) {
          setLinkedinStatus({ authenticated: true, loading: false });
          clearInterval(pollingRef.current);
        }
      } catch (e) {}
    }, 3000);
  };

  const handleLinkedInAuth = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/v1/linkedin/auth");
      window.open(res.data.auth_url, "LinkedInAuth", "width=600,height=700");
      startPolling();
    } catch (err) {
      setMessage({ type: "error", text: "Failed to initiate LinkedIn auth." });
    }
  };

  const handleLinkedInDisconnect = async () => {
    try {
      await axios.post("http://localhost:8000/api/v1/linkedin/disconnect");
      setLinkedinStatus({ authenticated: false, loading: false });
      setMessage({
        type: "success",
        text: "LinkedIn disconnected successfully.",
      });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to disconnect LinkedIn." });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await axios.post("http://localhost:8000/api/v1/settings/", {
          key,
          value,
          description: `Config for ${key}`,
        });
      }
      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-xl border border-gray-100">
      {/* Header */}
      <div className="p-8 pb-6 flex justify-between items-start border-b border-gray-100">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500">Configure your integrations</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-8 gap-6 border-b border-gray-100">
        <button
          onClick={() => setActiveTab("account")}
          className={`pb-4 px-1 flex items-center gap-2 text-sm font-medium transition-all relative ${
            activeTab === "account"
              ? "text-indigo-600"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <User size={16} />
          <span>Account</span>
          {activeTab === "account" && (
            <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-indigo-500 rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("linkedin")}
          className={`pb-4 px-1 flex items-center gap-2 text-sm font-medium transition-all relative ${
            activeTab === "linkedin"
              ? "text-indigo-600"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Linkedin size={16} />
          <span>LinkedIn</span>
          {activeTab === "linkedin" && (
            <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-indigo-500 rounded-t" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            {message.type === "error" && <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="space-y-6">
            {isConfigured ? (
              isAuthenticated ? (
                /* Logged In State */
                <div className="space-y-6">
                  <div className="bg-linear-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                        {user?.email?.[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user?.user_metadata?.username || "User"}
                        </h3>
                        <p className="text-sm text-gray-600">{user?.email}</p>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Connected
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Cloud Features
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Document storage & sync
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Vector search enabled
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Chat history backup
                      </div>
                    </div>
                  </div>

                  {/* Gmail OAuth Status */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Gmail Integration
                    </h4>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                        <CheckCircle2 size={16} />
                        Connected via Google OAuth
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-600 mt-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Read emails
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Compose & draft
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Send emails
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={signOut}
                    className="w-full bg-red-50 text-red-600 border border-red-100 font-medium py-3 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                /* Not Logged In State */
                <div className="text-center space-y-6 py-8">
                  <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center">
                    <User size={32} className="text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Sign in to unlock cloud features
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                      Store documents in the cloud, enable vector search, and
                      sync across devices
                    </p>
                  </div>
                  <button
                    onClick={onShowAuth}
                    className="mx-auto bg-indigo-500 text-white font-medium py-3 px-8 rounded-xl hover:bg-indigo-600 transition-colors flex items-center gap-2"
                  >
                    <LogIn size={18} />
                    <span>Sign In</span>
                  </button>
                </div>
              )
            ) : (
              /* Supabase Not Configured */
              <div className="text-center space-y-4 py-8">
                <div className="w-20 h-20 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center">
                  <AlertCircle size={32} className="text-amber-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Cloud features not configured
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in
                    your environment to enable cloud storage and authentication
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gmail Tab */}
        {activeTab === "gmail" &&
          (isAuthenticated ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  value={settings.SMTP_EMAIL}
                  onChange={(e) =>
                    setSettings({ ...settings, SMTP_EMAIL: e.target.value })
                  }
                  placeholder="your.email@gmail.com"
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-700">
                  App Password
                </label>
                <input
                  type="password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  value={settings.SMTP_PASSWORD}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      SMTP_PASSWORD: e.target.value,
                    })
                  }
                  placeholder="••••••••••••••••"
                />
                <p className="text-xs text-gray-500">
                  Use your Google App Password for secure access.
                </p>
              </div>

              <button
                className="w-full bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50"
                onClick={handleSave}
                disabled={loading}
              >
                <Save size={18} />
                <span>{loading ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          ) : (
            /* Not Logged In */
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center">
                <Mail size={32} className="text-amber-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Sign in to configure Gmail
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Gmail integration requires authentication to protect your
                  credentials
                </p>
              </div>
              <button
                onClick={onShowAuth}
                className="mx-auto bg-indigo-500 text-white font-medium py-3 px-8 rounded-xl hover:bg-indigo-600 transition-colors flex items-center gap-2"
              >
                <LogIn size={18} />
                <span>Sign In</span>
              </button>
            </div>
          ))}

        {/* LinkedIn Tab */}
        {activeTab === "linkedin" &&
          (isAuthenticated ? (
            <div className="space-y-6">
              {/* Status Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                    linkedinStatus.authenticated
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Linkedin size={32} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${linkedinStatus.authenticated ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {linkedinStatus.authenticated
                        ? "Connected"
                        : "Not Connected"}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 max-w-xs">
                    {linkedinStatus.authenticated
                      ? "Your LinkedIn account is connected."
                      : "Connect your LinkedIn account to enable features."}
                  </p>
                </div>

                <div className="flex gap-3 w-full mt-2">
                  {!linkedinStatus.authenticated ? (
                    <button
                      onClick={handleLinkedInAuth}
                      className="flex-1 bg-indigo-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors"
                    >
                      <ExternalLink size={18} />
                      <span>Connect</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleLinkedInAuth}
                        className="flex-1 bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                      >
                        <RefreshCw size={18} />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={handleLinkedInDisconnect}
                        className="px-6 bg-red-50 text-red-600 border border-red-100 font-medium py-3 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"
                      >
                        <Power size={18} />
                        <span>Disconnect</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Config Fields */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-700">
                    Client ID
                  </label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-indigo-400 transition-all"
                    value={settings.LINKEDIN_CLIENT_ID}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        LINKEDIN_CLIENT_ID: e.target.value,
                      })
                    }
                    placeholder="Enter Client ID..."
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-700">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-indigo-400 transition-all"
                    value={settings.LINKEDIN_CLIENT_SECRET}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        LINKEDIN_CLIENT_SECRET: e.target.value,
                      })
                    }
                    placeholder="••••••••••••••••"
                  />
                </div>
                <button
                  className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-200 transition-colors"
                  onClick={handleSave}
                >
                  Save Credentials
                </button>
              </div>
            </div>
          ) : (
            /* Not Logged In */
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center">
                <Linkedin size={32} className="text-amber-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Sign in to configure LinkedIn
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  LinkedIn integration requires authentication to protect your
                  credentials
                </p>
              </div>
              <button
                onClick={onShowAuth}
                className="mx-auto bg-indigo-500 text-white font-medium py-3 px-8 rounded-xl hover:bg-indigo-600 transition-colors flex items-center gap-2"
              >
                <LogIn size={18} />
                <span>Sign In</span>
              </button>
            </div>
          ))}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-4 px-8 flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-gray-500">
            EDITH v3.1.2
          </span>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
