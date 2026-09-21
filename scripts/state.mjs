/**
 * 실제 작업 기록 — public/state.json
 *
 * 화면은 원래 각본만 돌립니다. 이 파일이 있으면 화면이 그걸 읽어서
 * '자료 대기'와 '결재 대기'를 **진짜 상태**로 바꿔 보여줍니다.
 *
 * 왜 public/ 인가: 브라우저가 읽을 수 있는 자리가 거기뿐입니다.
 * 왜 저장소에 안 올리나: 선생님 컴퓨터의 작업 기록이라 각자 다릅니다.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const STATE_FILE = join(ROOT, "public", "state.json");

const EMPTY = { updatedAt: null, teams: {}, log: [] };

export async function readState() {
  try {
    return { ...EMPTY, ...JSON.parse(await readFile(STATE_FILE, "utf8")) };
  } catch {
    return { ...EMPTY };
  }
}

/** school.config.ts 에 실제로 있는 팀 id 들 */
export async function knownTeams() {
  try {
    const config = await readFile(join(ROOT, "school.config.ts"), "utf8");
    return [...config.matchAll(/\{ id: "(\w+)"/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

/**
 * 한 팀의 결과를 적는다.
 * @param {string} teamId   school.config.ts 의 부서 id (예: "review")
 * @param {"마침"|"작업 중"|"결재 대기"|"자료 대기"|"대기"} state
 * @param {string} note     한 줄 요약. 화면과 기록에 그대로 뜬다
 */
export async function record(teamId, state, note) {
  // 설정에 없는 팀에 적으면 화면에는 영영 안 뜹니다. 조용히 쌓이는 대신
  // 적지 않고 알려줍니다 — 안 한 일을 한 것처럼 남기지 않으려는 것입니다
  const known = await knownTeams();
  if (known.length && !known.includes(teamId)) {
    return { skipped: true, teamId, known };
  }

  const now = new Date().toISOString();
  const data = await readState();
  data.teams[teamId] = { state, note, at: now };
  data.log.unshift({ at: now, teamId, state, note });
  data.log = data.log.slice(0, 30);
  data.updatedAt = now;
  await mkdir(dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(data, null, 2), "utf8");
  return { skipped: false, data };
}
