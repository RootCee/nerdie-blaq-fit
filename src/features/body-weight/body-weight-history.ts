import { BodyWeightHistoryItem, BodyWeightHistorySummary, BodyWeightLogRecord } from "@/types/body-weight";

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function toHistoryItem(entry: BodyWeightLogRecord, previousEntry?: BodyWeightLogRecord): BodyWeightHistoryItem {
  return {
    loggedOn: entry.loggedOn,
    weight: entry.weight,
    changeFromPrevious: previousEntry ? roundToTenth(entry.weight - previousEntry.weight) : null,
  };
}

export function deriveBodyWeightHistorySummary(entries: BodyWeightLogRecord[]): BodyWeightHistorySummary {
  const historyItems = entries.map((entry, index) => toHistoryItem(entry, entries[index + 1]));
  const latestEntry = entries[0] ?? null;

  return {
    latestWeight: latestEntry?.weight ?? null,
    latestLoggedOn: latestEntry?.loggedOn ?? null,
    changeFromPrevious: historyItems[0]?.changeFromPrevious ?? null,
    entries: historyItems,
  };
}
