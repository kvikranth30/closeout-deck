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
 * Calculate distance from gig site and return formatted string
 */
export function getDistanceFromSite(locationEvent, gigLocation) {
  if (!locationEvent || !gigLocation) return null;

  const distance = getDistance(
    locationEvent.lat,
    locationEvent.lng,
    gigLocation.lat,
    gigLocation.lng
  );

  // Convert to more readable format
  if (distance < 0.1) {
    return { distance: distance, formatted: 'ON SITE', isOnSite: true };
  } else if (distance < 1) {
    const feet = Math.round(distance * 5280);
    return { distance: distance, formatted: `${feet} ft`, isOnSite: false };
  } else {
    return { distance: distance, formatted: `${distance.toFixed(1)} mi`, isOnSite: false };
  }
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
