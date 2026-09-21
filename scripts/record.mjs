/**
 * 팀 상태 적기 — node scripts/record.mjs <팀id> <상태> "<한 줄>"
 *
 * 어떤 명령이든 일이 끝나면 이걸로 화면에 알립니다.
 * 화면은 public/state.json 을 읽어 각본 대신 이 기록을 믿습니다.
 *
 * 예)
 *   node scripts/record.mjs drive 마침 "드라이브에서 7건 찾음"
 *   node scripts/record.mjs drive "자료 대기" "gws 가 안 깔려 있어 못 찾음"
 *
 * 상태는 다섯 가지뿐입니다 — 마침 / 작업 중 / 결재 대기 / 자료 대기 / 대기
 * '연결 안 된 것을 마침이라고 적지 않는다'가 이 교무실의 안전 규칙입니다.
 */
import { argv, exit } from "node:process";
import { record } from "./state.mjs";

const STATES = ["마침", "작업 중", "결재 대기", "자료 대기", "대기"];
const [teamId, state, ...rest] = argv.slice(2);
const note = rest.join(" ").trim();

if (!teamId || !state) {
  console.error(`
쓰는 법:  node scripts/record.mjs <팀id> <상태> "<한 줄>"

  상태: ${STATES.join(" / ")}
  팀id: school.config.ts 의 DEPARTMENTS 에 적힌 id
`);
  exit(2);
}

if (!STATES.includes(state)) {
  console.error(`"${state}" 는 모르는 상태입니다. 이 다섯 중 하나여야 합니다 — ${STATES.join(" / ")}`);
  exit(2);
}

// 없는 팀에 적으면 화면에 영영 안 뜹니다. state.mjs 가 막아줍니다
const result = await record(teamId, state, note || state);
if (result.skipped) {
  console.error(`"${teamId}" 는 설정에 없는 팀입니다.\n지금 있는 팀: ${result.known.join(", ")}`);
  exit(2);
}
console.log(`적었습니다 — ${teamId} · ${state}${note ? ` · ${note}` : ""}`);
