/**
 * Calculate the distance between two coordinates using the Haversine formula
 * Returns distance in miles
 */
export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Get the closest location event to a given time
 */
export function getLocationAtTime(locationEvents, targetTime, maxGapMinutes = 30) {
  if (!locationEvents || locationEvents.length === 0) return null;

  const target = new Date(targetTime).getTime();
  let closest = null;
  let closestDiff = Infinity;

  for (const event of locationEvents) {
    const eventTime = new Date(event.timestamp).getTime();
    const diff = Math.abs(eventTime - target);

    // Only consider events within the max gap
    if (diff < closestDiff && diff <= maxGapMinutes * 60 * 1000) {
      closest = event;
      closestDiff = diff;
    }
  }

  return closest;
}

/**
 * Calculate distance from gig site and return location info
 * Handles both old format (lat/lng) and new format (activity/status/distance_miles)
 */
export function getDistanceFromSite(locationEvent, gigLocation) {
  if (!locationEvent) return null;

  // New format: activity, status, distance_miles are directly on the event
  if (locationEvent.activity !== undefined || locationEvent.status !== undefined) {
    return {
      activity: locationEvent.activity,
      status: locationEvent.status,
      distance_miles: locationEvent.distance_miles
    };
  }

  // Old format: calculate distance from lat/lng coordinates
  if (!gigLocation || !locationEvent.lat || !locationEvent.lng) return null;

  const distance = getDistance(
    locationEvent.lat,
    locationEvent.lng,
    gigLocation.lat,
    gigLocation.lng
  );

  // Convert to new format
  const isOnSite = distance < 0.1;
  return {
    activity: 'stationary',
    status: isOnSite ? 'on_site' : 'off_site',
    distance_miles: isOnSite ? 0 : distance
  };
}

/**
 * Get messages near a time slot
 */
export function getMessagesAtTime(messages, slotTime) {
  if (!messages || messages.length === 0) return [];

  const slotStart = new Date(slotTime);
  const slotEnd = new Date(slotTime.getTime() + 5 * 60 * 1000);

  return messages.filter(msg => {
    const msgTime = new Date(msg.timestamp);
    return msgTime >= slotStart && msgTime < slotEnd;
  });
}
