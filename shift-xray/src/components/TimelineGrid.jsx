import { useMemo, useState, useRef } from 'react';
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

export default function TimelineGrid({
  engagement,
  columns,
  onColumnResize,
  onColumnReorder,
  timeSortAsc = true,
  onToggleTimeSort,
  hideEmptyRows = false
}) {
  const gig = engagement.gig;
  const stateHistory = engagement.state_history || [];
  const locationEvents = engagement.location_events || [];
  const messages = engagement.messages || [];

  const workerTimesheet = engagement.timesheets?.find(t => t.type === 'worker');
  const requesterTimesheet = engagement.timesheets?.find(t => t.type === 'requester');

  const [draggedColumn, setDraggedColumn] = useState(null);
  const [resizing, setResizing] = useState(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Get the base date (first day) for day offset calculations
  const baseDate = useMemo(() => {
    const start = new Date(gig.scheduled_start);
    return new Date(start.getFullYear(), start.getMonth(), start.getDate());
  }, [gig.scheduled_start]);

  // Determine time range
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

  // Calculate day offset from base date
  const getDayOffset = (date) => {
    const d = new Date(date);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((dayStart - baseDate) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Build row data
  const rows = useMemo(() => {
    return timeSlots.map((slotTime) => {
      const systemState = getStateAtTime(stateHistory, slotTime);
      const isSystemTransition = isStateTransitionSlot(stateHistory, slotTime);

      const locationEvent = getLocationAtTime(locationEvents, slotTime);
      const location = locationEvent
        ? getDistanceFromSite(locationEvent, gig.location)
        : null;

      const slotMessages = getMessagesAtTime(messages, slotTime);

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

      const dayOffset = getDayOffset(slotTime);

      return {
        time: slotTime,
        dayOffset,
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
  }, [timeSlots, stateHistory, locationEvents, messages, gig, workerTimesheet, requesterTimesheet, baseDate]);

  // Filter empty rows
  let visibleRows = hideEmptyRows
    ? rows.filter(row =>
        row.isSystemTransition ||
        row.isWorkerTransition ||
        row.isRequesterTransition ||
        row.location ||
        row.messages.length > 0
      )
    : rows;

  // Sort by time
  if (!timeSortAsc) {
    visibleRows = [...visibleRows].reverse();
  }

  // Resize handlers
  const handleResizeStart = (e, columnId, currentWidth) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(columnId);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = currentWidth;

    const handleMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - resizeStartX.current;
      onColumnResize(columnId, resizeStartWidth.current + delta);
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedColumn(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedColumn !== null && draggedColumn !== index) {
      onColumnReorder(draggedColumn, index);
      setDraggedColumn(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  // Handle column header click (for sortable columns)
  const handleHeaderClick = (column) => {
    if (column.id === 'time' && onToggleTimeSort) {
      onToggleTimeSort();
    }
  };

  // Render cell content based on column type
  const renderCell = (row, column) => {
    switch (column.id) {
      case 'time':
        return (
          <span className="text-zinc-500 font-mono">
            {formatTime(row.time)}
            {row.dayOffset > 0 && (
              <span className="text-yellow-500 ml-1 text-xs">+{row.dayOffset}</span>
            )}
            {row.dayOffset < 0 && (
              <span className="text-cyan-500 ml-1 text-xs">{row.dayOffset}</span>
            )}
          </span>
        );
      case 'systemState':
        return <StateCell state={row.systemState} isTransition={row.isSystemTransition} />;
      case 'workerState':
        return <StateCell state={row.workerState} isTransition={row.isWorkerTransition} />;
      case 'requesterState':
        return <StateCell state={row.requesterState} isTransition={row.isRequesterTransition} />;
      case 'location':
        return <LocationCell location={row.location} />;
      case 'messages':
        return <MessageCell messages={row.messages} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sticky column headers */}
      <div className="shrink-0 bg-zinc-900/80 border-b border-zinc-700 backdrop-blur">
        <div className="flex">
          {columns.map((column, index) => (
            <div
              key={column.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => handleHeaderClick(column)}
              className={`relative px-3 py-2 text-xs font-medium text-zinc-400 border-r border-zinc-800 select-none ${
                column.sortable ? 'cursor-pointer hover:text-zinc-200' : 'cursor-grab'
              } ${draggedColumn === index ? 'opacity-50' : ''} ${
                column.id === 'location' ? 'text-cyan-400' : ''
              } ${column.id === 'messages' ? 'text-purple-400' : ''}`}
              style={{ width: column.width, minWidth: column.width }}
            >
              {column.label}
              {column.id === 'time' && (
                <span className="ml-1 text-green-500">
                  {timeSortAsc ? '↓' : '↑'}
                </span>
              )}
              {/* Resize handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-green-500/30"
                onMouseDown={(e) => handleResizeStart(e, column.id, column.width)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable rows */}
      <div className="flex-1 overflow-auto">
        {visibleRows.map((row, i) => (
          <div
            key={i}
            className={`flex border-b border-zinc-900 hover:bg-zinc-900/30 ${
              row.isSystemTransition ? 'bg-zinc-800/20' : ''
            }`}
          >
            {columns.map((column) => (
              <div
                key={column.id}
                className="px-3 py-1.5 border-r border-zinc-800/50 overflow-hidden"
                style={{ width: column.width, minWidth: column.width }}
              >
                {renderCell(row, column)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
