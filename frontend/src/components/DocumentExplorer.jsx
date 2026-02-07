import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FileText,
  Search,
  Database,
  RefreshCw,
  Trash2,
  CheckCircle,
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
    <div className="document-explorer-panel">
      <div className="explorer-header shadow-glow">
        <div className="flex items-center gap-3">
          <Database className="text-accent" size={20} />
          <h2>Knowledge Base Explorer</h2>
        </div>
        <button onClick={onClose} className="close-btn">
          ×
        </button>
      </div>

      <div className="explorer-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search indexed corpus..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={handleIndexAll}
          disabled={indexing}
          className={`index-btn ${indexing ? "loading" : ""}`}
        >
          <RefreshCw size={16} className={indexing ? "animate-spin" : ""} />
          {indexing ? "Re-indexing..." : "Refresh Index"}
        </button>
      </div>

      <div className="explorer-content">
        {loading ? (
          <div className="explorer-loading">
            <div className="spinner"></div>
            <span>Scanning Vector Store...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="explorer-empty">
            <FileText size={48} className="opacity-20 mb-4" />
            <p>No documents indexed yet.</p>
            <p className="text-dim text-sm">
              Add files to 'agent_files' and click Refresh Index.
            </p>
          </div>
        ) : (
          <div className="doc-grid">
            {filteredDocs.map((doc, idx) => (
              <div key={idx} className="doc-card">
                <div className="doc-icon">
                  <FileText size={24} />
                </div>
                <div className="doc-info">
                  <span className="doc-name">{doc.name}</span>
                  <span className="doc-meta">{doc.type} • Indexed</span>
                </div>
                <div className="doc-status">
                  <CheckCircle size={14} className="text-success" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .document-explorer-panel {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 700px;
          height: 600px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(30px);
          border: 1px solid var(--border);
          border-radius: 24px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          color: white;
        }

        .explorer-header {
          padding: 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .explorer-header h2 {
          font-size: 1.1rem;
          font-weight: 700;
        }

        .explorer-toolbar {
          padding: 16px 24px;
          background: rgba(2, 6, 23, 0.5);
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .search-box {
          flex: 1;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .search-box input {
          background: transparent;
          border: none;
          color: white;
          width: 100%;
          outline: none;
          font-size: 0.9rem;
        }

        .index-btn {
          background: var(--accent);
          color: #020617;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .index-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 15px var(--accent-glow);
        }

        .explorer-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        .doc-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .doc-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.2s;
        }

        .doc-card:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: var(--accent);
          transform: translateY(-2px);
        }

        .doc-icon {
          width: 44px;
          height: 44px;
          background: var(--bg-primary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
        }

        .doc-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .doc-name {
          font-size: 0.95rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .doc-meta {
          font-size: 0.75rem;
          color: var(--text-dim);
        }

        .explorer-empty,
        .explorer-loading {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default DocumentExplorer;
