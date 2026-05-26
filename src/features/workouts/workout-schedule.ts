import { WorkoutDay, WorkoutPlan } from "@/types/workout";

export const PROGRAM_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function getScheduledWorkoutLogId(dayId: string, weekIndex: number) {
  return `week-${weekIndex + 1}-${dayId}`;
}

export function getWorkoutDayIndexForWeekday(trainingDays: number, weekdayIndex: number) {
  const schedules: Record<number, Array<number | null>> = {
    3: [0, null, 1, null, 2, null, null],
    4: [0, 1, null, 2, 3, null, null],
    5: [0, 1, 2, null, 3, 4, null],
    6: [0, 1, 2, 3, 4, 5, null],
  };
  const schedule = schedules[Math.min(Math.max(trainingDays, 3), 6)] ?? schedules[3];

  return schedule[weekdayIndex] ?? null;
}

export function getWorkoutDayForWeekday(plan: WorkoutPlan, weekdayIndex: number): WorkoutDay | null {
  const workoutDayIndex = getWorkoutDayIndexForWeekday(plan.trainingDays, weekdayIndex);

  return workoutDayIndex === null ? null : plan.days[workoutDayIndex] ?? null;
}
