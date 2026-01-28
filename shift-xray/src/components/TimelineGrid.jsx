import { useMemo } from 'react';
import StateCell from './StateCell';
import LocationCell from './LocationCell';
import MessageCell from './MessageCell';
import {
  generateTimeSlots,
  getStateAtTime,
  isStateTransitionSlot,
  formatTime
} from '../utils/timeUtils';
import { getLocationAtTime, getDistanceFromSite, getMessagesAtTime } from '../utils/geoUtils';

export default function TimelineGrid({ engagement, hideEmptyRows = false }) {
  const gig = engagement.gig;
  const stateHistory = engagement.state_history || [];
  const locationEvents = engagement.location_events || [];
  const messages = engagement.messages || [];

  // Get timesheet states (worker and requester if present)
  const workerTimesheet = engagement.timesheets?.find(t => t.type === 'worker');
  const requesterTimesheet = engagement.timesheets?.find(t => t.type === 'requester');

  // Determine time range - use earliest/latest of scheduled and actual events
  const timeRange = useMemo(() => {
    const times = [
      new Date(gig.scheduled_start),
      new Date(gig.scheduled_end),
      ...stateHistory.map(s => new Date(s.timestamp)),
      ...locationEvents.map(l => new Date(l.timestamp)),
      ...messages.map(m => new Date(m.timestamp))
    ].filter(t => !isNaN(t.getTime()));

    const earliest = new Date(Math.min(...times));
    const latest = new Date(Math.max(...times));

    // Round to nearest 5 minutes
    earliest.setMinutes(Math.floor(earliest.getMinutes() / 5) * 5);
    earliest.setSeconds(0);
    latest.setMinutes(Math.ceil(latest.getMinutes() / 5) * 5);
    latest.setSeconds(0);

    return { start: earliest, end: latest };
  }, [gig, stateHistory, locationEvents, messages]);

  const timeSlots = useMemo(
    () => generateTimeSlots(timeRange.start, timeRange.end),
    [timeRange]
  );

  // Build row data for each time slot
  const rows = useMemo(() => {
    return timeSlots.map((slotTime, index) => {
      // System state
      const systemState = getStateAtTime(stateHistory, slotTime);
      const isSystemTransition = isStateTransitionSlot(stateHistory, slotTime);

      // Location
      const locationEvent = getLocationAtTime(locationEvents, slotTime);
      const location = locationEvent
        ? getDistanceFromSite(locationEvent, gig.location)
        : null;

      // Messages at this time
      const slotMessages = getMessagesAtTime(messages, slotTime);

      // Worker/Requester timesheet states (simplified - just show clock in/out)
      let workerState = null;
      let requesterState = null;

      if (workerTimesheet) {
        const clockIn = new Date(workerTimesheet.clock_in);
        const clockOut = new Date(workerTimesheet.clock_out);
        if (slotTime >= clockIn && slotTime <= clockOut) {
          workerState = { state: 'WORKING' };
        }
      }

      if (requesterTimesheet) {
        const clockIn = new Date(requesterTimesheet.clock_in);
        const clockOut = new Date(requesterTimesheet.clock_out);
        if (slotTime >= clockIn && slotTime <= clockOut) {
          requesterState = { state: 'WORKING' };
        }
      }

      return {
        time: slotTime,
        systemState,
        isSystemTransition,
        workerState,
        requesterState,
        location,
        messages: slotMessages,
        isWorkerTransition: workerTimesheet && (
          Math.abs(new Date(workerTimesheet.clock_in) - slotTime) < 5 * 60 * 1000 ||
          Math.abs(new Date(workerTimesheet.clock_out) - slotTime) < 5 * 60 * 1000
        ),
        isRequesterTransition: requesterTimesheet && (
          Math.abs(new Date(requesterTimesheet.clock_in) - slotTime) < 5 * 60 * 1000 ||
          Math.abs(new Date(requesterTimesheet.clock_out) - slotTime) < 5 * 60 * 1000
        ),
      };
    });
  }, [timeSlots, stateHistory, locationEvents, messages, gig, workerTimesheet, requesterTimesheet]);

  // Filter out empty rows if requested
  const visibleRows = hideEmptyRows
    ? rows.filter(row =>
        row.isSystemTransition ||
        row.isWorkerTransition ||
        row.isRequesterTransition ||
        row.location ||
        row.messages.length > 0
      )
    : rows;

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-900/50 sticky top-0">
            <th className="px-2 py-2 text-left text-zinc-400 font-medium border-r border-zinc-800 w-20">
              TIME
            </th>
            <th className="px-2 py-2 text-left text-zinc-400 font-medium border-r border-zinc-800">
              SYSTEM STATE
            </th>
            <th className="px-2 py-2 text-left text-zinc-400 font-medium border-r border-zinc-800">
              WORKER
              {workerTimesheet && (
                <span className="text-zinc-600 font-normal ml-1">(timesheet)</span>
              )}
            </th>
            <th className="px-2 py-2 text-left text-zinc-400 font-medium border-r border-zinc-800">
              REQUESTER
              {requesterTimesheet && (
                <span className="text-zinc-600 font-normal ml-1">(timesheet)</span>
              )}
            </th>
            <th className="px-2 py-2 text-left text-cyan-400 font-medium border-r border-zinc-800">
              LOCATION
            </th>
            <th className="px-2 py-2 text-left text-purple-400 font-medium border-r border-zinc-800">
              MESSAGES
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-zinc-900 hover:bg-zinc-900/30 ${
                row.isSystemTransition ? 'bg-zinc-800/20' : ''
              }`}
            >
              <td className="px-2 py-1 text-zinc-500 font-mono border-r border-zinc-800/50">
                {formatTime(row.time)}
              </td>
              <StateCell
                state={row.systemState}
                isTransition={row.isSystemTransition}
                source="system"
              />
              <StateCell
                state={row.workerState}
                isTransition={row.isWorkerTransition}
                source="worker"
              />
              <StateCell
                state={row.requesterState}
                isTransition={row.isRequesterTransition}
                source="requester"
              />
              <LocationCell location={row.location} />
              <MessageCell messages={row.messages} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
