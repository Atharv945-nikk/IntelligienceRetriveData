"use client";

import React, { useState } from "react";
import { Inter, Manrope } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full antialiased dark`}
    >
      <body className="h-full bg-background text-on-surface font-sans selection:bg-primary/30 selection:text-primary overflow-hidden">
        {/* Mobile Header Trigger */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] p-4 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-white/5">
             <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h1 className="font-display text-lg font-bold text-white">Cortex Obsidian</h1>
            </div>
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white"
            >
                <Menu className="w-6 h-6" />
            </button>
        </div>

        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        <main className={`flex-1 h-full min-w-0 transition-all duration-500 pt-16 lg:pt-0 ${isSidebarOpen ? 'blur-sm lg:blur-none' : ''} lg:pl-72 lg:pr-6 lg:py-6`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-full"
            >
              <div className="h-full bg-surface lg:rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative border-t lg:border border-white/10 ring-1 ring-white/5">
                <div className="h-full w-full overflow-y-auto">
                  {children}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </body>
    </html>
  );
}
