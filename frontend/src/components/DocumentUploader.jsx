import React, { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { documentService } from "../services/supabaseApi";

const DocumentUploader = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const { user } = useAuth();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setUploadProgress({
      filename: file.name,
      status: "uploading",
      message: "Uploading file...",
    });

    try {
      // Upload file
      const document = await documentService.uploadFile(file, user.id);

      setUploadProgress({
        filename: file.name,
        status: "processing",
        message: "Processing document...",
      });

      // Trigger backend processing
      await documentService.processDocument(document.id);

      setUploadProgress({
        filename: file.name,
        status: "success",
        message: "Document uploaded and indexed!",
      });

      // Reset after 2 seconds
      setTimeout(() => {
        setUploadProgress(null);
        setUploading(false);
        if (onUploadComplete) onUploadComplete();
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress({
        filename: file.name,
        status: "error",
        message: error.message || "Upload failed",
      });
      setTimeout(() => {
        setUploadProgress(null);
        setUploading(false);
      }, 3000);
    }
  };

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await handleFiles(e.dataTransfer.files);
      }
    },
    [user],
  );

  const handleChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files);
    }
  };

  const getStatusIcon = () => {
    switch (uploadProgress?.status) {
      case "uploading":
      case "processing":
        return <Loader2 size={20} className="animate-spin text-indigo-600" />;
      case "success":
        return <CheckCircle2 size={20} className="text-green-600" />;
      case "error":
        return <XCircle size={20} className="text-red-600" />;
      default:
        return <Clock size={20} className="text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (uploadProgress?.status) {
      case "uploading":
      case "processing":
        return "bg-indigo-50 border-indigo-200 text-indigo-700";
      case "success":
        return "bg-green-50 border-green-200 text-green-700";
      case "error":
        return "bg-red-50 border-red-200 text-red-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all ${
          dragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50"
        }`}
      >
        <input
          type="file"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".txt,.pdf,.doc,.docx,.md"
          disabled={uploading}
        />

        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Upload size={28} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Drop your document here or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports TXT, PDF, DOC, DOCX, MD (Max 10MB)
            </p>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {uploadProgress && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${getStatusColor()}`}
        >
          {getStatusIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium">{uploadProgress.filename}</p>
            <p className="text-xs opacity-75">{uploadProgress.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
