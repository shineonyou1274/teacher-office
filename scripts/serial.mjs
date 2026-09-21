/**
 * 연재 대기열 — npm run serial -- <명령>
 *
 *   목록            지금 상태를 본다
 *   추가 "3화 제목"  대기열 맨 뒤에 넣는다
 *   오늘            대기열에서 하나 꺼내 '오늘 올릴 것'으로 놓는다
 *   올림            오늘 것을 올린 것으로 넘긴다 (선생님이 실제로 올린 뒤에)
 *   빼기            오늘 것을 대기열 맨 앞으로 되돌린다
 *
 * 매일 한 화씩 올리는 게 연재라서, 이 도구는 **하루에 하나만** 꺼냅니다.
 * 몰아서 꺼내면 다음 날이 빕니다.
 *
 * ⚠️ 이 도구는 아무것도 올리지 않습니다. 준비까지만 합니다.
 *    실제 게시는 선생님이 합니다 — 사규 안전 규칙입니다.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { argv, exit } from "node:process";
import { record } from "./state.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "serial.json");
/** 대기열이 이보다 적으면 곧 빈다고 알린다 */
const LOW = 2;

const EMPTY = { posted: [], today: null, queue: [] };

async function load() {
  try {
    const data = JSON.parse(await readFile(FILE, "utf8"));
    return { ...EMPTY, ...data };
  } catch {
    return { ...EMPTY };
  }
}
const save = (data) => writeFile(FILE, JSON.stringify(data, null, 2) + "\n", "utf8");

/**
 * 제목 앞에 붙은 "3화 —" 같은 번호는 떼어낸다.
 * 번호는 이 도구가 매기므로, 직접 쓰시면 "3화 — 3화 — 제목" 이 됩니다.
 */
const cleanTitle = (t) => t.replace(/^\s*\d+\s*화\s*[—\-·:.]*\s*/, "").trim() || t.trim();

/** 다음 화 번호 — 올린 것과 대기열을 통틀어 가장 큰 수 다음 */
function nextNo(data) {
  const all = [...data.posted, data.today, ...data.queue].filter(Boolean);
  return all.reduce((max, ep) => Math.max(max, ep.no ?? 0), 0) + 1;
}

/**
 * 화면에 알리고, 대기열이 비어가면 같이 적는다.
 * 설정에 연재팀이 없으면 적지 않고 한 줄 알려줍니다 — 안 뜰 기록을
 * 남기면 '했는데 화면엔 없는' 상태가 되기 때문입니다.
 */
async function report(data, teamId = "serial") {
  const left = data.queue.length;
  const today = data.today ? `${data.today.no}화 준비됨` : "오늘 꺼낸 화 없음";
  const note = `${today} · 대기열 ${left}개`;

  let result;
  if (!data.today && left === 0) {
    result = await record(teamId, "자료 대기", "올릴 화가 없습니다. 대기열을 채워주세요");
  } else if (left < LOW) {
    result = await record(teamId, "작업 중", `${note} — 곧 빕니다`);
  } else {
    result = await record(teamId, data.today ? "마침" : "대기", note);
  }

  if (result?.skipped) {
    console.log(`(설정에 "${teamId}" 팀이 없어 화면에는 안 뜹니다. 대기열은 serial.json 에 그대로 있습니다.)`);
    console.log(`  지금 있는 팀: ${result.known.join(", ")}`);
  }
  return note;
}

function show(data) {
  console.log("");
  if (data.today) console.log(`오늘 올릴 것 : ${data.today.no}화 — ${data.today.title}`);
  else console.log("오늘 올릴 것 : (아직 안 꺼냄)");

  console.log(`대기열 ${data.queue.length}개`);
  data.queue.forEach((ep, i) => console.log(`   ${i + 1}. ${ep.no}화 — ${ep.title}`));

  const recent = data.posted.slice(-3).reverse();
  if (recent.length) {
    console.log(`올린 것 ${data.posted.length}개 (최근순)`);
    for (const ep of recent) console.log(`   ${ep.no}화 — ${ep.title}`);
  }
  if (data.queue.length < LOW) {
    console.log(`\n⚠️ 대기열이 ${data.queue.length}개입니다. 내일 올릴 게 곧 떨어집니다.`);
  }
  console.log("");
}

const [cmd, ...rest] = argv.slice(2);
const text = rest.join(" ").trim();
const data = await load();

switch (cmd) {
  case "목록":
  case "list": {
    show(data);
    await report(data);
    break;
  }

  case "추가":
  case "add": {
    if (!text) { console.error('제목이 없습니다.  예) npm run serial -- 추가 "3화 — 검수팀이 반려하는 장면"'); exit(2); }
    const ep = { no: nextNo(data), title: cleanTitle(text), addedAt: new Date().toISOString() };
    data.queue.push(ep);
    await save(data);
    console.log(`\n대기열에 넣었습니다 — ${ep.no}화 · ${ep.title}`);
    show(data);
    await report(data);
    break;
  }

  case "오늘":
  case "today": {
    if (data.today) {
      console.error(`\n오늘 것이 이미 있습니다 — ${data.today.no}화 · ${data.today.title}`);
      console.error("올리셨으면  npm run serial -- 올림  을, 미루시려면  빼기  를 쓰세요.");
      console.error("하루에 하나만 꺼냅니다. 몰아 꺼내면 다음 날이 빕니다.\n");
      exit(1);
    }
    const ep = data.queue.shift();
    if (!ep) { console.error("\n대기열이 비었습니다. 먼저 추가해주세요.\n"); await report(data); exit(1); }
    data.today = ep;
    await save(data);
    console.log(`\n오늘 올릴 것 — ${ep.no}화 · ${ep.title}`);
    console.log("올리는 건 선생님이 하십니다. 올리신 뒤에  npm run serial -- 올림  을 쳐주세요.");
    show(data);
    await report(data);
    break;
  }

  case "올림":
  case "done": {
    if (!data.today) { console.error("\n오늘 꺼낸 화가 없습니다.\n"); exit(1); }
    const ep = { ...data.today, postedAt: new Date().toISOString() };
    data.posted.push(ep);
    data.today = null;
    await save(data);
    console.log(`\n${ep.no}화를 올린 것으로 적었습니다.`);
    show(data);
    await report(data);
    break;
  }

  case "빼기":
  case "undo": {
    if (!data.today) { console.error("\n오늘 꺼낸 화가 없습니다.\n"); exit(1); }
    data.queue.unshift(data.today);
    console.log(`\n${data.today.no}화를 대기열 맨 앞으로 되돌렸습니다.`);
    data.today = null;
    await save(data);
    show(data);
    await report(data);
    break;
  }

  default:
    console.error(`
쓰는 법:  npm run serial -- <명령>

  목록                       지금 상태
  추가 "3화 — 제목"           대기열 맨 뒤에 넣기
  오늘                       하나 꺼내 '오늘 올릴 것'으로
  올림                       올린 것으로 넘기기 (실제로 올리신 뒤에)
  빼기                       오늘 것을 대기열로 되돌리기

이 도구는 아무것도 올리지 않습니다. 준비까지만 합니다.
`);
    exit(2);
}
