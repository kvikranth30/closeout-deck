export default function LocationCell({ location }) {
  if (!location) {
    return <span className="text-zinc-700">—</span>;
  }

  const isOnSite = location.isOnSite;

  return (
    <span className={`text-xs font-medium whitespace-nowrap ${isOnSite ? 'text-cyan-400' : 'text-zinc-400'}`}>
      {isOnSite && (
        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-1.5 animate-pulse" />
      )}
      {location.formatted}
    </span>
  );
}
