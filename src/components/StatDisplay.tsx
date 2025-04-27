'use client';

import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface StatDisplayProps {
  label: string;
  value?: number;
  icon: string;
  values?: (number | null | undefined)[];
  suffix?: string;
  className?: string;
}

export function StatDisplay({ label, value = 0, icon, values, suffix = '', className }: StatDisplayProps) {
  const formatValue = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0';
    return val.toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/50 backdrop-blur-sm shadow-lg",
        "p-3 transition-all duration-300",
        className
      )}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-gradient-to-br from-white via-transparent to-white/50" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-gray-600">{label}</span>
        </div>
        
        {values ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600">P</span>
            <span className="text-lg font-bold text-gray-700">{formatValue(values[0])}{suffix}</span>
            <span className="text-xs text-purple-600">M</span>
            <span className="text-lg font-bold text-gray-700">{formatValue(values[1])}{suffix}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-gray-700">{formatValue(value)}{suffix}</span>
          </div>
        )}
      </div>

      {/* Shine effect */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
        className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100"
      >
        <div className="w-32 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12" />
      </motion.div>
    </motion.div>
  );
} 