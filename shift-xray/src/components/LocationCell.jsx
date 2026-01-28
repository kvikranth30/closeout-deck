const ICONS = {
  onSite: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  driving: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14v-5H5z"/><path d="M19 17v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2"/><path d="M8 17v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2"/><path d="M5 12l2-5h10l2 5"/>
    </svg>
  ),
  arriving: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>
    </svg>
  ),
  departed: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>
    </svg>
  ),
  walking: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2"/><path d="M10 22V14l-2-2 1-5 4 1 3 3"/><path d="M14 17l2 5"/>
    </svg>
  ),
  home: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  warning: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  lost: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  ),
  break: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
    </svg>
  ),
};

export default function LocationCell({ location }) {
  if (!location) {
    return null;
  }

  const { activity, status, distance_miles } = location;

  const getStatusDisplay = () => {
    const s = status?.toLowerCase() || '';
    const a = activity?.toLowerCase() || '';

    if (s === 'on_site' || s === 'on-site') {
      return { style: 'bg-green-900/50 text-green-400 border-green-700', label: 'ON SITE', icon: ICONS.onSite };
    }
    if (s === 'break_area' || s === 'lunch_break') {
      return { style: 'bg-yellow-900/50 text-yellow-400 border-yellow-700', label: 'BREAK', icon: ICONS.break };
    }

    if (a === 'driving') {
      if (s === 'en_route' || s === 'en_route_late') {
        return { style: 'bg-cyan-900/50 text-cyan-400 border-cyan-700', label: 'DRIVING', icon: ICONS.driving, suffix: distance_miles ? `${distance_miles}mi` : null };
      }
      if (s === 'arriving' || s === 'arriving_correct') {
        return { style: 'bg-cyan-800/60 text-cyan-300 border-cyan-600', label: 'ARRIVING', icon: ICONS.arriving };
      }
      if (s === 'departed') {
        return { style: 'bg-zinc-800/50 text-zinc-400 border-zinc-700', label: 'DEPARTED', icon: ICONS.departed };
      }
      if (s === 'returning' || s === 'relocating') {
        return { style: 'bg-cyan-900/50 text-cyan-400 border-cyan-700', label: 'RETURNING', icon: ICONS.arriving };
      }
      if (s === 'off_site') {
        return { style: 'bg-orange-900/50 text-orange-400 border-orange-700', label: 'OFF SITE', icon: ICONS.warning };
      }
      return { style: 'bg-cyan-900/50 text-cyan-400 border-cyan-700', label: 'DRIVING', icon: ICONS.driving };
    }

    if (a === 'walking') {
      if (s === 'on_site') {
        return { style: 'bg-green-900/50 text-green-400 border-green-700', label: 'ON SITE', icon: ICONS.onSite };
      }
      return { style: 'bg-green-800/60 text-green-300 border-green-600', label: 'WALKING', icon: ICONS.walking };
    }

    if (a === 'stationary') {
      if (s === 'at_home') {
        return { style: 'bg-zinc-800/50 text-zinc-400 border-zinc-700', label: 'AT HOME', icon: ICONS.home };
      }
      if (s === 'stuck_traffic') {
        return { style: 'bg-red-900/50 text-red-400 border-red-700', label: 'STUCK IN TRAFFIC', icon: ICONS.warning };
      }
      if (s === 'on_site' || s === 'incident') {
        return { style: 'bg-green-900/50 text-green-400 border-green-700', label: 'ON SITE', icon: ICONS.onSite };
      }
      return { style: 'bg-zinc-800/50 text-zinc-400 border-zinc-700', label: 'STATIONARY', icon: null };
    }

    if (a === 'location_dropped') {
      return { style: 'bg-red-900/50 text-red-400 border-red-700', label: 'LOCATION LOST', icon: ICONS.lost };
    }

    if (s === 'wrong_location') {
      return { style: 'bg-orange-900/50 text-orange-400 border-orange-700', label: 'WRONG LOCATION', icon: ICONS.warning };
    }
    if (s === 'off_site_break') {
      return { style: 'bg-yellow-900/50 text-yellow-400 border-yellow-700', label: 'OFF-SITE BREAK', icon: ICONS.break };
    }
    if (s === 'unknown' || s === 'unknown_location') {
      return { style: 'bg-zinc-800/50 text-zinc-500 border-zinc-700', label: 'UNKNOWN', icon: null };
    }

    return { style: 'bg-zinc-800/50 text-zinc-400 border-zinc-700', label: (status || activity || '').toUpperCase(), icon: null };
  };

  const display = getStatusDisplay();

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${display.style}`}>
      {display.icon}
      {display.label}
      {display.suffix && <span className="opacity-50">{display.suffix}</span>}
    </span>
  );
}
