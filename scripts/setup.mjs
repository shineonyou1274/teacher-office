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
import { argv, stdin, stdout } from "node:process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(ROOT, "school.config.ts");
const RULEBOOK = join(ROOT, "TEACHER_OFFICE.md");

const rl = createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY });
const bold = (s) => `\u001b[1m${s}\u001b[0m`;
const dim = (s) => `\u001b[2m${s}\u001b[0m`;

// 한글 조사. "거창고등학교와 샤이니샘이" 처럼 앞 글자에 받침이 있는지로 갈립니다.
// 학교 이름도 호칭도 사람마다 다르니 조사를 고정해 둘 수 없습니다.
const hasBatchim = (word) => {
  const c = (word.trim().slice(-1) || " ").charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
const 와과 = (w) => (hasBatchim(w) ? "\uacfc" : "\uc640");
const 이가 = (w) => (hasBatchim(w) ? "\uc774" : "\uac00");

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
  for (;;) {
    const answer = await prompt(`${bold(question)}\n   ${dim(`지금: ${current}`)}\n   > `);
    console.log("");
    // "이대로 저장할까요?" 인 줄 알고 y 를 누르시는 경우가 있습니다.
    // 그대로 받으면 화면에 과목이 "y" 로 뜹니다
    if (/^[yn]$/i.test(answer.trim())) {
      console.log(dim(`   "${answer.trim()}" 는 저장 여부를 묻는 자리에서 쓰는 답입니다. 저장할지는 맨 마지막에 묻습니다.`));
      console.log(dim("   여기는 위 질문의 답을 적는 자리입니다. 그냥 두시려면 엔터만 치세요.\n"));
      continue;
    }
    return answer || current;
  }
}

async function askYesNo(question) {
  const answer = (await prompt(`${bold(question)} ${dim("(y/n)")} > `)).toLowerCase();
  return answer === "y" || answer === "yes" || answer === "\u315b";
}

/**
 * 여러 줄 받기. 한 줄로 정리해서 쓰라고 하면 대부분 못 씁니다.
 * 떠오르는 대로 적게 두고, 정리는 나중에 AI에게 맡깁니다.
 */
