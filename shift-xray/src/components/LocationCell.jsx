export default function LocationCell({ location }) {
  if (!location) {
    return null;
  }

  // New format with activity and status
  const { activity, status, distance_miles } = location;

  // Determine style based on status/activity
  const getStatusDisplay = () => {
    const s = status?.toLowerCase() || '';
    const a = activity?.toLowerCase() || '';

    // On-site statuses
    if (s === 'on_site' || s === 'on-site') {
      return { style: 'bg-green-900/50 text-green-400 border-green-700', label: 'ON SITE' };
    }
    if (s === 'break_area' || s === 'lunch_break') {
      return { style: 'bg-yellow-900/50 text-yellow-400 border-yellow-700', label: 'BREAK' };
    }

    // Movement statuses
    if (a === 'driving') {
      if (s === 'en_route' || s === 'en_route_late') {
        return {
          style: 'bg-cyan-900/50 text-cyan-400 border-cyan-700',
          label: 'DRIVING',
          suffix: distance_miles ? `${distance_miles}mi` : null
        };
      }
      if (s === 'arriving' || s === 'arriving_correct') {
        return { style: 'bg-cyan-800/60 text-cyan-300 border-cyan-600', label: 'ARRIVING' };
      }
      if (s === 'departed') {
        return { style: 'bg-zinc-800/50 text-zinc-400 border-zinc-700', label: 'DEPARTED' };
      }
      if (s === 'returning' || s === 'relocating') {
        return { style: 'bg-cyan-900/50 text-cyan-400 border-cyan-700', label: 'RETURNING' };
      }
      if (s === 'off_site') {
        return { style: 'bg-orange-900/50 text-orange-400 border-orange-700', label: 'OFF SITE' };
      }
      return { style: 'bg-cyan-900/50 text-cyan-400 border-cyan-700', label: 'DRIVING' };
    }

    if (a === 'walking') {
      if (s === 'on_site') {
        return { style: 'bg-green-900/50 text-green-400 border-green-700', label: 'ON SITE' };
      }
      return { style: 'bg-green-800/60 text-green-300 border-green-600', label: 'WALKING' };
    }

    if (a === 'stationary') {
      if (s === 'at_home') {
        return { style: 'bg-zinc-800/50 text-zinc-400 border-zinc-700', label: 'AT HOME' };
      }
      if (s === 'stuck_traffic') {
        return { style: 'bg-red-900/50 text-red-400 border-red-700', label: 'STUCK IN TRAFFIC' };
      }
      if (s === 'on_site' || s === 'incident') {
        return { style: 'bg-green-900/50 text-green-400 border-green-700', label: 'ON SITE' };
      }
      return { style: 'bg-zinc-800/50 text-zinc-400 border-zinc-700', label: 'STATIONARY' };
    }

    if (a === 'location_dropped') {
      return { style: 'bg-red-900/50 text-red-400 border-red-700', label: 'LOCATION LOST' };
    }

    // Problem statuses
    if (s === 'wrong_location') {
      return { style: 'bg-orange-900/50 text-orange-400 border-orange-700', label: 'WRONG LOCATION' };
    }
    if (s === 'off_site_break') {
      return { style: 'bg-yellow-900/50 text-yellow-400 border-yellow-700', label: 'OFF-SITE BREAK' };
    }
    if (s === 'unknown' || s === 'unknown_location') {
      return { style: 'bg-zinc-800/50 text-zinc-500 border-zinc-700', label: 'UNKNOWN' };
    }

    // Default
    return { style: 'bg-zinc-800/50 text-zinc-400 border-zinc-700', label: (status || activity || '').toUpperCase() };
  };

  const display = getStatusDisplay();

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${display.style}`}>
      {display.label}
      {display.suffix && <span className="ml-1 opacity-50">{display.suffix}</span>}
    </span>
  );
}
