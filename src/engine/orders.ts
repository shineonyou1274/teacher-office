/**
 * 지시 보내기 — 화면에서 Claude Code 로 넘기는 통로
 *
 * 각본이 답할 수 있는 건 각본이 답합니다 (어디까지 됐어 / 막힌 데 있어).
 * 그 밖의 말은 일을 시키는 것이라, 여기서 받아 적어 Claude Code 가 꺼내 갑니다.
 *
 * npm run dev 로 연 화면에서만 됩니다. 빌드해서 올린 화면(GitHub Pages 등)에는
 * 받아 적을 데가 없어서, 그럴 때는 그렇다고 답합니다. 적히지도 않았는데
 * 적혔다고 말하지 않습니다.
 */
export type OrderResult =
  | { ok: true; waiting: number }
  | { ok: false; why: "여기서는안됨" | "실패" };

export async function sendOrder(text: string, teamId: string | null): Promise<OrderResult> {
  try {
    const res = await fetch("/__order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, teamId }),
    });
    if (res.status === 404 || res.status === 405) return { ok: false, why: "여기서는안됨" };
    if (!res.ok) return { ok: false, why: "실패" };
    const data = (await res.json()) as { ok?: boolean; waiting?: number };
    if (!data.ok) return { ok: false, why: "실패" };
    return { ok: true, waiting: data.waiting ?? 1 };
  } catch {
    // 빌드본을 그냥 열었을 때 (file:// 이거나 받아줄 서버가 없을 때)
    return { ok: false, why: "여기서는안됨" };
  }
}
