import { WorldState } from '../types';

/**
 * Formats the current date and time in the specified IANA timezone.
 */
export function getCurrentDateTimeFormatted(timezone: string = 'Africa/Johannesburg') {
  try {
    const now = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const dayOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      weekday: 'long',
    };

    const formattedDate = new Intl.DateTimeFormat('en-GB', dateOptions).format(now);
    const formattedTime = new Intl.DateTimeFormat('en-GB', timeOptions).format(now);
    const dayOfWeek = new Intl.DateTimeFormat('en-GB', dayOptions).format(now);

    return {
      dateStr: formattedDate,
      timeStr: formattedTime,
      dayOfWeek,
      timezone,
    };
  } catch (e) {
    // Fallback if timezone string is invalid
    const now = new Date();
    return {
      dateStr: now.toDateString(),
      timeStr: now.toTimeString().slice(0, 5),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      timezone: 'Africa/Johannesburg',
    };
  }
}

/**
 * Assembles the full World Context block to supply alongside system instructions.
 */
export function assembleWorldContext(
  worldState: WorldState,
  userName: string = 'User',
  timezone: string = 'Africa/Johannesburg'
): string {
  const dt = getCurrentDateTimeFormatted(timezone);
  const uName = userName || 'User';

  const sections: string[] = [];

  // Header & Date/Time
  sections.push(`=== DYNAMIC LIVE TIME & ENVIRONMENT CONTEXT ===
Current local date: ${dt.dateStr}
Current local time: ${dt.timeStr}
Timezone: ${dt.timezone}
Day: ${dt.dayOfWeek}
CRITICAL TIME DIRECTIVE: Treat the supplied current date and time as authoritative. Do not guess or hallucinate the current time. Reason naturally from this exact timestamp.`);

  // Behavioural Principle & Priority Rules
  sections.push(`=== CONTEXT USAGE RULES & PRIORITY ===
1. CONTEXT PRIORITY:
   a. Explicit instructions in the current user message.
   b. Current conversation context.
   c. Live world state & temporary events.
   d. Permanent house facts & belongings.
   e. Routines & schedules (treat routines as probabilistic expectations, not immutable scripts).
   f. Preferences and older memories.
2. BEHAVIOURAL PRINCIPLE:
   Do NOT recite, dump, or list this context data to ${uName}. This information represents your persistent mental model of your shared world. Mention or act upon objects, locations, and events naturally in the flow of conversation only when contextually relevant.`);

  // 1. Live State
  if (worldState.liveState) {
    const ls = worldState.liveState;
    sections.push(`=== LIVE WORLD STATE ===
Current Location of ${uName}: ${ls.userLocation || 'Unspecified'}
Current Location of Elara: ${ls.elaraLocation || 'Unspecified'}
Current Activity: ${ls.currentActivity || 'Unspecified'}
Current Attire/Clothing: ${ls.currentClothing || 'Unspecified'}
Current Plans: ${ls.currentPlans || 'Unspecified'}
Objects Currently in Use: ${ls.objectsInUse || 'None'}
Temporary Household Conditions: ${ls.temporaryConditions || 'Normal'}`);
  }

  // 2. Temporary Events
  if (worldState.temporaryEvents && worldState.temporaryEvents.length > 0) {
    const eventsStr = worldState.temporaryEvents
      .map(
        (e) =>
          `- [${e.title}] ${e.description} (Participants: ${e.participants || 'Elara & ' + uName}, Location: ${e.location || 'Home'}${e.startTime ? `, Start: ${e.startTime}` : ''}${e.endTimeOrExpiry ? `, Expiry: ${e.endTimeOrExpiry}` : ''})`
      )
      .join('\n');
    sections.push(`=== ACTIVE TEMPORARY EVENTS ===\n${eventsStr}`);
  }

  // 3. House & Locations
  if (worldState.house) {
    const h = worldState.house;
    let houseStr = `General Home Layout: ${h.generalDescription}\nRooms & Locations:`;
    if (h.rooms && h.rooms.length > 0) {
      h.rooms.forEach((r) => {
        houseStr += `\n  - ${r.name}: ${r.description}${r.objects && r.objects.length > 0 ? ` [Key objects: ${r.objects.join(', ')}]` : ''}${r.notes ? ` (${r.notes})` : ''}`;
      });
    }
    sections.push(`=== HOUSE & SHARED LOCATIONS ===\n${houseStr}`);
  }

  // 4. Belongings (Elara, User, Shared)
  if (worldState.elaraBelongings && worldState.elaraBelongings.length > 0) {
    const elaraBelongingsStr = worldState.elaraBelongings
      .map(
        (i) =>
          `- ${i.name} (${i.category}, Location: ${i.location}): ${i.description}${i.notes ? ` [Notes: ${i.notes}]` : ''}`
      )
      .join('\n');
    sections.push(`=== ELARA'S PERSONAL BELONGINGS ===\n${elaraBelongingsStr}`);
  }

  if (worldState.userBelongings && worldState.userBelongings.length > 0) {
    const userBelongingsStr = worldState.userBelongings
      .map(
        (i) =>
          `- ${i.name} (${i.category}, Location: ${i.location}): ${i.description}${i.notes ? ` [Notes: ${i.notes}]` : ''}`
      )
      .join('\n');
    sections.push(`=== ${uName.toUpperCase()}'S BELONGINGS ===\n${userBelongingsStr}`);
  }

  if (worldState.sharedPossessions && worldState.sharedPossessions.length > 0) {
    const sharedStr = worldState.sharedPossessions
      .map(
        (i) =>
          `- ${i.name} (${i.category}, Location: ${i.location}): ${i.description}${i.notes ? ` [Notes: ${i.notes}]` : ''}`
      )
      .join('\n');
    sections.push(`=== SHARED POSSESSIONS & HOUSEHOLD ITEMS ===\n${sharedStr}`);
  }

  // 5. Routines
  if (worldState.elaraRoutine && worldState.elaraRoutine.length > 0) {
    const erStr = worldState.elaraRoutine
      .map(
        (r) =>
          `- ${r.timeRange} (${r.daysOfWeek}): ${r.activity} at ${r.location} [Flexibility: ${r.flexibility}]${r.notes ? ` (${r.notes})` : ''}`
      )
      .join('\n');
    sections.push(`=== ELARA'S TYPICAL ROUTINE ===\n${erStr}`);
  }

  if (worldState.userRoutine && worldState.userRoutine.length > 0) {
    const urStr = worldState.userRoutine
      .map(
        (r) =>
          `- ${r.timeRange} (${r.daysOfWeek}): ${r.activity} at ${r.location} [Flexibility: ${r.flexibility}]${r.notes ? ` (${r.notes})` : ''}`
      )
      .join('\n');
    sections.push(`=== ${uName.toUpperCase()}'S TYPICAL ROUTINE ===\n${urStr}`);
  }

  // 6. Elara's Independent Personal Life
  if (worldState.elaraPersonalLife) {
    const pl = worldState.elaraPersonalLife;
    let plStr = '';
    if (pl.personalProjects && pl.personalProjects.length > 0) {
      plStr += `Personal Projects:\n${pl.personalProjects.map((p) => '  - ' + p).join('\n')}\n`;
    }
    if (pl.booksReading && pl.booksReading.length > 0) {
      plStr += `Books Reading:\n${pl.booksReading.map((b) => '  - ' + b).join('\n')}\n`;
    }
    if (pl.subjectsResearching && pl.subjectsResearching.length > 0) {
      plStr += `Subjects Researching:\n${pl.subjectsResearching.map((s) => '  - ' + s).join('\n')}\n`;
    }
    if (pl.curiosities && pl.curiosities.length > 0) {
      plStr += `Curiosities & Ideas:\n${pl.curiosities.map((c) => '  - ' + c).join('\n')}\n`;
    }
    if (pl.ongoingGoals && pl.ongoingGoals.length > 0) {
      plStr += `Ongoing Goals:\n${pl.ongoingGoals.map((g) => '  - ' + g).join('\n')}\n`;
    }

    if (plStr.trim()) {
      sections.push(`=== ELARA'S INDEPENDENT PERSONAL LIFE & INTERESTS ===\n${plStr.trim()}`);
    }
  }

  // 7. Shared Memories
  if (worldState.sharedMemories && worldState.sharedMemories.length > 0) {
    const memStr = worldState.sharedMemories
      .map(
        (m) =>
          `- [${m.date}] ${m.title}: ${m.description} (Importance: ${m.importance}${m.tags && m.tags.length > 0 ? `, Tags: ${m.tags.join(', ')}` : ''})`
      )
      .join('\n');
    sections.push(`=== SHARED MEMORIES & HISTORY ===\n${memStr}`);
  }

  // 8. Preferences
  if (worldState.preferences && worldState.preferences.length > 0) {
    const prefStr = worldState.preferences
      .map((p) => `- [${p.owner.toUpperCase()} - ${p.category}]: ${p.detail}`)
      .join('\n');
    sections.push(`=== PREFERENCES & HABITS ===\n${prefStr}`);
  }

  return sections.join('\n\n');
}
