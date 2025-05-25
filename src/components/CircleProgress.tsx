import React from 'react';
import type { CircularProgressProps } from '../core/interface';



const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  color , // Default color is blue
}) => {
  // Calculate the stroke dashoffset
  const strokeDasharray = 175.9;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * progress) / 100;

  return (
    <div className="relative w-16 h-16 mb-3">
      {/* Circular progress background */}
      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="currentColor"
          strokeWidth="4"
          className={`text-${color}-200`}
          fill="none"
        />
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="currentColor"
          strokeWidth="4"
          className={`text-${color}-600`}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-semibold text-${color}-600`}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export default CircularProgress;