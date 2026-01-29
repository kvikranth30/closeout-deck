import { formatDateTime } from '../utils/timeUtils';

export default function ShiftsTable({ engagements, onSelectShift, header }) {

  // Determine if payout is finalized (accepted/approved/paid scenarios)
  const isPaid = (scenario) => {
    if (!scenario) return false;
    return scenario.includes('accepted') || scenario.includes('approved') || scenario.includes('perfect') || scenario.includes('verified') || scenario.includes('resolved');
  };

  return (
    <div className="h-full flex flex-col">
      {header}
      <div className="flex-1 flex flex-col overflow-hidden mx-6 mb-4 rounded-lg border border-zinc-800">
        {/* Sticky column headers */}
        <div className="shrink-0 bg-zinc-900 rounded-t-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Shift ID</th>
                <th className="px-4 py-3 font-medium">Facility</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium">Claimed</th>
                <th className="px-4 py-3 font-medium">Adjustment</th>
                <th className="px-4 py-3 font-medium">Final</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
          </table>
        </div>
        {/* Scrollable rows */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
          <tbody>
            {engagements.map((eng, index) => {
              const payout = eng.payout;
              const adjustment = payout.recommended_total - payout.claimed_total;
              const hasAdjustment = Math.abs(adjustment) >= 0.01;
              const paid = isPaid(eng.scenario_type);

              return (
                <tr
                  key={eng.engagement_id}
                  onClick={() => onSelectShift(index)}
                  className="border-t border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {formatDateTime(eng.gig.scheduled_start).split(',')[0]}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                    {eng.engagement_id}
                  </td>
                  <td className="px-4 py-3 text-zinc-200">
                    {eng.gig.business_name}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {eng.gig.position}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">
                    ${payout.claimed_total.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 font-mono ${
                    hasAdjustment
                      ? adjustment > 0 ? 'text-green-400' : 'text-red-400'
                      : 'text-zinc-600'
                  }`}>
                    {hasAdjustment
                      ? `${adjustment > 0 ? '+' : ''}$${adjustment.toFixed(2)}`
                      : '—'
                    }
                  </td>
                  <td className={`px-4 py-3 font-mono ${paid ? 'text-zinc-500' : 'text-yellow-400'}`}>
                    ${payout.recommended_total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${getScenarioColor(eng.scenario_type)}`}>
                      {formatScenario(eng.scenario_type)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getScenarioColor(scenario) {
  if (scenario?.includes('happy')) return 'bg-green-900/50 text-green-400';
  if (scenario?.includes('dispute')) return 'bg-red-900/50 text-red-400';
  if (scenario?.includes('conflict')) return 'bg-yellow-900/50 text-yellow-400';
  if (scenario?.includes('missing') || scenario?.includes('no_clock')) return 'bg-orange-900/50 text-orange-400';
  if (scenario?.includes('late')) return 'bg-amber-900/50 text-amber-400';
  return 'bg-zinc-800 text-zinc-400';
}

function formatScenario(scenario) {
  if (!scenario) return 'UNKNOWN';
  return scenario.replace(/_/g, ' ').toUpperCase();
}
