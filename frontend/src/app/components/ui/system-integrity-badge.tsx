"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemIntegrityBadgeProps {
  className?: string;
}

export function SystemIntegrityBadge({ className }: SystemIntegrityBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-emerald-500/10 border border-emerald-500/20",
        "text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider",
        "relative overflow-hidden",
        className
      )}
    >
      {/* Pulse Effect */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 bg-emerald-500/5 rounded-full"
      />

      {/* Glow Effect */}
      <motion.div
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 shadow-[0_0_15px_rgba(16,185,129,0.3)] pointer-events-none"
      />

      <ShieldCheck className="w-3.5 h-3.5" />
      <span className="relative z-10">System Integrity Verified</span>
    </motion.div>
  );
}
