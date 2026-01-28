export default function LocationCell({ location }) {
  if (!location) {
    return <td className="px-2 py-1 border-r border-zinc-800/50 text-zinc-700">—</td>;
  }

  const isOnSite = location.isOnSite;

  return (
    <td className="px-2 py-1 border-r border-zinc-800/50">
      <span className={`text-xs font-medium ${isOnSite ? 'text-cyan-400' : 'text-zinc-400'}`}>
        {isOnSite && (
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-1.5 animate-pulse" />
        )}
        {location.formatted}
      </span>
    </td>
  );
}
