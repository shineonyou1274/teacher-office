/**
 * A* 길찾기 — 격자 위 최단 경로.
 *
 * 상하좌우 4방향만 씁니다. 대각선을 빼면 모서리를 뚫고 지나가는 문제가 없고,
 * 교실·복도 구조에서는 오히려 동선이 자연스럽습니다.
 */
import { MAP_COLS, MAP_ROWS, canStand, type Cell } from "./world";

const idx = (x: number, y: number) => y * MAP_COLS + x;
/** |dx| + |dy| — 4방향 격자에서 정확한 하한이라 A*가 최단을 보장합니다 */
const manhattan = (ax: number, ay: number, bx: number, by: number) =>
  Math.abs(ax - bx) + Math.abs(ay - by);

/**
 * @param blocked 다른 직원이 서 있어 비켜가야 할 칸 (목적지는 제외됨)
 * @returns start 다음 칸부터 goal 까지. 길이 없으면 null
 */
export function findRoute(start: Cell, goal: Cell, blocked?: Set<number>): Cell[] | null {
  if (start.x === goal.x && start.y === goal.y) return [];
  if (!canStand(goal.x, goal.y)) return null;

  const size = MAP_COLS * MAP_ROWS;
  const target = idx(goal.x, goal.y);
  const prev = new Int32Array(size).fill(-1);
  const cost = new Float64Array(size).fill(Infinity);
  const settled = new Uint8Array(size);

  const origin = idx(start.x, start.y);
  cost[origin] = 0;

  // 작은 지도라 배열 기반 우선순위 큐로 충분합니다
  const frontier: { i: number; f: number }[] = [
    { i: origin, f: manhattan(start.x, start.y, goal.x, goal.y) },
  ];

  while (frontier.length) {
    let best = 0;
    for (let k = 1; k < frontier.length; k += 1) if (frontier[k].f < frontier[best].f) best = k;
    const here = frontier.splice(best, 1)[0].i;
    if (here === target) break;
    if (settled[here]) continue;
    settled[here] = 1;

    const hx = here % MAP_COLS;
    const hy = (here - hx) / MAP_COLS;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = hx + dx, ny = hy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_COLS || ny >= MAP_ROWS) continue;
      if (!canStand(nx, ny)) continue;

      const ni = idx(nx, ny);
      if (settled[ni]) continue;
      // 사람이 서 있는 칸은 돌아간다. 단 목적지면 그대로 간다
      if (blocked && blocked.has(ni) && ni !== target) continue;

      const stepCost = cost[here] + 1;
      if (stepCost >= cost[ni]) continue;

      prev[ni] = here;
      cost[ni] = stepCost;
      frontier.push({ i: ni, f: stepCost + manhattan(nx, ny, goal.x, goal.y) });
    }
  }

  if (prev[target] === -1 && target !== origin) return null;

  const path: Cell[] = [];
  let node = target;
  while (node !== origin && node !== -1) {
    path.push({ x: node % MAP_COLS, y: Math.floor(node / MAP_COLS) });
    node = prev[node];
  }
  if (node === -1) return null;
  return path.reverse();
}
