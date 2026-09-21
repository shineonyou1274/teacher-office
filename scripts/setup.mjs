/**
 * 설치 인터뷰 — npm run setup
 *
 * 처음 받은 사람에게 몇 가지를 묻고, 답을 school.config.ts 와
 * TEACHER_OFFICE.md 에 써 넣습니다. 그러면 남의 교무실이 아니라
 * 내 교무실이 됩니다.
 *
 * 원칙
 *  - AI도 인터넷도 쓰지 않습니다. 물어보고, 그대로 적습니다.
 *  - 고치기 전에 원본을 .bak 으로 남깁니다.
 *  - 답을 안 하고 엔터만 치면 지금 값을 그대로 둡니다.
 *  - 마지막에 무엇을 바꿀지 보여주고, 확인을 받고 나서 씁니다.
 */
import { createInterface } from "node:readline/promises";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stdin, stdout } from "node:process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(ROOT, "school.config.ts");
const RULEBOOK = join(ROOT, "TEACHER_OFFICE.md");

const rl = createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY });
const bold = (s) => `\u001b[1m${s}\u001b[0m`;
const dim = (s) => `\u001b[2m${s}\u001b[0m`;

// 한 줄씩 받아쓰기. rl.question 을 그대로 쓰지 않는 이유는, 답을 파일로
// 흘려넣어 시험할 때(입력이 터미널이 아닐 때) 중간에 끊기기 때문입니다.
const pending = [];
const waiting = [];
let inputClosed = false;
rl.on("line", (line) => {
  if (waiting.length) waiting.shift()(line);
  else pending.push(line);
});
rl.on("close", () => {
  inputClosed = true;
  while (waiting.length) waiting.shift()(null);
});

function nextLine() {
  if (pending.length) return Promise.resolve(pending.shift());
  if (inputClosed) return Promise.resolve(null);
  return new Promise((resolve) => waiting.push(resolve));
}

async function prompt(text) {
  stdout.write(text);
  const line = await nextLine();
  if (line === null) {
    console.log("\n입력이 끝나 설치를 멈춥니다. 아무것도 바뀌지 않았습니다.\n");
    process.exit(1);
  }
  if (!stdin.isTTY) stdout.write(line + "\n");
  return line.trim();
}

/** 한 가지를 묻는다. 엔터만 치면 지금 값 유지 */
async function ask(question, current, hint) {
  if (hint) console.log(dim("   " + hint));
  const answer = await prompt(`${bold(question)}\n   ${dim(`지금: ${current}`)}\n   > `);
  console.log("");
  return answer || current;
}

async function askYesNo(question) {
  const answer = (await prompt(`${bold(question)} ${dim("(y/n)")} > `)).toLowerCase();
  return answer === "y" || answer === "yes" || answer === "\u315b";
}


/** 따옴표 안 값만 정확히 바꾼다 (키 이름으로 찾는다) */
function setField(source, key, value, afterMarker) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const from = afterMarker ? source.indexOf(afterMarker) : 0;
  if (from < 0) return source;
  const pattern = new RegExp(`(\\n\\s*${key}:\\s*")([^"]*)(")`);
  const head = source.slice(0, from);
  const tail = source.slice(from);
  if (!pattern.test(tail)) return source;
  return head + tail.replace(pattern, (_, a, __, c) => a + escaped + c);
}

function currentField(source, key, afterMarker) {
  const from = afterMarker ? source.indexOf(afterMarker) : 0;
  const match = source.slice(Math.max(0, from)).match(new RegExp(`\\n\\s*${key}:\\s*"([^"]*)"`));
  return match ? match[1] : "";
}

console.log(`
${bold("AI 교무실 설치 인터뷰")}
${dim("답하시는 대로 설정 파일을 고쳐 드립니다. 엔터만 치면 지금 값을 그대로 둡니다.")}
${dim("중간에 그만두려면 Ctrl + C 를 누르세요. 아무것도 바뀌지 않습니다.")}
`);

const configBefore = await readFile(CONFIG, "utf8");
const rulebookBefore = await readFile(RULEBOOK, "utf8");

// ── 1. 학교와 나 ─────────────────────────────────────────
console.log(bold("1 / 4 · 학교와 선생님\n"));
const schoolName = await ask("학교 이름이 어떻게 되나요?", currentField(configBefore, "name", "export const SCHOOL"), "예) 한빛고등학교");
const badge = await ask("화면 왼쪽 위 배지에 넣을 글자 한 자는?", currentField(configBefore, "badge", "export const SCHOOL"), "예) 校 · 한 · H");
const teacherName = await ask("선생님 성함은? (화면 속 캐릭터 이름입니다)", currentField(configBefore, "name", "export const TEACHER"), "예) 김하늘");
const callsign = await ask("AI 직원들이 선생님을 뭐라고 부르면 될까요?", currentField(configBefore, "callsign", "export const TEACHER"), "예) 선생님 · 부장님 · 샘");
const subject = await ask("담당 과목이 무엇인가요?", currentField(configBefore, "subject", "export const TEACHER"), "예) 영어 · 수학 · 진로");

