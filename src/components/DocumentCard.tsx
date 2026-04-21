"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Trash2, CheckCircle2, Cloud, Loader2, Layers,
} from "lucide-react";

export interface DocumentCardData {
  id: string;
  name: string;
  size: string;
  lastModified: string;
  status: "Ready" | "Processing" | "Pending" | "Uploading";
  chunk_count?: number;
}

interface Props {
  doc: DocumentCardData;
  onDelete?: (id: string) => void;
}

const STATUS_CONFIG = {
  Ready: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  Processing: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    icon: <Cloud className="w-3 h-3 animate-pulse" />,
  },
  Pending: {
    bg: "bg-tertiary/10",
    border: "border-tertiary/20",
    text: "text-tertiary",
    icon: <Cloud className="w-3 h-3 animate-pulse" />,
  },
  Uploading: {
    bg: "bg-primary/10",
    border: "border-primary/20",
    text: "text-primary",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
};

const DocumentCard = ({ doc, onDelete }: Props) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.Pending;

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      // First click — ask for confirmation, auto-cancel after 3 s
      setConfirmDelete(true);
      confirmTimeout.current = setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      // Second click — confirmed
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
      setConfirmDelete(false);
      onDelete?.(doc.id);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      className="group relative glass-panel rounded-3xl p-5 flex flex-col gap-4 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl blur-xl pointer-events-none" />

      {/* Top row — icon + delete */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-500 shadow-inner">
          {doc.status === "Uploading"
            ? <Loader2 className="w-6 h-6 animate-spin" />
            : <FileText className="w-6 h-6" />
          }
        </div>

        <AnimatePresence mode="wait">
          {onDelete && (
            <motion.button
              key={confirmDelete ? "confirm" : "idle"}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleDeleteClick}
              title={confirmDelete ? "Click again to confirm" : "Delete document"}
              className={`
                p-2 rounded-xl transition-all text-xs font-bold
                ${confirmDelete
                  ? "bg-red-500/20 border border-red-500/30 text-red-400"
                  : "text-on-surface-variant/30 hover:text-red-400 hover:bg-red-500/10"}
              `}
            >
              {confirmDelete
                ? <span className="px-1">Confirm?</span>
                : <Trash2 className="w-4 h-4" />
              }
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* File name + meta */}
      <div className="relative z-10">
        <h3 className="font-display font-bold text-white mb-1 truncate text-sm" title={doc.name}>
          {doc.name}
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-bold text-on-surface-variant/50 tracking-wider uppercase">
          <span>{doc.size}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>{doc.lastModified}</span>
        </div>
      </div>

      {/* Status badge + chunk count */}
      <div className="relative z-10 mt-auto flex items-center justify-between">
        <div className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border
          ${status.bg} ${status.border} ${status.text}
        `}>
          {status.icon}
          <span>{doc.status}</span>
        </div>

        {typeof doc.chunk_count === "number" && doc.chunk_count > 0 && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-on-surface-variant/30 tracking-widest uppercase">
            <Layers className="w-3 h-3" />
            <span>{doc.chunk_count} chunks</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DocumentCard;
