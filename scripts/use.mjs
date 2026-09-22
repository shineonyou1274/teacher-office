/**
 * 설정 바꿔 끼우기 — npm run use -- <이름>
 *
 *   npm run use              지금 무엇을 쓰고 있는지, 고를 수 있는 게 뭔지
 *   npm run use -- studio    examples/studio.config.ts 를 school.config.ts 로
 *   npm run use -- 되돌리기   직전 설정으로
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

const want = argv[2];

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
await copyFile(source, CONFIG);
console.log(`\n${bold("바꿨습니다")} — ${await describe(CONFIG)}`);
console.log(`   ${dim(`이전 것은 school.config.ts.bak 에 있습니다 (npm run use -- 되돌리기)`)}`);
console.log(`   ${dim("화면이 켜져 있으면 저장과 동시에 바뀝니다")}\n`);
