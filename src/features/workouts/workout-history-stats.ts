import { WorkoutHistoryItem, WorkoutMotivationStats } from "@/types/workout";

function toLocalDateKey(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const weekday = copy.getDay();
  const distanceFromMonday = (weekday + 6) % 7;

  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - distanceFromMonday);

  return copy;
}

function differenceInCalendarDays(later: Date, earlier: Date) {
  const laterMidnight = new Date(later);
  const earlierMidnight = new Date(earlier);

  laterMidnight.setHours(0, 0, 0, 0);
  earlierMidnight.setHours(0, 0, 0, 0);

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((laterMidnight.getTime() - earlierMidnight.getTime()) / millisecondsPerDay);
}

/**
 * MVP streak definition:
 * Consecutive calendar days with at least one completed workout,
 * and the streak must end today or yesterday to count as "current".
 */
function calculateCurrentStreak(history: WorkoutHistoryItem[], now = new Date()) {
  if (!history.length) {
    return 0;
  }

  const uniqueDateKeys = Array.from(
    new Set(history.map((item) => toLocalDateKey(item.completedAt))),
  );

  const sortedDates = uniqueDateKeys
    .map((key) => new Date(`${key}T00:00:00`))
    .sort((a, b) => b.getTime() - a.getTime());

  const latestWorkoutDate = sortedDates[0];
  const gapFromToday = differenceInCalendarDays(now, latestWorkoutDate);

  if (gapFromToday > 1) {
    return 0;
  }

  let streak = 1;

  for (let index = 1; index < sortedDates.length; index += 1) {
    const previousDate = sortedDates[index - 1];
    const currentDate = sortedDates[index];

    if (differenceInCalendarDays(previousDate, currentDate) === 1) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

export function deriveWorkoutMotivationStats(
  history: WorkoutHistoryItem[],
  now = new Date(),
): WorkoutMotivationStats {
  const weekStart = startOfWeek(now);

  return {
    workoutsCompletedThisWeek: history.filter(
      (item) => new Date(item.completedAt).getTime() >= weekStart.getTime(),
    ).length,
    totalCompletedSessions: history.length,
    currentStreak: calculateCurrentStreak(history, now),
  };
}
