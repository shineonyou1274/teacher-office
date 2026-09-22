/**
 * 브라우저에서 들어온 지시 꺼내기 — npm run orders
 *
 *   npm run orders                  아직 안 한 지시를 보여줍니다
 *   npm run orders -- 전부          한 것까지 다 보여줍니다
 *   npm run orders -- 완료 <id> "<한 줄>"   그 지시를 끝낸 것으로 적습니다
 *
 * 화면(지시창)은 일을 못 합니다. 받아 적기까지가 화면 몫이고,
 * 실제로 하는 건 Claude Code 입니다. 이 파일이 둘 사이의 통로입니다.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { argv, exit } from "node:process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORDERS = join(ROOT, "public", "orders.json");

const bold = (s) => `\u001b[1m${s}\u001b[0m`;
const dim = (s) => `\u001b[2m${s}\u001b[0m`;

async function load() {
  try {
    const data = JSON.parse(await readFile(ORDERS, "utf8"));
    return Array.isArray(data.orders) ? data : { orders: [] };
  } catch {
    return { orders: [] };
  }
}

const when = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const args = argv.slice(2);
const data = await load();

if (args[0] === "완료" || args[0] === "done") {
  const id = args[1];
  const note = args.slice(2).join(" ").trim();
  const order = data.orders.find((o) => o.id === id);
  if (!order) {
    console.error(`\n"${id}" 라는 지시가 없습니다. npm run orders 로 id를 확인해 주세요.\n`);
    exit(2);
  }
  order.done = true;
  order.result = note || null;
  order.doneAt = new Date().toISOString();
  await writeFile(ORDERS, JSON.stringify(data, null, 2), "utf8");
  console.log(`\n끝낸 것으로 적었습니다 — ${order.text}${note ? `\n   ${note}` : ""}\n`);
  exit(0);
}

const all = args[0] === "전부" || args[0] === "all";
const list = all ? data.orders : data.orders.filter((o) => !o.done);

if (!list.length) {
  console.log(`\n${data.orders.length ? "안 한 지시가 없습니다." : "들어온 지시가 없습니다."}`);
  console.log(dim("   화면(npm run dev)의 지시창에 일을 적으시면 여기로 넘어옵니다.\n"));
  exit(0);
}

console.log(`\n${bold(`지시 ${list.length}건`)}\n`);
for (const o of list) {
  const mark = o.done ? "✔" : "·";
  console.log(`  ${mark} ${dim(o.id)}  ${when(o.at)}  ${o.text}`);
  if (o.teamId) console.log(dim(`       팀: ${o.teamId}`));
  if (o.result) console.log(dim(`       결과: ${o.result}`));
}
console.log(dim(`\n  끝내고 나서:  npm run orders -- 완료 <id> "<한 줄>"`));
console.log(dim(`  그 팀 상태도 같이:  npm run record <팀id> 마침 "<한 줄>"\n`));
