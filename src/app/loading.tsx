import React from 'react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Outer ring with gradient */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 shadow-lg animate-pulse"></div>
        
        {/* Spinning ring */}
        <div className="absolute inset-0">
          <div className="w-24 h-24 rounded-full border-4 border-pink-300 border-t-transparent animate-spin"></div>
        </div>
        
        {/* Inner ring with gradient */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-200 to-purple-200 shadow-inner animate-pulse"></div>
        </div>
        
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white shadow-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  );
} 