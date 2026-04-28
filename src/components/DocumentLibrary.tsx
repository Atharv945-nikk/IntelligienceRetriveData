"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Upload, Filter, Grid, List, Sparkles,
  RefreshCw, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import DocumentCard from "./DocumentCard";

export interface Document {
  id: string;
  name: string;
  size_bytes: number;
  num_pages: number;
  created_at: string;
  chunk_count: number;
  /** UI-only: assigned when a fresh upload is in progress */
  status?: "Ready" | "Processing" | "Pending" | "Uploading";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const DocumentLibrary = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  type SortOption = "newest" | "oldest" | "name" | "size";
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Fetch documents ──────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to load documents.");
      const { documents: docs } = await res.json();
      const safeDocs = Array.isArray(docs) ? docs : [];
      setDocuments(
        safeDocs.map((d) => ({ 
          ...d, 
          name: d.name || d.metadata?.filename || "Untitled",
          status: "Ready" as const 
        }))
      );
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // ── Upload ───────────────────────────────────────────────────────────────
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected
    e.target.value = "";

    setUploadError(null);
    setUploadSuccess(null);

    // Optimistic UI – add a placeholder card
    const tempId = `temp-${Date.now()}`;
    const tempDoc: Document = {
      id: tempId,
      name: file.name,
      size_bytes: file.size,
      num_pages: 0,
      chunk_count: 0,
      created_at: new Date().toISOString(),
      status: "Uploading",
    };
    setDocuments((prev) => [tempDoc, ...prev]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Upload failed.");

      // Replace placeholder with real document from the server
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === tempId
            ? {
                ...data.document,
                status: "Ready" as const,
                size_bytes: data.document.size_bytes,
              }
            : d
        )
      );
      setUploadSuccess(`"${file.name}" uploaded and indexed successfully.`);
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err) {
      // Remove placeholder on failure
      setDocuments((prev) => prev.filter((d) => d.id !== tempId));
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    // Optimistic removal
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
    } catch {
      // Re-fetch to restore state on failure
      fetchDocuments();
    }
  };

  // ── Sorting and Filtering ───────────────────────────────────────────────
  const filteredDocs = (documents || [])
    .filter((d) => {
      const name = d?.name || d?.metadata?.filename || "Untitled Document";
      return name.toLowerCase().includes((search || "").toLowerCase());
    })
    .sort((a, b) => {
      const nameA = a?.name || a?.metadata?.filename || "";
      const nameB = b?.name || b?.metadata?.filename || "";
      const dateA = new Date(a?.created_at || 0).getTime();
      const dateB = new Date(b?.created_at || 0).getTime();
      const sizeA = a?.size_bytes || 0;
      const sizeB = b?.size_bytes || 0;

      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "name") return nameA.localeCompare(nameB);
      if (sortBy === "size") return sizeB - sizeA;
      return 0;
    });

  const stats = [
    { label: "Total Files", value: (documents || []).length.toString(), icon: Grid },
    {
      label: "Storage Used",
      value: formatBytes((documents || []).reduce((a, d) => a + (d?.size_bytes ?? 0), 0)),
      icon: Sparkles,
    },
    {
      label: "Total Chunks",
      value: (documents || []).reduce((a, d) => a + (d?.chunk_count ?? 0), 0).toString(),
      icon: Sparkles,
    },
    {
      label: "Indexed",
      value: `${(documents || []).filter((d) => d?.status === "Ready").length}/${(documents || []).length}`,
      icon: CheckCircle2,
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };

  return (
    <div className="p-6 lg:p-14 min-h-full">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.docx"
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10 lg:mb-12">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
            Document Library
          </h1>
          <p className="text-sm lg:text-base text-on-surface-variant/60 font-medium">
            Upload PDFs to your RAG knowledge base and query them instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleUploadClick}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-on-primary font-bold shadow-[0_0_30px_rgba(173,198,255,0.3)] hover:scale-105 active:scale-95 transition-all text-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload PDF</span>
          </button>

          <button
            onClick={fetchDocuments}
            disabled={isLoading}
            className="p-3 rounded-2xl glass-panel hover:bg-white/10 text-on-surface-variant hover:text-white transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <div className="hidden sm:block w-px h-8 bg-white/10" />
          <div className="flex p-1 rounded-xl bg-white/5 border border-white/10">
            <button className="p-2 rounded-lg bg-white/10 text-white shadow-lg">
              <Grid className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg text-on-surface-variant hover:text-white transition-colors">
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Notification banners ─────────────────────────────────────────── */}
      <AnimatePresence>
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{uploadSuccess}</span>
          </motion.div>
        )}
        {(uploadError || fetchError) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{uploadError ?? fetchError}</span>
            <button
              onClick={() => { setUploadError(null); setFetchError(null); }}
              className="ml-auto text-red-400/60 hover:text-red-400 font-bold text-xs"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="glass-panel p-3 lg:p-4 rounded-2xl flex items-center gap-3 lg:gap-4">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary/60">
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[8px] lg:text-[10px] font-bold text-on-surface-variant/40 tracking-widest uppercase">
                {stat.label}
              </p>
              <p className="text-xs lg:text-sm font-bold text-white tracking-wide">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & filter bar ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
        <div className="w-full relative group">
          <div className="absolute inset-y-0 left-5 flex items-center text-on-surface-variant/40 group-focus-within:text-primary transition-colors pointer-events-none">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-panel rounded-2xl py-3.5 lg:py-4 pl-14 pr-6 outline-none focus:border-primary/50 text-sm lg:text-base text-on-surface transition-all shadow-xl"
          />
        </div>
        
        <div className="relative w-full sm:w-auto">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl glass-panel text-on-surface-variant hover:text-white transition-all font-bold text-sm ${isFilterOpen ? "border-primary/50 bg-white/5" : "border-white/10"}`}
          >
            <Filter className="w-5 h-5" />
            <span>Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 rounded-2xl glass-panel bg-[#0b1326]/90 backdrop-blur-xl border border-white/10 shadow-2xl z-20 overflow-hidden"
                >
                  {(["newest", "oldest", "name", "size"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full px-5 py-3 text-left text-sm transition-colors hover:bg-white/5 ${sortBy === option ? "text-primary font-bold" : "text-on-surface-variant"}`}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {isLoading && documents.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-3xl p-5 h-44 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-white/5 mb-4" />
              <div className="h-4 bg-white/5 rounded-full mb-2 w-3/4" />
              <div className="h-3 bg-white/5 rounded-full w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* ── Document grid ────────────────────────────────────────────────── */}
      {!isLoading && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8"
        >
          {filteredDocs.map((doc) => (
            <motion.div
              key={doc.id}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            >
              <DocumentCard
                doc={{
                  id: doc.id,
                  name: doc.name,
                  size: formatBytes(doc.size_bytes),
                  lastModified: timeAgo(doc.created_at),
                  status: doc.status ?? "Ready",
                  chunk_count: doc.chunk_count,
                }}
                onDelete={() => handleDelete(doc.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!isLoading && filteredDocs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 lg:py-24 text-center">
          <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center mb-6">
            {search
              ? <Search className="w-6 h-6 lg:w-8 lg:h-8 text-on-surface-variant/20" />
              : <Upload className="w-6 h-6 lg:w-8 lg:h-8 text-on-surface-variant/20" />
            }
          </div>
          <h3 className="text-lg lg:text-xl font-bold text-white mb-2">
            {search ? "No documents found" : "No documents yet"}
          </h3>
          <p className="text-sm lg:text-base text-on-surface-variant/60 max-w-xs mb-6">
            {search
              ? "Adjust your search query."
              : "Upload a PDF to start building your knowledge base."}
          </p>
          {!search && (
            <button
              onClick={handleUploadClick}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all font-bold text-sm"
            >
              <Upload className="w-4 h-4" />
              Upload your first document
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;
