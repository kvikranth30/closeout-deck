import { useState } from 'react';
import ShiftHeader from './components/ShiftHeader';
import TimelineGrid from './components/TimelineGrid';
import ShiftCard from './components/ShiftCard';
import engagements from './data/sample-engagements.json';

const DEFAULT_COLUMNS = [
  { id: 'time', label: 'TIME', width: 100, sortable: true },
  { id: 'systemState', label: 'SYSTEM', width: 120 },
  { id: 'workerState', label: 'WORKER', width: 120 },
  { id: 'requesterState', label: 'REQUESTER', width: 120 },
  { id: 'location', label: 'LOCATION', width: 100 },
  { id: 'messages', label: 'MESSAGES', width: 300 },
];

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [timeSortAsc, setTimeSortAsc] = useState(true);
  const engagement = engagements[currentIndex];

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCurrentIndex((i) => (i > 0 ? i - 1 : engagements.length - 1));
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCurrentIndex((i) => (i < engagements.length - 1 ? i + 1 : 0));
    }
  };

  const handleColumnResize = (columnId, newWidth) => {
    setColumns(cols =>
      cols.map(col =>
        col.id === columnId ? { ...col, width: Math.max(60, newWidth) } : col
      )
    );
  };

  const handleColumnReorder = (dragIndex, dropIndex) => {
    setColumns(cols => {
      const newCols = [...cols];
      const [dragged] = newCols.splice(dragIndex, 1);
      newCols.splice(dropIndex, 0, dragged);
      return newCols;
    });
  };

  const handleToggleTimeSort = () => {
    setTimeSortAsc(prev => !prev);
  };

  return (
    <div
      className="h-screen bg-black text-white flex"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Sidebar */}
      <div className="w-72 border-r border-zinc-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold text-lg tracking-tight">SHIFT</span>
            <span className="text-zinc-500 font-bold text-lg tracking-tight">X-RAY</span>
          </div>
          <div className="text-zinc-600 text-xs mt-1">
            {engagements.length} engagements • ↑↓ to navigate
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {engagements.map((eng, i) => (
            <ShiftCard
              key={eng.engagement_id}
              engagement={eng}
              isSelected={i === currentIndex}
              onClick={() => setCurrentIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Pinned header area */}
        <div className="shrink-0 border-b border-zinc-800">
          <div className="p-4">
            <ShiftHeader engagement={engagement} />
          </div>
        </div>

        {/* Scrollable timeline */}
        <div className="flex-1 overflow-hidden">
          <TimelineGrid
            engagement={engagement}
            columns={columns}
            onColumnResize={handleColumnResize}
            onColumnReorder={handleColumnReorder}
            timeSortAsc={timeSortAsc}
            onToggleTimeSort={handleToggleTimeSort}
            hideEmptyRows
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-900 text-zinc-700 text-xs flex justify-between shrink-0">
          <span>HyperTrack Closeout Copilot • Shift X-Ray</span>
          <span>{engagement.scenario_type?.replace(/_/g, ' ')}</span>
        </div>
      </div>
    </div>
  );
}
