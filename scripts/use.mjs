/**
 * 설정 바꿔 끼우기 — npm run use -- <이름>
 *
 *   npm run use              지금 무엇을 쓰고 있는지, 고를 수 있는 게 뭔지
 *   npm run use -- studio    examples/studio.config.ts 를 school.config.ts 로
 *   npm run use -- 되돌리기   직전 설정으로
 *
 * 바꿔 낄 때 이름표(학교·이름·호칭·과목)는 지금 쓰던 것을 그대로 가져옵니다.
 * npm run setup 으로 적은 것을 남의 예시 이름으로 덮으면 안 되니까요.
 * 예시의 이름표까지 통째로 쓰려면 뒤에 --통째로 를 붙이세요.
 *
 * 쓰면서 고치려면 설정을 자주 바꿔 끼우게 됩니다. 그때마다 복사 명령을
 * 외우지 않아도 되게 한 줄로 만들었습니다.
 * 바꾸기 전 것은 school.config.ts.bak 으로 남습니다.
 */
import { readdir, readFile, writeFile, copyFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { argv, exit } from "node:process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(ROOT, "school.config.ts");
const BACKUP = CONFIG + ".bak";
const EXAMPLES = join(ROOT, "examples");

const bold = (s) => `\u001b[1m${s}\u001b[0m`;
const dim = (s) => `\u001b[2m${s}\u001b[0m`;

/** 설정 파일에서 학교명과 부서 수를 읽어 한 줄로 */
async function describe(path) {
  try {
    const text = await readFile(path, "utf8");
    const name = text.match(/name:\s*"([^"]*)"/)?.[1] ?? "?";
    const teams = [...text.matchAll(/\{ id: "\w+"/g)].length;
    return `${name} · 부서 ${teams}개`;
  } catch {
    return "(읽을 수 없음)";
  }
}

async function listExamples() {
  try {
    return (await readdir(EXAMPLES)).filter((f) => f.endsWith(".config.ts"));
  } catch {
    return [];
  }
}

/** 설정 글에서 export const <이름> = { ... }; 한 덩어리를 떼어냅니다 */
function block(text, name) {
  const start = text.indexOf(`export const ${name} = {`);
  if (start < 0) return null;
  const end = text.indexOf("\n};", start);
  return end < 0 ? null : { start, end: end + 3, text: text.slice(start, end + 3) };
}

/** 덩어리 안에서 field: "값" 의 값만 바꿉니다 */
function setField(blockText, field, value) {
  const re = new RegExp(`(${field}:\\s*")([^"]*)(")`);
  return re.test(blockText) ? blockText.replace(re, `$1${value}$3`) : blockText;
}
function getField(blockText, field) {
  return blockText.match(new RegExp(`${field}:\\s*"([^"]*)"`))?.[1] ?? null;
}

/**
 * 지금 쓰던 이름표를 새 설정으로 옮깁니다.
 * 옮기는 건 학교 이름·배지·내 이름·호칭·과목 다섯 개뿐입니다.
 * 제목이나 부제는 그 설정이 무엇을 하는 곳인지를 적은 것이라 그대로 둡니다.
 */
/** 아직 아무도 안 고친 기본값인지 — 그걸 "쓰시던 이름표"라고 부르면 안 됩니다 */
function looksUnset(value) {
  return !value || /^○|^김선생$|적으세요|^校$/.test(value.trim());
}

function carryNameplate(fromText, toText) {
  const moved = [];
  let out = toText;
  const src0 = block(fromText, "SCHOOL");
  const src1 = block(fromText, "TEACHER");
  const unset =
    looksUnset(src0 && getField(src0.text, "name")) &&
    looksUnset(src1 && getField(src1.text, "name"));
  // 설치 인터뷰를 아직 안 하신 것입니다. 기본값을 옮겨봐야 기본값입니다
  if (unset) return { text: toText, moved: [], unset: true };
  for (const [name, fields] of [["SCHOOL", ["name", "badge"]], ["TEACHER", ["name", "callsign", "subject"]]]) {
    const src = block(fromText, name);
    const dst = block(out, name);
    if (!src || !dst) continue;
    let patched = dst.text;
    for (const f of fields) {
      const v = getField(src.text, f);
      if (v === null) continue;
      if (getField(patched, f) === v) continue;
      patched = setField(patched, f, v);
      moved.push(`${name}.${f} = "${v}"`);
    }
    out = out.slice(0, dst.start) + patched + out.slice(dst.end);
  }
  return { text: out, moved, unset: false };
}

const args = argv.slice(2);
const whole = args.includes("--통째로");
const want = args.find((a) => !a.startsWith("--"));

if (!want) {
  console.log(`\n${bold("지금 쓰는 설정")}\n   ${await describe(CONFIG)}\n`);
  const files = await listExamples();
  if (files.length) {
    console.log(bold("바꿔 낄 수 있는 것"));
    for (const f of files) {
      const short = f.replace(/\.config\.ts$/, "");
      console.log(`   ${short.padEnd(12)} ${dim(await describe(join(EXAMPLES, f)))}`);
    }
    console.log(`\n   ${dim("npm run use -- <이름>")}`);
  }
  try {
    await access(BACKUP);
    console.log(`\n   ${dim("npm run use -- 되돌리기")}   직전 설정으로 (${await describe(BACKUP)})`);
  } catch { /* 백업이 없으면 안내하지 않는다 */ }
  console.log("");
  exit(0);
}

if (want === "되돌리기" || want === "undo") {
  try {
    await access(BACKUP);
  } catch {
    console.error("\n되돌릴 게 없습니다. school.config.ts.bak 이 없어요.\n");
    exit(1);
  }
  // 되돌린 뒤에도 다시 되돌릴 수 있게 서로 맞바꿉니다
  const [now, before] = await Promise.all([readFile(CONFIG, "utf8"), readFile(BACKUP, "utf8")]);
  await writeFile(CONFIG, before, "utf8");
  await writeFile(BACKUP, now, "utf8");
  console.log(`\n되돌렸습니다 — ${await describe(CONFIG)}`);
  console.log(`   ${dim("한 번 더 치면 다시 돌아갑니다")}\n`);
  exit(0);
}

const file = want.endsWith(".config.ts") ? want : `${want}.config.ts`;
const source = join(EXAMPLES, file);
try {
  await access(source);
} catch {
  const files = await listExamples();
  console.error(`\n"${want}" 라는 설정이 없습니다.`);
  console.error(`고를 수 있는 것: ${files.map((f) => f.replace(/\.config\.ts$/, "")).join(", ") || "(examples 폴더가 비어 있음)"}\n`);
  exit(1);
}

await copyFile(CONFIG, BACKUP);
const [current, incoming] = await Promise.all([readFile(CONFIG, "utf8"), readFile(source, "utf8")]);
const { text, moved, unset } = whole
  ? { text: incoming, moved: [], unset: false }
  : carryNameplate(current, incoming);
await writeFile(CONFIG, text, "utf8");

console.log(`\n${bold("바꿨습니다")} — ${await describe(CONFIG)}`);
if (unset) {
  console.log(`\n   ${bold("이름표는 아직 기본값입니다.")} 화면에 "○○고등학교 / 김선생" 으로 뜹니다.`);
  console.log(`   ${dim("npm run setup 을 하시면 학교 이름과 성함이 들어갑니다.")}`);
  console.log(`   ${dim("지금 설정(팀·하루 순서)은 그대로 두고 이름표만 바뀝니다.")}`);
} else if (moved.length) {
  console.log(`   ${dim("쓰시던 이름표는 그대로 옮겼습니다:")}`);
  for (const line of moved) console.log(`   ${dim("  " + line)}`);
  console.log(`   ${dim("예시의 이름표까지 쓰시려면: npm run use -- " + want + " --통째로")}`);
}
console.log(`   ${dim(`이전 것은 school.config.ts.bak 에 있습니다 (npm run use -- 되돌리기)`)}`);
console.log(`   ${dim("화면이 켜져 있으면 저장과 동시에 바뀝니다")}\n`);
