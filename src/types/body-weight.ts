export interface BodyWeightLogRecord {
  userId: string;
  loggedOn: string;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredBodyWeightLogRow {
  user_id: string;
  logged_on: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface BodyWeightHistoryItem {
  loggedOn: string;
  weight: number;
  changeFromPrevious: number | null;
}

export interface BodyWeightHistorySummary {
  latestWeight: number | null;
  latestLoggedOn: string | null;
  changeFromPrevious: number | null;
  entries: BodyWeightHistoryItem[];
}
