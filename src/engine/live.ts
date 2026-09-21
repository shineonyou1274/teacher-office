/**
 * 실제 작업 기록 읽기 — public/state.json
 *
 * 이 파일이 없으면 화면은 지금까지처럼 각본만 돕니다 (기본값).
 * 있으면 그 팀의 상태를 각본 대신 **실제 기록**으로 덮어씁니다.
 * `npm run check` 나 Claude Code 의 /검수 가 돌 때마다 갱신됩니다.
 */
import type { TeamState } from "./sim";

export type LiveEntry = { state: TeamState; note: string; at: string };
export type Live = {
  updatedAt: string | null;
  teams: Record<string, LiveEntry>;
  log: { at: string; teamId: string; state: TeamState; note: string }[];
};

const VALID: TeamState[] = ["마침", "작업 중", "결재 대기", "자료 대기", "대기"];

/** 파일이 없으면 null. 없는 게 정상이라 조용히 넘어갑니다 */
export async function loadLive(): Promise<Live | null> {
  try {
    // 브라우저가 캐시해두면 갱신이 안 보입니다
    const res = await fetch(`./state.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const raw = (await res.json()) as Partial<Live>;
    if (!raw || typeof raw !== "object" || !raw.teams) return null;

    // 파일은 사람이 손으로도 고칠 수 있으니, 모르는 상태값은 버립니다
    const teams: Record<string, LiveEntry> = {};
    for (const [id, entry] of Object.entries(raw.teams)) {
      if (entry && VALID.includes(entry.state)) {
        teams[id] = { state: entry.state, note: String(entry.note ?? ""), at: String(entry.at ?? "") };
      }
    }
    const log = (raw.log ?? []).filter((l) => l && VALID.includes(l.state)).slice(0, 20);
    return { updatedAt: raw.updatedAt ?? null, teams, log };
  } catch {
    return null;
  }
}

/** "5분 전" 처럼 읽기 쉽게 */
export function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
}
