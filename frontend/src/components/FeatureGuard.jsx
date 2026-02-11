import React from "react";
import { Lock } from "lucide-react";

/**
 * FeatureGuard - Wrapper component that requires authentication for protected features
 *
 * @param {boolean} requiresAuth - Whether this feature requires authentication
 * @param {string} featureName - Name of the feature (for messaging)
 * @param {function} onRequestAuth - Callback to trigger auth modal
 * @param {ReactNode} children - Content to show when authenticated
 */
const FeatureGuard = ({
  isAuthenticated,
  requiresAuth = true,
  featureName = "this feature",
  message,
  onRequestAuth,
  children,
}) => {
  // If feature doesn't require auth, or user is authenticated, show content
  if (!requiresAuth || isAuthenticated) {
    return children;
  }

  // Otherwise show auth prompt
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center">
        <Lock size={32} className="text-indigo-600" />
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="text-xl font-semibold text-gray-900">
          Sign in Required
        </h3>
        <p className="text-sm text-gray-500">
          {message || `Sign in to access ${featureName}`}
        </p>
      </div>

      <button
        onClick={onRequestAuth}
        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
      >
        Sign In Now
      </button>

      <p className="text-xs text-gray-400">
        Basic chat is available without signing in
      </p>
    </div>
  );
};

export default FeatureGuard;
