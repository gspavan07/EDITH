import React, { useState, useEffect } from "react";
import {
  FileText,
  Trash2,
  Eye,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { documentService, realtimeService } from "../services/supabaseApi";
import DocumentUploader from "./DocumentUploader";

const DocumentLibrary = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchDocuments();

      // Subscribe to real-time updates
      const unsubscribe = realtimeService.subscribeToDocuments(
        user.id,
        (payload) => {
          console.log("Document changed:", payload);
          fetchDocuments(); // Refresh list
        },
      );

      return () => unsubscribe();
    }
  }, [isAuthenticated, user]);

  const fetchDocuments = async () => {
    try {
      const docs = await documentService.getDocuments(user.id);
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.filename}"?`)) return;

    try {
      await documentService.deleteDocument(doc.id, doc.storage_path);
      setDocuments((docs) => docs.filter((d) => d.id !== doc.id));
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock size={16} className="text-gray-400" />;
      case "processing":
        return <Loader2 size={16} className="text-indigo-600 animate-spin" />;
      case "indexed":
        return <CheckCircle2 size={16} className="text-green-600" />;
      case "failed":
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-gray-100 text-gray-600",
      processing: "bg-indigo-100 text-indigo-600",
      indexed: "bg-green-100 text-green-600",
      failed: "bg-red-100 text-red-600",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}
      >
        {status || "pending"}
      </span>
    );
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center">
          <FileText size={32} className="text-gray-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Sign in to access your documents
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload and search your documents with cloud storage
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Library</h2>
          <p className="text-sm text-gray-500">
            Upload and manage your documents for vector search
          </p>
        </div>

        {/* Upload Section */}
        <DocumentUploader onUploadComplete={fetchDocuments} />

        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <FileText size={32} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              {searchTerm
                ? "No documents match your search"
                : "No documents yet. Upload one to get started!"}
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={24} className="text-indigo-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {doc.filename}
                    </h4>
                    {getStatusBadge(doc.status)}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </span>
                    {doc.status && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(doc.status)}
                          <span>
                            {doc.status === "indexed"
                              ? "Searchable"
                              : "Processing"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentLibrary;
