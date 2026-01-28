import { formatDateTime } from '../utils/timeUtils';

export default function ShiftCard({ engagement, isSelected, onClick }) {
  const gig = engagement.gig;
  const hasMessages = engagement.messages?.length > 0;

  return (
    <div
      onClick={onClick}
      className={`p-3 border-b border-zinc-900 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-zinc-800 border-l-2 border-l-green-500'
          : 'hover:bg-zinc-900/50 border-l-2 border-l-transparent'
      }`}
    >
      {/* Top row - ID and badges */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-zinc-500 text-xs font-mono truncate">
          {engagement.engagement_id}
        </span>
        {hasMessages && (
          <span className="text-purple-400 text-xs flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            {engagement.messages.length}
          </span>
        )}
      </div>

      {/* Business name */}
      <div className="text-sm font-medium text-zinc-200 truncate mb-1">
        {gig.business_name}
      </div>

      {/* Position and time */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500 truncate">{gig.position}</span>
        <span className="text-zinc-600 shrink-0 ml-2">
          {formatDateTime(gig.scheduled_start).split(',')[0]}
        </span>
      </div>

      {/* Scenario tag */}
      <div className="mt-2">
        <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${getScenarioColor(engagement.scenario_type)}`}>
          {formatScenario(engagement.scenario_type)}
        </span>
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
