import React from 'react';

interface StatItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  highlight?: boolean;
}

export const StatItem: React.FC<StatItemProps> = ({ label, value, subValue, highlight }) => (
  <div className={`flex flex-col ${highlight ? 'text-blue-600' : 'text-slate-600'}`}>
    <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">{label}</span>
    <span className="text-lg font-bold leading-tight">{value}</span>
    {subValue && <span className="text-xs opacity-80">{subValue}</span>}
  </div>
);