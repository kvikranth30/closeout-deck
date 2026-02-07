function classifyStep(step) {
  const s = (step || '').toLowerCase();
  if (s.includes('recommend') || s.includes('conclusion') || s.includes('pay ')) {
    return { label: 'Decision', style: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50' };
  }
  if (s.includes('flag') || s.includes('conflict') || s.includes('disagree') || s.includes('unresolved')) {
    return { label: 'Conflict', style: 'bg-amber-900/30 text-amber-300 border-amber-700/50' };
  }
  if (s.includes('policy') || s.includes('approved') || s.includes('break') || s.includes('overtime')) {
    return { label: 'Policy', style: 'bg-sky-900/30 text-sky-300 border-sky-700/50' };
  }
  return { label: 'Evidence', style: 'bg-zinc-800/70 text-zinc-300 border-zinc-700' };
}

export default function ReasoningTimeline({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  return (
    <section className="rounded border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      <h2 className="text-sm uppercase tracking-wide text-zinc-400">Reasoning Steps</h2>
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const category = classifyStep(step);
          const isLast = idx === steps.length - 1;
          return (
            <div key={idx} className="relative pl-9">
              {!isLast && <div className="absolute left-[11px] top-6 h-[calc(100%+0.75rem)] w-px bg-zinc-800" />}
              <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[11px] text-zinc-300">
                {idx + 1}
              </div>
              <div className="space-y-1">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${category.style}`}>
                  {category.label}
                </span>
                <p className="text-sm text-zinc-200 leading-relaxed">{step}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
