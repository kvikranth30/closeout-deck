/**
 * Generate 5-minute time slots between start and end times
 */
export function generateTimeSlots(startsAt, endsAt) {
  const slots = [];
  let current = new Date(startsAt);
  const end = new Date(endsAt);

  while (current <= end) {
    slots.push(new Date(current));
    current = new Date(current.getTime() + 5 * 60 * 1000);
  }

  return slots;
}

/**
 * Find the active state at a given time from a list of state transitions
 */
export function getStateAtTime(states, targetTime) {
  if (!states || states.length === 0) return null;

  const target = new Date(targetTime);
  const sorted = [...states].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  let activeState = null;
  for (const state of sorted) {
    if (new Date(state.timestamp) <= target) {
      activeState = state;
    }
  }

  return activeState;
}

/**
 * Format a duration in minutes to a human-readable string
 */
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format a date to display time only (HH:MM)
 */
export function formatTime(date) {
  if (!date) return '--:--';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format a date to display date and time
 */
export function formatDateTime(date) {
  if (!date) return '--';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Calculate total worked time from timesheets
 */
export function calculateWorkedTime(timesheets) {
  const original = timesheets?.find(t => t.type === 'original');
  if (!original) return null;

  const clockIn = new Date(original.clock_in);
  const clockOut = new Date(original.clock_out);
  const totalMinutes = (clockOut - clockIn) / (1000 * 60);
  const breakMinutes = original.break_minutes || 0;

  return {
    total: totalMinutes,
    worked: totalMinutes - breakMinutes,
    breaks: breakMinutes
  };
}

/**
 * Check if a time slot has a state transition
 */
export function isStateTransitionSlot(states, slotTime) {
  if (!states || states.length === 0) return false;

  const slotStart = new Date(slotTime);
  const slotEnd = new Date(slotTime.getTime() + 5 * 60 * 1000);

  return states.some(state => {
    const transitionTime = new Date(state.timestamp);
    return transitionTime >= slotStart && transitionTime < slotEnd;
  });
}
