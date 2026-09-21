/**
 * 기계 검사 — npm run check -- <파일> [--기준 A|B|C]
 *
 * 왜 이게 있나:
 *   AI에게 "금칙어 검사해"라고 시키고 "0건입니다"를 믿으면 검수가 아닙니다.
 *   모델은 자기가 방금 쓴 글을 관대하게 봅니다. 그래서 **증명할 수 있는 것은
 *   코드가 직접 찾습니다.** 모델이 0건이라고 해도 여기서 걸리면 반려입니다.
 *
 * 무엇을 하고 무엇을 안 하나:
 *   - 찾는다: 금칙어(문자열), 미완성 표시, 미래형 성과 서술, 시간 배분 누락,
 *            정답 표시가 같은 파일에 있는지
 *   - 안 한다: "메시지가 2개인가", "정답이 보이는 선지인가" 같은 판단.
 *            이건 사람이나 AI가 읽어야 합니다. 대신 **봐야 할 자리**를 짚어줍니다.
 *
 * 금칙어 목록은 TEACHER_OFFICE.md 의 표에서 읽습니다. 두 군데에 적지 않습니다.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { argv, exit } from "node:process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RULEBOOK = join(ROOT, "TEACHER_OFFICE.md");

const args = argv.slice(2);
const jsonOut = args.includes("--json");
const target = args.find((a) => !a.startsWith("--") && a !== "A" && a !== "B" && a !== "C");
const kindFlag = args.findIndex((a) => a === "--기준" || a === "--kind");
const kind = (kindFlag >= 0 ? args[kindFlag + 1] : args.find((a) => ["A", "B", "C"].includes(a))) || "";

if (!target) {
  console.error(`
쓰는 법:  npm run check -- <파일> --기준 B

  --기준 A   공모전·보고서
  --기준 B   학생 활동지
  --기준 C   강의·연수 자료
  (생략하면 공통 금칙어만 봅니다)
`);
  exit(2);
}

/** TEACHER_OFFICE.md 표에서 금칙어를 읽는다. 백틱 안의 말만 가져온다 */
async function bannedWords() {
  const book = await readFile(RULEBOOK, "utf8");
  const start = book.indexOf("#### 공통 금칙어");
  if (start < 0) return [];
  const table = book.slice(start, book.indexOf("\n####", start + 10));
  const words = [];
  for (const line of table.split("\n")) {
    if (!line.startsWith("|") || line.includes("금칙어 |") || line.includes("---")) continue;
    const cell = line.split("|")[1] ?? "";
    for (const m of cell.matchAll(/`([^`]+)`/g)) {
      const word = m[1].replace(/~/g, "").trim();
      if (word && !word.includes("비어 있음")) words.push(word);
    }
  }
  return words;
}

/**
 * 백틱 안의 말은 지운 채로 찾는다.
 * `갈린다` 처럼 따옴표에 넣어 "이 말을 쓰지 말자"고 적은 건 쓴 게 아니라
 * 가리킨 것입니다. 이걸 안 빼면 규칙서가 자기 자신을 반려합니다.
 */
const withoutQuoted = (line) => line.replace(/`[^`]*`/g, "");
/** 그 줄의 백틱 안 내용만 모은다 */
const quotedOnly = (line) => (line.match(/`[^`]*`/g) ?? []).join(" ");

/** 몇 번째 줄인지 알려준다. 어디를 고칠지 말해야 하니까 */
function locate(text, needle) {
  const hits = [];
  text.split("\n").forEach((line, i) => {
    // `갈린다` 처럼 그 줄에서 백틱으로 가리킨 말이면, 그 줄은 그 말을 설명하는
    // 줄입니다. 설명에 예시가 따라 나오는 건 당연하니 줄째로 건너뜁니다
    if (quotedOnly(line).includes(needle)) return;
    if (withoutQuoted(line).includes(needle)) hits.push({ line: i + 1, text: line.trim().slice(0, 70) });
  });
  return hits;
}

const raw = await readFile(target, "utf8");
const found = [];   // 증명된 것 — 반려
const check = [];   // 봐야 할 자리 — AI나 사람이 판단

// ── 공통 금칙어 ────────────────────────────────────────
for (const word of await bannedWords()) {
  for (const hit of locate(raw, word)) {
    found.push({ rule: "공통 금칙어", what: `"${word}"`, ...hit });
  }
}

// ── 기준 A — 공모전·보고서 ─────────────────────────────
if (kind === "A") {
  for (const mark of ["[입력 필요]", "[미확인]", "(※", "TBD", "OOO", "○○○"]) {
    for (const hit of locate(raw, mark)) {
      found.push({ rule: "A-1 미완성 표시", what: `"${mark}"`, ...hit });
    }
  }
  const future = /(산출|삽입|보완|확인|개선|구축|마련)(한다|할 것이다|할 예정|하겠다|하고자 한다)/g;
  raw.split("\n").forEach((line, i) => {
    for (const m of withoutQuoted(line).matchAll(future)) {
      found.push({ rule: "A-2 미래형 성과", what: `"${m[0]}"`, line: i + 1, text: line.trim().slice(0, 70) });
    }
  });
  check.push({ rule: "A-3 식별 가능 정보", ask: "학교명·교사명·지역이 본문에 있는지. 블라인드 심사면 그 한 줄로 제외된다" });
}

// ── 기준 B — 학생 활동지 ───────────────────────────────
if (kind === "B") {
  raw.split("\n").forEach((line, i) => {
    const t = withoutQuoted(line).trim();
    if (!/(요|세요|시오|보자|하자)[.?]?$/.test(t)) return;
    const sentences = t.split(/(?<=[.?!])\s+/).filter(Boolean).length;
    if (sentences > 2) {
      found.push({ rule: "B-1 지시문 2문장 초과", what: `${sentences}문장`, line: i + 1, text: t.slice(0, 70) });
    }
  });
  check.push({ rule: "B-2 정답이 보이는 선지", ask: "유독 길거나 혼자만 구체적인 선지가 있는지" });
  check.push({ rule: "B-3 한 문항 두 질문", ask: "한 문항에서 두 가지를 묻는 곳이 있는지 — 채점이 안 된다" });
  if (/정답|답안|해설/.test(raw)) {
    found.push({ rule: "정답지 분리", what: "학생용 파일에 '정답/답안/해설'이 보인다", line: locate(raw, "정답")[0]?.line ?? 0, text: "" });
  }
}

// ── 기준 C — 강의·연수 자료 ────────────────────────────
if (kind === "C") {
  if (!/\d+\s*분/.test(raw)) {
    found.push({ rule: "C-3 시간 배분 없음", what: "'○분' 표기가 한 번도 없다", line: 0, text: "" });
  }
  const orders = withoutQuoted(raw).match(/[가-힣]{2,}\s?(하세요|하십시오|해보세요|해봅시다|합시다)/g) ?? [];
  for (const order of new Set(orders)) {
    for (const hit of locate(raw, order)) {
      check.push({ rule: "말투 — 듣는 사람에게 명령", ask: `"${order}" → "이렇게 하면 됩니다" 쪽으로`, ...hit });
    }
  }
  check.push({ rule: "C-1 슬라이드 메시지 2개 이상", ask: "한 장에 말하려는 게 둘인 슬라이드가 있는지" });
  check.push({ rule: "C-2 바로 해볼 수 있는 것", ask: "꼭지마다 그 자리에서 따라 할 수 있는 게 하나는 있는지" });
}

// ── 결과 ───────────────────────────────────────────────
const verdict = found.length ? "반려" : "기계 검사 통과";
if (jsonOut) {
  console.log(JSON.stringify({ file: basename(target), kind: kind || "공통만", verdict, found, check }, null, 2));
  exit(found.length ? 1 : 0);
}

console.log(`\n${basename(target)} · 기준 ${kind || "(공통만)"}\n`);
if (found.length) {
  console.log(`❌ ${verdict} — 코드가 찾은 것 ${found.length}건\n`);
  for (const f of found) {
    console.log(`   ${f.rule}  ${f.what}`);
    if (f.line) console.log(`      ${f.line}번째 줄: ${f.text}`);
  }
} else {
  console.log(`✅ ${verdict} — 코드가 찾을 수 있는 건 걸리지 않았습니다`);
}
if (check.length) {
  console.log(`\n⚠️ 읽어봐야 하는 것 ${check.length}건 — 코드로는 판단할 수 없습니다\n`);
  for (const c of check) {
    console.log(`   ${c.rule}`);
    console.log(`      ${c.ask}${c.line ? ` (${c.line}번째 줄)` : ""}`);
  }
}
console.log(`\n이 결과가 AI의 판단보다 우선합니다. 여기서 걸리면 AI가 통과라고 해도 반려입니다.\n`);
exit(found.length ? 1 : 0);