// ── 2. 하는 일 ───────────────────────────────────────────
console.log(bold("2 / 4 · 주로 만드는 자료\n"));
console.log(dim("   검수팀이 어떤 잣대로 볼지가 달라집니다.\n"));
const makesWorksheet = await askYesNo("학생 활동지를 만드시나요?");
const makesSlides = await askYesNo("수업 슬라이드·연수 자료를 만드시나요?");
const makesReport = await askYesNo("공모전·보고서 같은 제출 문서를 쓰시나요?");
console.log("");

// ── 3. 수업 준비 순서 ────────────────────────────────────
console.log(bold("3 / 4 · 수업 준비 순서\n"));
console.log(dim("   선생님이 실제로 하는 순서를 한 줄로 적어주세요. 그대로 문서에 남깁니다."));
console.log(dim("   예) 지난 시간 반응 확인 → 자료 찾기 → 활동지 초안 → 인쇄 전 검토\n"));
const flow = await prompt("   > ");
console.log("");

// ── 4. 듣기 싫은 표현 ────────────────────────────────────
console.log(bold("4 / 4 · 쓰지 않을 표현\n"));
console.log(dim("   AI가 쓰면 바로 돌려보낼 말을 적어주세요. 쉼표로 나눠 최대 5개."));
console.log(dim("   예) 여정, 놀라운, 함께 알아볼까요\n"));
const bannedRaw = await prompt("   > ");
const banned = bannedRaw ? bannedRaw.split(",").map((w) => w.trim()).filter(Boolean).slice(0, 5) : [];
console.log("");

// ── 무엇이 바뀌는지 먼저 보여준다 ────────────────────────
let config = configBefore;
config = setField(config, "name", schoolName, "export const SCHOOL");
config = setField(config, "badge", badge, "export const SCHOOL");
config = setField(config, "name", teacherName, "export const TEACHER");
config = setField(config, "callsign", callsign, "export const TEACHER");
config = setField(config, "subject", subject, "export const TEACHER");

const kinds = [makesWorksheet && "B 학생 활동지", makesSlides && "C 강의·연수 자료", makesReport && "A 공모전·보고서"].filter(Boolean);
let rulebook = rulebookBefore;
const stamp = [
  "",
  "<!-- setup -->",
  `> **${schoolName} · ${teacherName}(${callsign}) · ${subject}**`,
  kinds.length ? `> 주로 만드는 자료: ${kinds.join(" · ")} — 검수팀은 이 기준부터 봅니다.` : "> 주로 만드는 자료: (설치할 때 답하지 않음)",
  flow ? `> 수업 준비 순서: ${flow}` : "> 수업 준비 순서: (설치할 때 적지 않음)",
  "<!-- /setup -->",
  "",
].join("\n");

if (rulebook.includes("<!-- setup -->")) {
  rulebook = rulebook.replace(/\n<!-- setup -->[\s\S]*?<!-- \/setup -->\n/, stamp);
} else {
  const anchor = rulebook.indexOf("\n## ");
  rulebook = anchor > 0 ? rulebook.slice(0, anchor) + stamp + rulebook.slice(anchor) : rulebook + stamp;
}

// 표에는 적으신 순서대로 들어가야 하니 거꾸로 돌며 같은 자리에 끼운다
for (const word of [...banned].reverse()) {
  const row = `| \`${word}\` | ${teacherName} 선생님이 설치할 때 적은 말 |`;
  if (rulebook.includes(`| \`${word}\` |`)) continue;
  rulebook = rulebook.replace(/(\| `여기부터가 진짜`[^\n]*\n)/, `$1${row}\n`);
}

console.log(bold("이렇게 고칩니다\n"));
console.log(`  school.config.ts   학교 ${schoolName} · 배지 ${badge} · 이름 ${teacherName} · 호칭 ${callsign} · 과목 ${subject}`);
console.log(`  TEACHER_OFFICE.md  머리말에 위 내용과 수업 준비 순서를 적고,`);
console.log(`                     금칙어 ${banned.length}개를 표에 추가${banned.length ? ` (${banned.join(", ")})` : ""}`);
console.log(dim(`\n  원본은 school.config.ts.bak / TEACHER_OFFICE.md.bak 으로 남겨둡니다.\n`));

const go = await askYesNo("이대로 저장할까요?");
rl.close();

if (!go) {
  console.log("\n아무것도 바꾸지 않았습니다. 다시 하시려면 npm run setup 을 한 번 더 치세요.\n");
  process.exit(0);
}

await copyFile(CONFIG, CONFIG + ".bak");
await copyFile(RULEBOOK, RULEBOOK + ".bak");
await writeFile(CONFIG, config, "utf8");
await writeFile(RULEBOOK, rulebook, "utf8");

console.log(`
${bold("끝났습니다.")}

  다음 순서
   1. ${bold("npm run dev")} 를 치고 브라우저에서 화면을 여세요.
   2. 12개 팀 이름을 과목에 맞게 바꾸고 싶으시면 ${bold("SETUP.md")} 를 AI에게 읽히세요.
      사람이 정할 게 아니라 과목마다 달라서, 그건 AI와 이야기하며 정하는 편이 낫습니다.

  되돌리려면 .bak 파일의 이름에서 .bak 만 지우면 됩니다.
`);
