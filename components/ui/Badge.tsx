import React from 'react';
import { CalibrationStatus, ProcessStatus } from '../../types';

interface BadgeProps {
  status: CalibrationStatus | ProcessStatus;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status }) => {
  let colorClass = 'bg-gray-100 text-gray-800';

  switch (status) {
    case CalibrationStatus.OPEN:
    case ProcessStatus.OPEN:
      colorClass = 'bg-green-100 text-green-800 border-green-200';
      break;
    case CalibrationStatus.CLOSED:
    case ProcessStatus.CLOSED:
      colorClass = 'bg-slate-100 text-slate-500 border-slate-200';
      break;
    case CalibrationStatus.PROGRAMMED:
      colorClass = 'bg-blue-100 text-blue-800 border-blue-200';
      break;
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${colorClass} whitespace-nowrap`}>
      {status}
    </span>
  );
};