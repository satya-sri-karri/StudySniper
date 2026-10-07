import React from 'react';

export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-16 bg-slate-800/60 border border-slate-800 rounded-2xl w-full" />
      ))}
    </div>
  );
};
