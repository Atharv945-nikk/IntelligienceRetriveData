"use client";

import DocumentLibrary from "@/components/DocumentLibrary";
import { motion } from "framer-motion";

export default function LibraryPage() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="h-full w-full bg-surface-muted/30 overflow-y-auto"
    >
      <DocumentLibrary />
    </motion.div>
  );
}
