import React from "react";
import { LogIn } from "lucide-react";

const WelcomePrompt = ({ isOpen, onClose, onSignIn }) => {
  if (!isOpen) return null;

  const handleDismiss = () => {
    // Remember that user has seen the welcome
    localStorage.setItem("hasSeenWelcome", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg">
        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-br from-indigo-500 to-purple-600 px-8 py-10 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome to EDITH
            </h2>
            <p className="text-indigo-100">Your intelligent AI assistant</p>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Unlock Premium Features
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Cloud Document Storage
                    </p>
                    <p className="text-sm text-gray-500">
                      Upload and search your documents with vector AI
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      LinkedIn & Email Integration
                    </p>
                    <p className="text-sm text-gray-500">
                      Connect your professional accounts
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Chat History Sync
                    </p>
                    <p className="text-sm text-gray-500">
                      Never lose your conversations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-4 space-y-3">
              <button
                onClick={onSignIn}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 flex items-center justify-center gap-2"
              >
                <LogIn size={18} />
                Sign In to Get Started
              </button>

              <button
                onClick={handleDismiss}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Maybe Later
              </button>
            </div>

            <p className="text-xs text-center text-gray-500">
              You can continue with basic chat without signing in
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePrompt;
