import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ORDERS = join(process.cwd(), "public", "orders.json");

/**
 * 지시 받아 적기 — npm run dev 로 연 화면에서만 돕니다.
 *
 * 화면의 지시창은 원래 각본만 읽었습니다. 여기서 받아 public/orders.json 에
 * 적어두면, Claude Code 에서 /지시받기 로 꺼내 실제로 일할 수 있습니다.
 * 이 파일이 브라우저와 Claude Code 사이의 유일한 통로입니다.
 *
 * 주소는 /__order 로 영문입니다. 한글 주소는 브라우저가 퍼센트 인코딩해서
 * 보내는 바람에 여기서 안 잡힙니다.
 */
function 지시받기(): Plugin {
  return {
    name: "teacher-office-orders",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__order", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end();
        }
        let body = "";
        req.on("data", (c) => { body += c; });
        req.on("end", async () => {
          try {
            const { text, teamId } = JSON.parse(body || "{}");
            const line = String(text ?? "").trim();
            if (!line) throw new Error("빈 지시");

            let data: { orders: unknown[] } = { orders: [] };
            try { data = JSON.parse(await readFile(ORDERS, "utf8")); } catch { /* 첫 지시 */ }
            if (!Array.isArray(data.orders)) data.orders = [];

            const order = {
              id: `o${Date.now().toString(36)}`,
              at: new Date().toISOString(),
              text: line,
              teamId: teamId ?? null,
              done: false,
              result: null,
            };
            data.orders.unshift(order);
            data.orders = data.orders.slice(0, 100);

            await mkdir(join(process.cwd(), "public"), { recursive: true });
            await writeFile(ORDERS, JSON.stringify(data, null, 2), "utf8");
            console.log(`\n📋 선생님 지시 — ${line}${teamId ? ` (${teamId})` : ""}`);
            console.log(`   Claude Code 에서 /지시받기 를 치시면 꺼내 갑니다.\n`);

            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true, id: order.id, waiting: data.orders.filter((o: any) => !o.done).length }));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, why: String(e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), 지시받기()],
  // GitHub Pages 등 하위 경로에 올릴 때만 바꾸세요 (예: "/teacher-office/")
  base: "./",
  server: { port: 5180, open: false },
});
