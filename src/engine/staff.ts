/**
 * 인사기록 — school.config.ts 를 읽어 직원 목록을 만듭니다.
 * 이 파일은 고칠 일이 없습니다. 이름·성격을 바꾸려면 school.config.ts 를 여세요.
 */
import { DEPARTMENTS, PENDING, STAFF, TEACHER, type StaffEntry } from "../../school.config";

export type Profile = {
  id: string;
  name: string;
  callsign?: string;
  role: string;
  deptId: string;
  rank: "lead" | "member" | "teacher";
  hair: string;
  shirt: string;
  accent: string;
  skin: string;
  thoughts: string[];
};

const SKIN = ["#f6d5bb", "#e8be9c", "#fadfc9", "#d8a882"];

let seq = 0;
function make(entry: StaffEntry): Profile {
  const i = seq++;
  return {
    id: `${entry.dept}-${entry.rank === "lead" ? "lead" : `m${i}`}`,
    name: entry.name,
    callsign: entry.callsign,
    role: entry.role,
    deptId: entry.dept,
    rank: entry.rank,
    hair: entry.colors[0],
    shirt: entry.colors[1],
    accent: entry.colors[2],
    skin: SKIN[i % SKIN.length],
    thoughts: entry.thoughts,
  };
}

export const ME: Profile = {
  id: "teacher",
  name: TEACHER.name,
  callsign: TEACHER.callsign,
  role: TEACHER.role,
  deptId: "teacher",
  rank: "teacher",
  hair: TEACHER.colors[0],
  shirt: TEACHER.colors[1],
  accent: TEACHER.colors[2],
  skin: SKIN[0],
  thoughts: [...TEACHER.thoughts],
};

export const ROSTER: Profile[] = STAFF.map(make);

export const LEADS: Record<string, Profile> = Object.fromEntries(
  ROSTER.filter((s) => s.rank === "lead").map((s) => [s.deptId, s]),
);

export const TEAM_INFO: Record<string, { task: string; report: string; name: string }> =
  Object.fromEntries(DEPARTMENTS.map((d) => [d.id, { task: d.task, report: d.report, name: d.name }]));

/**
 * 지시창에서 답하는 사람.
 *
 * 비서실(`desk`)이 있으면 그 팀장이, 없으면 마지막 부서의 팀장이 맡습니다.
 * 부서를 줄여 쓰는 교무실에서도 대답할 사람이 반드시 한 명은 있도록.
 */
export const FRONT_DESK: Profile =
  LEADS.desk
  ?? LEADS[DEPARTMENTS[DEPARTMENTS.length - 1]?.id ?? ""]
  ?? ROSTER.find((s) => s.rank === "lead")
  ?? ROSTER[0]
  ?? ME;

/** 아직 자료가 없어 멈춰 있는 부서 */
export const PENDING_INPUT: Record<string, string> = PENDING;

/** 설정이 엉켰을 때 조용히 깨지지 않게 먼저 알려준다 */
export function configWarnings(): string[] {
  const out: string[] = [];
  // 개수는 자유입니다. 안 쓰는 부서를 억지로 채우지 않게 범위만 봅니다
  if (DEPARTMENTS.length < 3) {
    out.push(`부서가 ${DEPARTMENTS.length}개입니다. 하루가 돌려면 3개는 있어야 해요 (일하는 팀·검수·비서실).`);
  }
  if (DEPARTMENTS.length > 12) {
    out.push(`부서가 ${DEPARTMENTS.length}개입니다. 교실이 한 줄에 6칸씩 두 줄이라, 13번째부터는 화면에 안 나옵니다.`);
  }
  for (const dept of DEPARTMENTS) {
    const leads = ROSTER.filter((s) => s.deptId === dept.id && s.rank === "lead");
    if (leads.length === 0) out.push(`${dept.name}: 팀장(rank "lead")이 없습니다.`);
    if (leads.length > 1) out.push(`${dept.name}: 팀장이 ${leads.length}명입니다. 1명만 두세요.`);
  }
  for (const s of ROSTER) {
    if (!DEPARTMENTS.some((d) => d.id === s.deptId)) {
      out.push(`${s.name}: 모르는 부서 id "${s.deptId}" 입니다.`);
    }
  }
  for (const id of Object.keys(PENDING_INPUT)) {
    if (!DEPARTMENTS.some((d) => d.id === id)) out.push(`PENDING: 모르는 부서 id "${id}" 입니다.`);
  }
  return out;
}
