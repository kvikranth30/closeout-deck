import { useState } from 'react';
import ShiftHeader from './components/ShiftHeader';
import TimelineGrid from './components/TimelineGrid';
import ShiftCard from './components/ShiftCard';
import engagements from './data/sample-engagements.json';

const DEFAULT_COLUMNS = [
  { id: 'time', label: 'TIME', width: 180, minWidth: 160, sortable: true, sticky: true },
  { id: 'systemState', label: 'SYSTEM', width: 130, minWidth: 110 },
  { id: 'workerState', label: 'WORKER', width: 130, minWidth: 110 },
  { id: 'requesterState', label: 'FACILITY', width: 130, minWidth: 110 },
  { id: 'location', label: 'LOCATION', width: 160, minWidth: 160 },
  { id: 'messages', label: 'MESSAGES', width: 350, minWidth: 150 },
];

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [timeSortAsc, setTimeSortAsc] = useState(true);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const engagement = engagements[currentIndex];

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
      className="h-screen bg-black text-white flex overflow-hidden select-none outline-none"
    >
      {/* Sidebar - full width on mobile, fixed width on desktop */}
      <div className="w-full md:w-72 border-r border-zinc-900 flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-green-500 font-bold text-lg tracking-tight">CLOSEOUT</span>
            <span className="text-zinc-500 font-bold text-lg tracking-tight">COPILOT</span>
          </div>
          <div className="text-zinc-600 text-xs mt-1">
            {engagements.length} shifts
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
          <span>HyperTrack Closeout Copilot</span>
          <span className="capitalize">{engagement.scenario_type?.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Mobile Modal */}
      {mobileModalOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black flex flex-col overflow-hidden">
          {/* Fixed nav bar */}
          <div className="shrink-0 border-b border-zinc-800 p-3">
            <button
              onClick={() => setMobileModalOpen(false)}
              className="text-zinc-400 hover:text-white flex items-center gap-2"
            >
              <span>←</span>
              <span>Back</span>
            </button>
          </div>

          {/* Scrollable content with sticky column headers */}
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
              headerContent={<ShiftHeader engagement={engagement} />}
            />
          </div>
        </div>
      )}
    </div>
  );
}
