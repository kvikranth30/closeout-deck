export default function LocationCell({ location }) {
  if (!location) {
    return <span className="text-zinc-700">—</span>;
  }

  // New format with activity and status
  const { activity, status, distance_miles } = location;

  // Determine color and icon based on status/activity
  const getStatusDisplay = () => {
    const s = status?.toLowerCase() || '';
    const a = activity?.toLowerCase() || '';

    // On-site statuses
    if (s === 'on_site' || s === 'on-site') {
      return { color: 'text-green-400', icon: '●', label: 'On Site' };
    }
    if (s === 'break_area' || s === 'lunch_break') {
      return { color: 'text-yellow-400', icon: '○', label: 'Break' };
    }

    // Movement statuses
    if (a === 'driving') {
      if (s === 'en_route' || s === 'en_route_late') {
        return { color: 'text-cyan-400', icon: '→', label: `Driving ${distance_miles ? `(${distance_miles} mi)` : ''}` };
      }
      if (s === 'arriving' || s === 'arriving_correct') {
        return { color: 'text-cyan-300', icon: '→', label: 'Arriving' };
      }
      if (s === 'departed') {
        return { color: 'text-zinc-500', icon: '←', label: 'Departed' };
      }
      if (s === 'returning' || s === 'relocating') {
        return { color: 'text-cyan-400', icon: '↺', label: 'Returning' };
      }
      if (s === 'off_site') {
        return { color: 'text-orange-400', icon: '!', label: 'Off Site' };
      }
      return { color: 'text-cyan-400', icon: '→', label: `Driving` };
    }

    if (a === 'walking') {
      if (s === 'on_site') {
        return { color: 'text-green-400', icon: '●', label: 'On Site' };
      }
      return { color: 'text-green-300', icon: '◐', label: 'Walking' };
    }

    if (a === 'stationary') {
      if (s === 'at_home') {
        return { color: 'text-zinc-500', icon: '⌂', label: 'At Home' };
      }
      if (s === 'stuck_traffic') {
        return { color: 'text-red-400', icon: '!', label: 'Stuck Traffic' };
      }
      if (s === 'incident') {
        return { color: 'text-red-400', icon: '⚠', label: 'Incident' };
      }
      if (s === 'on_site') {
        return { color: 'text-green-400', icon: '●', label: 'On Site' };
      }
      return { color: 'text-zinc-400', icon: '○', label: 'Stationary' };
    }

    if (a === 'location_dropped') {
      return { color: 'text-red-400', icon: '✕', label: 'Location Lost' };
    }

    // Problem statuses
    if (s === 'wrong_location') {
      return { color: 'text-orange-400', icon: '?', label: 'Wrong Location' };
    }
    if (s === 'off_site_break') {
      return { color: 'text-yellow-400', icon: '○', label: 'Off-site Break' };
    }
    if (s === 'unknown' || s === 'unknown_location') {
      return { color: 'text-zinc-600', icon: '?', label: 'Unknown' };
    }

    // Default
    return { color: 'text-zinc-400', icon: '○', label: status || activity || '—' };
  };

  const display = getStatusDisplay();

  return (
    <span className={`text-xs font-medium whitespace-nowrap ${display.color}`}>
      <span className="mr-1">{display.icon}</span>
      {display.label}
    </span>
  );
}
