"use client";

import ChatInterface from "@/components/ChatInterface";
import { motion } from "framer-motion";

export default function Dashboard() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="h-full w-full bg-surface-muted/30"
    >
      <ChatInterface />
    </motion.div>
  );
}
