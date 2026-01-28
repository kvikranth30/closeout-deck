import { useState } from 'react';
import ShiftHeader from './components/ShiftHeader';
import TimelineGrid from './components/TimelineGrid';
import ShiftCard from './components/ShiftCard';
import engagements from './data/sample-engagements.json';

const DEFAULT_COLUMNS = [
  { id: 'time', label: 'TIME', width: 140, minWidth: 120, sortable: true, sticky: true },
  { id: 'systemState', label: 'SYSTEM', width: 130, minWidth: 110 },
  { id: 'workerState', label: 'WORKER', width: 130, minWidth: 110 },
  { id: 'requesterState', label: 'REQUESTER', width: 130, minWidth: 110 },
  { id: 'location', label: 'LOCATION', width: 100, minWidth: 80 },
  { id: 'messages', label: 'MESSAGES', width: 350, minWidth: 150 },
];

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [timeSortAsc, setTimeSortAsc] = useState(true);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
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
    if (e.key === 'Escape' && mobileModalOpen) {
      setMobileModalOpen(false);
    }
  };

  const handleColumnResize = (columnId, newWidth) => {
    setColumns(cols =>
      cols.map(col =>
        col.id === columnId ? { ...col, width: Math.max(col.minWidth || 60, newWidth) } : col
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

  const handleShiftSelect = (index) => {
    setCurrentIndex(index);
    setMobileModalOpen(true);
  };

  return (
    <div
      className="h-screen bg-black text-white flex"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Sidebar - full width on mobile, fixed width on desktop */}
      <div className="w-full md:w-72 border-r border-zinc-800 flex flex-col shrink-0 md:block">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold text-lg tracking-tight">SHIFT</span>
            <span className="text-zinc-500 font-bold text-lg tracking-tight">X-RAY</span>
          </div>
          <div className="text-zinc-600 text-xs mt-1">
            {engagements.length} engagements
            <span className="hidden md:inline"> • ↑↓ to navigate</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {engagements.map((eng, i) => (
            <ShiftCard
              key={eng.engagement_id}
              engagement={eng}
              isSelected={i === currentIndex}
              onClick={() => handleShiftSelect(i)}
            />
          ))}
        </div>
      </div>

      {/* Main content - hidden on mobile, shown on desktop */}
      <div className="hidden md:flex flex-1 flex-col min-w-0 overflow-hidden">
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

      {/* Mobile Modal */}
      {mobileModalOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black flex flex-col">
          {/* Modal header */}
          <div className="shrink-0 border-b border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setMobileModalOpen(false)}
                className="text-zinc-400 hover:text-white flex items-center gap-2"
              >
                <span>←</span>
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentIndex(i => i > 0 ? i - 1 : engagements.length - 1)}
                  className="px-2 py-1 bg-zinc-900 rounded text-xs"
                >
                  ◀
                </button>
                <span className="text-zinc-500 text-xs">
                  {currentIndex + 1}/{engagements.length}
                </span>
                <button
                  onClick={() => setCurrentIndex(i => i < engagements.length - 1 ? i + 1 : 0)}
                  className="px-2 py-1 bg-zinc-900 rounded text-xs"
                >
                  ▶
                </button>
              </div>
            </div>
            <ShiftHeader engagement={engagement} />
          </div>

          {/* Timeline with horizontal scroll, time column sticky */}
          <div className="flex-1 overflow-hidden">
            <TimelineGrid
              engagement={engagement}
              columns={columns}
              onColumnResize={handleColumnResize}
              onColumnReorder={handleColumnReorder}
              timeSortAsc={timeSortAsc}
              onToggleTimeSort={handleToggleTimeSort}
              hideEmptyRows
              mobileMode
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-900 text-zinc-700 text-xs shrink-0">
            {engagement.scenario_type?.replace(/_/g, ' ')}
          </div>
        </div>
      )}
    </div>
  );
}