async function askFreely(question, hints) {
  console.log(bold(question));
  for (const hint of hints) console.log(dim("   " + hint));
  console.log(dim("   생각나는 대로 적으세요. 다 적으셨으면 빈 줄에서 엔터."));
  const lines = [];
  for (;;) {
    const line = await prompt("   > ");
    if (!line) break;
    lines.push(line);
  }
  console.log("");
  return lines;
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

/**
 * 기본 설정의 부서 12개. 이것과 다르면 이미 선생님 일에 맞게 짜인 것이라,
 * 팀을 짜려고 묻는 2·3번은 물을 이유가 없습니다.
 */
const STOCK_TEAMS = ["research", "learner", "design", "review", "write", "slide",
  "print", "assess", "care", "comm", "reflect", "desk"];

const configPeek = await readFile(CONFIG, "utf8");
const teamIds = [...configPeek.matchAll(/\{ id: "(\w+)"/g)].map((m) => m[1]);
const tailored = teamIds.length > 0 &&
  (teamIds.length !== STOCK_TEAMS.length || teamIds.some((id) => !STOCK_TEAMS.includes(id)));
const nameplateOnly = argv.includes("--이름표만") || tailored;

console.log(`
${bold("AI 교무실 설치 인터뷰")}
${dim("답하시는 대로 설정 파일을 고쳐 드립니다. 엔터만 치면 지금 값을 그대로 둡니다.")}
${dim("중간에 그만두려면 Ctrl + C 를 누르세요. 아무것도 바뀌지 않습니다.")}
`);

const dimNote = "> 설치 인터뷰(npm run setup)에서 받아 적은 것입니다. 정리는 SETUP.md 를 AI에게 읽히면 이어서 합니다.";

const configBefore = configPeek;
const rulebookBefore = await readFile(RULEBOOK, "utf8");

// ── 1. 이름표 ────────────────────────────────────────────
if (nameplateOnly) {
  console.log(bold("이름표만 묻겠습니다\n"));
  if (tailored) {
    console.log(dim(`   팀 ${teamIds.length}개와 하루 순서가 이미 선생님 일에 맞게 짜여 있습니다.`));
    console.log(dim("   그걸 짜려고 묻는 질문들은 건너뜁니다. 답을 다시 적지 않으셔도 됩니다.\n"));
  }
} else {
  console.log(bold("1 / 3 · 이름표\n"));
  console.log(dim("   화면에 뜰 이름입니다. 이것만 정해진 답이 있고, 나머지는 자유롭게 적으시면 됩니다.\n"));
}
const schoolName = await ask("학교 이름이 어떻게 되나요?", currentField(configBefore, "name", "export const SCHOOL"), "예) 한빛고등학교");
const teacherName = await ask("선생님 성함은? (화면 속 캐릭터 이름입니다)", currentField(configBefore, "name", "export const TEACHER"), "예) 김하늘");
const callsign = await ask("AI 직원들이 선생님을 뭐라고 부르면 될까요?", currentField(configBefore, "callsign", "export const TEACHER"), "예) 선생님 · 부장님 · 샘");
const subject = await ask("담당 과목이나 맡은 업무는요?", currentField(configBefore, "subject", "export const TEACHER"), "예) 영어 · 진로 · 3학년 부장");
// 배지(화면 왼쪽 위 동그라미 한 글자)는 학교 이름 첫 글자로 자동.
// 물어보기엔 사소하지만, 정했으면 정했다고 밝혀야 합니다
const badge = (schoolName.trim()[0] || "校");

// ── 2. 하는 일 ───────────────────────────────────────────
if (!nameplateOnly) console.log(bold("2 / 3 · 요즘 하는 일\n"));
const repeated = nameplateOnly ? [] : await askFreely("요즘 가장 자주, 반복해서 하는 일이 뭔가요?", [
  "수업이든 행정 업무든 상관없습니다. 여러 개여도 됩니다.",
  "예) 매주 활동지 만들기 / 생기부 정리 / 공문 기안 / 동아리 자료 / 시험 문항 출제",
]);
const howIWork = nameplateOnly ? [] : await askFreely("그 일을 어떤 식으로 하세요?", [
  "순서를 맞추려 애쓰지 마세요. 떠오르는 대로 적으시면 AI가 정리해 드립니다.",
  "예) 자료를 찾아보고 마음에 드는 걸 골라서 수업 내용에 맞게 고쳐요",
  "예) 성취기준을 보고 평가 방법부터 정해요",
]);

// ── 3. AI 쓰면서 걸리는 것 ───────────────────────────────
if (!nameplateOnly) console.log(bold("3 / 3 · AI 쓰면서 걸리는 것\n"));
const complaints = nameplateOnly ? [] : await askFreely("AI를 쓰면서 마음에 안 들었던 게 있나요?", [
  "말투든 내용이든, 고치기 귀찮았던 것이든 다 좋습니다.",
  "예) 안 물어본 걸 덧붙인다 / 아는 척한다 / 번역한 문장 같다 / 다 좋다고만 한다",
  "이 답으로 금칙어를 최대 5개까지 뽑습니다 (AI가 뽑아서 확인받습니다).",
]);

// ── 무엇이 바뀌는지 먼저 보여준다 ────────────────────────
let config = configBefore;
config = setField(config, "name", schoolName, "export const SCHOOL");
config = setField(config, "badge", badge, "export const SCHOOL");
config = setField(config, "name", teacherName, "export const TEACHER");
config = setField(config, "callsign", callsign, "export const TEACHER");
config = setField(config, "subject", subject, "export const TEACHER");

// 이름표만 머리말에 적는다. 하는 일과 불만은 정리가 필요해서 AI 몫으로 넘긴다
let rulebook = rulebookBefore;
const stamp = [
  "",
  "<!-- setup -->",
  `> **${schoolName} · ${teacherName}(${callsign}) · ${subject}**`,
  "<!-- /setup -->",
  "",
].join("\n");

if (rulebook.includes("<!-- setup -->")) {
  rulebook = rulebook.replace(/\n<!-- setup -->[\s\S]*?<!-- \/setup -->\n/, stamp);
} else {
  const anchor = rulebook.indexOf("\n## ");
  rulebook = anchor > 0 ? rulebook.slice(0, anchor) + stamp + rulebook.slice(anchor) : rulebook + stamp;
}

const asList = (lines) => (lines.length ? lines.map((l) => `- ${l}`).join("\n") : "- (적지 않음)");
const answers = `# ${teacherName} 선생님의 답

${dimNote}

## 이름표

- 학교: ${schoolName}
- 이름: ${teacherName} (${callsign})
- 과목·업무: ${subject}

## 요즘 가장 자주, 반복해서 하는 일

${asList(repeated)}

## 그 일을 하는 방식 (정리되지 않은 그대로)

${asList(howIWork)}

## AI를 쓰면서 마음에 안 들었던 것

${asList(complaints)}
`;

console.log(bold("이렇게 합니다\n"));
console.log(`  school.config.ts   학교 ${schoolName} · 이름 ${teacherName} · 호칭 ${callsign} · ${subject}`);
console.log(dim(`                     배지는 "${badge}" 로 해뒀습니다 — 화면 왼쪽 위 동그라미에 들어가는 글자입니다`));
console.log(dim(`                     (학교 이름 첫 글자. 바꾸려면 school.config.ts 의 SCHOOL.badge)`));
console.log(`  TEACHER_OFFICE.md  머리말에 위 이름표`);
if (!nameplateOnly) {
  console.log(`  MY_ANSWERS.md      새 파일 — 2·3번 답을 그대로 적어둡니다`);
  console.log(dim(`                     (하는 일 ${repeated.length}줄 · 방식 ${howIWork.length}줄 · 불만 ${complaints.length}줄)`));
} else {
  console.log(dim(`\n  팀과 하루 순서는 건드리지 않습니다. 바뀌는 건 위 이름표뿐입니다.`));
}
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
// 이름표만 고칠 때는 MY_ANSWERS.md 를 만들지 않습니다.
// 빈 답으로 덮어쓰면 예전에 적어두신 것이 사라집니다
if (!nameplateOnly) await writeFile(join(ROOT, "MY_ANSWERS.md"), answers, "utf8");

if (nameplateOnly) {
  console.log(`
${bold("이름표를 넣었습니다.")}

  화면에 ${schoolName}${와과(schoolName)} ${teacherName}${이가(teacherName)} 뜹니다. ${bold("npm run dev")} 로 확인해 보세요.

  팀 ${teamIds.length}개와 하루 순서는 그대로입니다.
  되돌리려면 .bak 파일의 이름에서 .bak 만 지우면 됩니다.
`);
  process.exit(0);
}

console.log(`
${bold("이름표까지 끝났습니다.")}

  화면에 ${schoolName}${와과(schoolName)} ${teacherName}${이가(teacherName)} 뜹니다. ${bold("npm run dev")} 로 확인해 보세요.

${bold("남은 절반은 AI와 합니다.")}

  방금 적으신 답은 아직 정리되지 않은 말 그대로입니다. 그걸 순서로 묶고,
  팀을 선생님 일에 맞게 다시 짜고, 불만에서 금칙어를 뽑는 건
  되물어보며 해야 하는 일이라 이 창에서는 못 합니다.

  ChatGPT나 Claude 대화창에 아래 세 파일을 붙여넣고,
  ${bold("\u201cSETUP.md 대로 이어서 해줘\u201d")} 라고 하세요.

    SETUP.md          AI에게 주는 순서
    MY_ANSWERS.md     방금 적으신 답
    school.config.ts  팀과 하루 순서가 적힌 곳 — AI가 고쳐 줄 파일

  AI가 \u201c제가 이해한 순서는 이렇습니다 \u2014 맞나요?\u201d 하고 되물어봅니다.
  고칠 것을 말해주시면 그때 팀을 짜줍니다.

  되돌리려면 .bak 파일의 이름에서 .bak 만 지우면 됩니다.
`);
