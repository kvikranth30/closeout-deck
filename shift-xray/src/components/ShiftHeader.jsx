import { formatDateTime, formatDuration, calculateWorkedTime } from '../utils/timeUtils';

export default function ShiftHeader({ engagement }) {
  const gig = engagement.gig;
  const times = calculateWorkedTime(engagement.timesheets);
  const payout = engagement.payout;

  const startTime = gig.scheduled_start;
  const endTime = gig.scheduled_end;

  const scheduledMinutes = (new Date(endTime) - new Date(startTime)) / (1000 * 60);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getAdjustmentInfo = () => {
    if (!payout) return null;
    const diff = payout.recommended_total - payout.claimed_total;
    if (Math.abs(diff) < 0.01) return { text: 'No Change', class: 'text-zinc-400' };
    if (diff > 0) return { text: `+${formatCurrency(diff)}`, class: 'text-green-400' };
    return { text: formatCurrency(diff), class: 'text-red-400' };
  };

  const adjustment = getAdjustmentInfo();

  return (
    <div className="border-b border-zinc-800 pb-4 mb-0">
      {/* Desktop: Two-column layout with payout on right */}
      <div className="flex flex-col md:flex-row md:gap-6">
        {/* Left column - Shift info */}
        <div className="flex-1 min-w-0">
          {/* Top row - ID and position */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 text-sm font-mono">{engagement.engagement_id}</span>
              <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300">
                {gig.position}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${getScenarioColor(engagement.scenario_type)}`}>
                {formatScenario(engagement.scenario_type)}
              </span>
            </div>
          </div>

          {/* Business and location */}
          <div className="text-lg font-medium mb-1">
            {gig.business_name}
          </div>
          <div className="text-zinc-500 text-sm mb-3">
            {gig.location.address}
          </div>

          {/* Time summary */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-zinc-500">Scheduled:</span>{' '}
              <span className="text-zinc-300">
                {formatDateTime(startTime)} → {formatDateTime(endTime)}
              </span>
              <span className="text-zinc-600 ml-2">
                ({formatDuration(scheduledMinutes)})
              </span>
            </div>

            {times && (
              <>
                <div>
                  <span className="text-zinc-500">Worked:</span>{' '}
                  <span className="text-green-400">{formatDuration(times.worked)}</span>
                </div>
                {times.breaks > 0 && (
                  <div>
                    <span className="text-zinc-500">Breaks:</span>{' '}
                    <span className="text-yellow-400">{formatDuration(times.breaks)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Worker info */}
          <div className="mt-3 pt-3 border-t border-zinc-800/50 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-zinc-500">Worker:</span>{' '}
              <span className="text-zinc-300">{engagement.worker.name}</span>
            </div>
            <div>
              <span className="text-zinc-500">Status:</span>{' '}
              <span className={getStateColor(engagement.current_state)}>
                {engagement.current_state?.toUpperCase()}
              </span>
            </div>
            {engagement.messages?.length > 0 && (
              <div>
                <span className="text-purple-400"><span className="text-base">✉</span> {engagement.messages.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Payout (desktop) */}
        {payout && (
          <div className="hidden md:block shrink-0">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Recommended Payout</div>
            <div className="flex gap-3">
              {/* Claimed */}
              <div className="bg-zinc-900 rounded-lg px-3 py-2">
                <div className="text-zinc-500 text-xs mb-1">Claimed</div>
                <div className="text-lg text-zinc-300">{formatCurrency(payout.claimed_total)}</div>
                <div className="text-zinc-600 text-xs">{payout.claimed_hours}h × ${payout.hourly_rate}/hr</div>
              </div>
              {/* Recommended */}
              <div className="bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-700">
                <div className="text-zinc-500 text-xs mb-1">Recommended</div>
                <div className="text-lg text-green-400">{formatCurrency(payout.recommended_total)}</div>
                <div className="text-zinc-600 text-xs">{payout.recommended_hours}h × ${payout.hourly_rate}/hr</div>
              </div>
              {/* Adjustment */}
              <div className="bg-zinc-900 rounded-lg px-3 py-2 max-w-[280px]">
                <div className="text-zinc-500 text-xs mb-1">Adjustment</div>
                <div className={`text-lg ${adjustment.class}`}>{adjustment.text}</div>
                <div className="text-zinc-600 text-xs leading-snug">
                  {payout.adjustment_reason}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payout section - mobile only */}
      {payout && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50 md:hidden">
          <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Recommended Payout</div>
          <div className="flex flex-wrap gap-3">
            {/* Claimed */}
            <div className="bg-zinc-900 rounded-lg px-3 py-2 flex-1 min-w-[100px]">
              <div className="text-zinc-500 text-xs mb-1">Claimed</div>
              <div className="text-lg text-zinc-300">{formatCurrency(payout.claimed_total)}</div>
              <div className="text-zinc-600 text-xs">{payout.claimed_hours}h × ${payout.hourly_rate}/hr</div>
            </div>
            {/* Recommended */}
            <div className="bg-zinc-900 rounded-lg px-3 py-2 flex-1 min-w-[100px] border border-zinc-700">
              <div className="text-zinc-500 text-xs mb-1">Recommended</div>
              <div className="text-lg text-green-400">{formatCurrency(payout.recommended_total)}</div>
              <div className="text-zinc-600 text-xs">{payout.recommended_hours}h × ${payout.hourly_rate}/hr</div>
            </div>
            {/* Adjustment */}
            <div className="bg-zinc-900 rounded-lg px-3 py-2 w-full">
              <div className="text-zinc-500 text-xs mb-1">Adjustment</div>
              <div className={`text-lg ${adjustment.class}`}>{adjustment.text}</div>
              <div className="text-zinc-600 text-xs leading-snug">
                {payout.adjustment_reason}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getScenarioColor(scenario) {
  if (scenario?.includes('happy')) return 'bg-green-900/50 text-green-400';
  if (scenario?.includes('dispute')) return 'bg-red-900/50 text-red-400';
  if (scenario?.includes('conflict')) return 'bg-yellow-900/50 text-yellow-400';
  if (scenario?.includes('missing') || scenario?.includes('no_clock')) return 'bg-orange-900/50 text-orange-400';
  return 'bg-zinc-800 text-zinc-400';
}

function formatScenario(scenario) {
  if (!scenario) return 'UNKNOWN';
  return scenario.replace(/_/g, ' ').toUpperCase();
}

function getStateColor(state) {
  const s = state?.toLowerCase();
  if (s === 'completed') return 'text-green-400';
  if (s === 'working' || s === 'on_site') return 'text-green-300';
  if (s === 'canceled' || s === 'no_show') return 'text-red-400';
  return 'text-zinc-300';
}
