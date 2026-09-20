/**
 * 인사기록 — school.config.ts 를 읽어 직원 목록을 만듭니다.
 * 이 파일은 고칠 일이 없습니다. 이름·성격을 바꾸려면 school.config.ts 를 여세요.
 */
import { DEPARTMENTS, PENDING, STAFF, TEACHER, type StaffEntry } from "../../school.config";

export type Seed = {
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
function make(entry: StaffEntry): Seed {
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

export const ME: Seed = {
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

export const ALL_STAFF: Seed[] = STAFF.map(make);

export const DEPT_LEAD: Record<string, Seed> = Object.fromEntries(
  ALL_STAFF.filter((s) => s.rank === "lead").map((s) => [s.deptId, s]),
);

export const DEPT_BRIEF: Record<string, { task: string; report: string; name: string }> =
  Object.fromEntries(DEPARTMENTS.map((d) => [d.id, { task: d.task, report: d.report, name: d.name }]));

/** 아직 자료가 없어 멈춰 있는 부서 */
export const BLOCKED: Record<string, string> = PENDING;

/** 설정이 엉켰을 때 조용히 깨지지 않게 먼저 알려준다 */
export function configProblems(): string[] {
  const out: string[] = [];
  if (DEPARTMENTS.length !== 12) {
    out.push(`부서가 ${DEPARTMENTS.length}개입니다. 교무실 배치가 12칸 고정이라 12개를 유지해야 합니다.`);
  }
  for (const dept of DEPARTMENTS) {
    const leads = ALL_STAFF.filter((s) => s.deptId === dept.id && s.rank === "lead");
    if (leads.length === 0) out.push(`${dept.name}: 팀장(rank "lead")이 없습니다.`);
    if (leads.length > 1) out.push(`${dept.name}: 팀장이 ${leads.length}명입니다. 1명만 두세요.`);
  }
  for (const s of ALL_STAFF) {
    if (!DEPARTMENTS.some((d) => d.id === s.deptId)) {
      out.push(`${s.name}: 모르는 부서 id "${s.deptId}" 입니다.`);
    }
  }
  for (const id of Object.keys(BLOCKED)) {
    if (!DEPARTMENTS.some((d) => d.id === id)) out.push(`PENDING: 모르는 부서 id "${id}" 입니다.`);
  }
  return out;
}
