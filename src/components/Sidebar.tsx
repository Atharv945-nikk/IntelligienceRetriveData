"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Library, Sparkles, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Document Library", href: "/library", icon: Library },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-[60]"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed left-0 top-0 h-screen z-[70] flex flex-col transition-all duration-500 ease-[0.23, 1, 0.32, 1]
        ${isOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full lg:translate-x-0"}
        p-4 lg:p-6
      `}>
        {/* Premium Frosted Glass Sidebar Container */}
        <div className="absolute inset-2 lg:inset-4 rounded-[2rem] lg:rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full py-4">
          {/* Branding - Manrope */}
          <div className="mb-10 px-4 lg:px-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <h1 className="font-display text-xl lg:text-2xl font-bold tracking-tight text-white">
                  Cortex <span className="text-primary">Obsidian</span>
                </h1>
              </div>
              <p className="text-[9px] text-primary/40 font-bold tracking-[0.2em] uppercase pl-1">
                Intelligence Terminal
              </p>
            </div>
            
            <button 
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-on-surface-variant/40 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 lg:px-3 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.name} 
                  href={item.href} 
                  onClick={() => onClose()}
                  className="block relative group"
                >
                  {/* Active Glow State */}
                  {isActive && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute -inset-1 bg-primary/20 rounded-2xl blur-xl opacity-50"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  
                  <div
                    className={`
                      relative flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4 rounded-2xl font-medium transition-all duration-300 border
                      ${isActive 
                        ? "bg-primary text-on-primary border-primary shadow-[0_0_20px_rgba(173,198,255,0.3)]" 
                        : "text-on-surface-variant/70 border-transparent hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 lg:w-5 h-4 lg:h-5 ${isActive ? "text-on-primary" : "text-on-surface-variant group-hover:text-primary transition-colors"}`} />
                      <span className="text-xs lg:text-sm tracking-wide">{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Status Footer */}
          <div className="mt-auto px-4">
            <div className="p-3 lg:p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
              <div className="w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" />
              <span className="text-[9px] font-bold text-on-surface-variant/50 tracking-widest uppercase">Kernel Active</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
