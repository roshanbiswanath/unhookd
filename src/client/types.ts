import type { ActivityContract } from "../shared/contracts";

export type SessionRecord = {
  id: string;
  activity: ActivityContract;
  status: string;
  observed: number;
  pullBefore: number | null;
  pullAfter: number | null;
  helpfulness: "yes" | "somewhat" | "no" | null;
  startedAt: string;
  completedAt: string | null;
};

export type WindowRecord = {
  id: string;
  hookId: string;
  days: number[];
  startTime: string;
  endTime: string;
};

export type DashboardResponse = {
  onboardingComplete: boolean;
  windows: WindowRecord[];
  sessions: SessionRecord[];
  protectedCount: number;
};
