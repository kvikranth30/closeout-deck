import { useMemo } from 'react';

const STATE_COLORS = {
  // Green - positive states
  offered: 'bg-green-900/50 text-green-400 border-green-700',
  accepted: 'bg-green-900/50 text-green-400 border-green-700',
  on_site: 'bg-green-800/60 text-green-300 border-green-600',
  working: 'bg-green-700/70 text-green-200 border-green-500',
  completed: 'bg-green-900/50 text-green-400 border-green-700',

  // Yellow - caution states
  en_route: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  running_late: 'bg-yellow-800/60 text-yellow-300 border-yellow-600',
  paused: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  pending: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',

  // Red - problem states
  canceled: 'bg-red-900/50 text-red-400 border-red-700',
  no_show: 'bg-red-800/60 text-red-300 border-red-600',
  missed: 'bg-red-900/50 text-red-400 border-red-700',
  rejected: 'bg-red-900/50 text-red-400 border-red-700',

  // Gray - neutral/unknown
  default: 'bg-zinc-800/50 text-zinc-400 border-zinc-700',
};

const STATE_LABELS = {
  offered: 'OFFERED',
  accepted: 'ACCEPTED',
  en_route: 'EN ROUTE',
  on_site: 'ON SITE',
  working: 'WORKING',
  paused: 'PAUSED',
  completed: 'COMPLETED',
  canceled: 'CANCELED',
  no_show: 'NO SHOW',
  missed: 'MISSED',
  rejected: 'REJECTED',
  running_late: 'LATE',
  pending: 'PENDING',
};

export default function StateCell({ state, isTransition, source = 'system' }) {
  const colorClass = useMemo(() => {
    if (!state) return '';
    const key = state.state?.toLowerCase() || 'default';
    return STATE_COLORS[key] || STATE_COLORS.default;
  }, [state]);

  const label = useMemo(() => {
    if (!state) return '';
    const key = state.state?.toLowerCase();
    return STATE_LABELS[key] || state.state?.toUpperCase() || '';
  }, [state]);

  if (!state) {
    return null;
  }

  if (isTransition) {
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${colorClass}`}>
        {label}
      </span>
    );
  }

  // Continuation row - blank
  return null;
}
