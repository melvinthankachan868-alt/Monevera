import React,{ useState } from 'react';
import { CategoryType } from '../types';
import { formatINR } from '../utils/calculations';

interface DonutChartProps {
  totalSpent: number;
  segments: {
    category: CategoryType;
    spent: number;
    percentOfTotal: number;
    color: string;
  }[];
  size?: number;
  strokeWidth?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  totalSpent,
  segments,
  size = 230,
  strokeWidth = 32,
}) => {
  const [activeSegment, setActiveSegment] = useState<CategoryType | null>(null);

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Map segment colors to Money Vault tokens if using old ones
  const colorMap: Record<string, string> = {
    Needs: '#64D8FF',
    Wants: '#FFB84D',
    Savings: '#78D64B',
  };

  const validSegments = segments
    .filter((s) => s.spent > 0)
    .map((s) => ({
      ...s,
      color: colorMap[s.category] || s.color,
    }));
  const total = validSegments.reduce((sum, s) => sum + s.spent, 0);

  if (total === 0) {
    return (
      <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1C211D"
            strokeWidth={strokeWidth}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          <span className="text-3xl font-black text-[var(--mv-text-primary)] tracking-tight tabular-nums">
            ₹ 0
          </span>
          <span className="text-[11px] font-bold text-[var(--mv-text-secondary)] tracking-widest mt-0.5">
            SPENT
          </span>
        </div>
      </div>
    );
  }

  let accumulatedAngle = 0;
  const segmentArcs = validSegments.map((seg) => {
    const fraction = total > 0 ? seg.spent / total : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle;
    accumulatedAngle += fraction * circumference;
    return {
      ...seg,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const displaySpent = activeSegment
    ? segments.find((s) => s.category === activeSegment)?.spent || 0
    : totalSpent;

  const displayLabel = activeSegment ? activeSegment.toUpperCase() : 'SPENT';

  return (
    <div
      className="relative flex items-center justify-center mx-auto group"
      style={{ width: size, height: size }}
      onMouseLeave={() => setActiveSegment(null)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg] transition-transform duration-300"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1C211D"
          strokeWidth={strokeWidth}
        />
        {segmentArcs.map((seg) => {
          const isActive = activeSegment === seg.category;
          return (
            <circle
              key={seg.category}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="round"
              className="cursor-pointer transition-all duration-300 ease-out hover:opacity-90"
              onMouseEnter={() => setActiveSegment(seg.category)}
              onClick={() => setActiveSegment(seg.category === activeSegment ? null : seg.category)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
        <span className="text-3xl font-black text-[var(--mv-text-primary)] tracking-tight tabular-nums transition-all duration-200">
          {formatINR(displaySpent)}
        </span>
        <span className="text-[11px] font-bold text-[var(--mv-text-secondary)] tracking-widest mt-1">
          {displayLabel}
        </span>
      </div>
    </div>
  );
};
