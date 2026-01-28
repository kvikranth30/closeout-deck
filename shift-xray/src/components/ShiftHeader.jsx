import { useState } from 'react';
import { formatDateTime, formatDuration, calculateWorkedTime } from '../utils/timeUtils';

export default function ShiftHeader({ engagement }) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contestReason, setContestReason] = useState('');

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

  const handleEditClick = () => {
    setContestReason('');
    setEditModalOpen(true);
  };

  const handleSubmitContest = () => {
    // In a real app, this would send to backend
    console.log('Contest submitted:', contestReason);
    setEditModalOpen(false);
  };

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

          {/* Shift details - compact single line style */}
          <div className="text-sm text-zinc-400 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-300">{formatDateTime(startTime)} → {formatDateTime(endTime)}</span>
              <span className="text-zinc-600">({formatDuration(scheduledMinutes)})</span>
              {times && (
                <>
                  <span className="text-zinc-700">•</span>
                  <span>Worked <span className="text-green-400">{formatDuration(times.worked)}</span></span>
                  {times.breaks > 0 && (
                    <>
                      <span className="text-zinc-700">•</span>
                      <span>Breaks <span className="text-yellow-400">{formatDuration(times.breaks)}</span></span>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-300">{engagement.worker.name}</span>
              <span className="text-zinc-700">•</span>
              <span className={getStateColor(engagement.current_state)}>
                {engagement.current_state?.toUpperCase()}
              </span>
              {engagement.messages?.length > 0 && (
                <>
                  <span className="text-zinc-700">•</span>
                  <span className="text-purple-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                    {engagement.messages.length}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Payout (desktop) */}
        {payout && (
          <div className="hidden md:block shrink-0">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Payout Reconciliation</div>
            <div className="flex gap-3">
              {/* Claimed */}
              <div className="bg-zinc-900 rounded-lg px-3 py-2">
                <div className="text-zinc-500 text-xs mb-1">Claimed</div>
                <div className="text-lg text-zinc-300">{formatCurrency(payout.claimed_total)}</div>
                <div className="text-zinc-600 text-xs">{payout.claimed_hours}h × ${payout.hourly_rate}/hr</div>
              </div>
              {/* Adjustment */}
              <div className="bg-zinc-900 rounded-lg px-3 py-2 max-w-[320px] flex flex-col">
                <div className="text-zinc-500 text-xs mb-1">Adjustment</div>
                <div className={`text-lg ${adjustment.class}`}>{adjustment.text}</div>
                <div className="text-zinc-600 text-xs leading-snug">
                  {payout.adjustment_reason}
                </div>
                <div className="flex-1" />
                <button
                  onClick={handleEditClick}
                  className="w-full px-3 py-1 mt-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </button>
              </div>
              {/* Final */}
              <div className="bg-zinc-900 rounded-lg px-3 py-2 border border-green-700/50 flex flex-col">
                <div className="text-zinc-500 text-xs mb-1">Final</div>
                <div className="text-lg text-green-400">{formatCurrency(payout.recommended_total)}</div>
                <div className="text-zinc-600 text-xs">{payout.recommended_hours}h × ${payout.hourly_rate}/hr</div>
                <div className="flex-1" />
                <button className="w-full px-3 py-1 mt-2 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors">
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payout section - mobile only */}
      {payout && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50 md:hidden">
          <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Payout Reconciliation</div>
          <div className="flex flex-wrap gap-3">
            {/* Claimed */}
            <div className="bg-zinc-900 rounded-lg px-3 py-2 flex-1 min-w-[100px]">
              <div className="text-zinc-500 text-xs mb-1">Claimed</div>
              <div className="text-lg text-zinc-300">{formatCurrency(payout.claimed_total)}</div>
              <div className="text-zinc-600 text-xs">{payout.claimed_hours}h × ${payout.hourly_rate}/hr</div>
            </div>
            {/* Final */}
            <div className="bg-zinc-900 rounded-lg px-3 py-2 flex-1 min-w-[100px] border border-green-700/50">
              <div className="text-zinc-500 text-xs mb-1">Final</div>
              <div className="text-lg text-green-400">{formatCurrency(payout.recommended_total)}</div>
              <div className="text-zinc-600 text-xs">{payout.recommended_hours}h × ${payout.hourly_rate}/hr</div>
            </div>
            {/* Adjustment */}
            <div className="bg-zinc-900 rounded-lg px-3 py-2 w-full">
              <div className="text-zinc-500 text-xs mb-1">Adjustment</div>
              <div className={`text-lg ${adjustment.class}`}>{adjustment.text}</div>
              <div className="text-zinc-600 text-xs leading-snug mb-2">
                {payout.adjustment_reason}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleEditClick}
                  className="flex-1 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </button>
                <button className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors">
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setEditModalOpen(false)}>
          <div
            className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 border border-zinc-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Adjustment</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="text-zinc-500 text-xs mb-1">Current Reasoning</div>
              <div className="text-zinc-400 text-sm bg-zinc-800 rounded p-3">
                {payout?.adjustment_reason}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-zinc-500 text-xs mb-1">Current Adjustment</div>
              <div className={`text-lg ${adjustment?.class}`}>{adjustment?.text}</div>
            </div>

            <div className="mb-4">
              <label className="text-zinc-500 text-xs mb-1 block">Notes</label>
              <textarea
                value={contestReason}
                onChange={(e) => setContestReason(e.target.value)}
                placeholder="Enter your adjustment notes..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitContest}
                disabled={!contestReason.trim()}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded transition-colors"
              >
                Submit
              </button>
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
