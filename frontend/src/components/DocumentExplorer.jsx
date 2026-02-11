import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FileText,
  Search,
  Database,
  RefreshCw,
  CheckCircle,
  X,
} from "lucide-react";

const DocumentExplorer = ({ onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // Assuming a mock or future endpoint to list files in agent_files/index
      const res = await axios.get("http://localhost:8000/api/v1/files/list");
      setDocuments(res.data.files || []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  };

  const handleIndexAll = async () => {
    setIndexing(true);
    try {
      await axios.post("http://localhost:8000/api/v1/chat/", {
        message: "Index all my documents in agent_files directory.",
      });
      fetchDocuments();
    } catch (err) {
      console.error("Indexing failed", err);
    } finally {
      setIndexing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="text-indigo-500" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Knowledge Base</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 border-b border-gray-100">
        <div className="flex gap-3">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-900 w-full text-sm"
            />
          </div>
          <button
            onClick={handleIndexAll}
            disabled={indexing}
            className="bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={indexing ? "animate-spin" : ""} />
            {indexing ? "Indexing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
            <span className="text-sm text-gray-500">Loading documents...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <FileText size={48} className="text-gray-300" />
            <p className="text-gray-900 font-medium">No documents found</p>
            <p className="text-sm text-gray-500">
              Add files to 'agent_files' and click Refresh.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredDocs.map((doc, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-indigo-500">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 block truncate">{doc.name}</span>
                  <span className="text-xs text-gray-500">{doc.type} • Indexed</span>
                </div>
                <CheckCircle size={16} className="text-green-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentExplorer;
