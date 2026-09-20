/**
 * A* 길찾기 — 격자 위 최단 경로.
 *
 * 상하좌우 4방향만 씁니다. 대각선을 빼면 모서리를 뚫고 지나가는 문제가 없고,
 * 교실·복도 구조에서는 오히려 동선이 자연스럽습니다.
 */
import { COLS, ROWS, walkable, type Pt } from "./world";

const idx = (x: number, y: number) => y * COLS + x;
/** |dx| + |dy| — 4방향 격자에서 정확한 하한이라 A*가 최단을 보장합니다 */
const heuristic = (ax: number, ay: number, bx: number, by: number) =>
  Math.abs(ax - bx) + Math.abs(ay - by);

/**
 * @param blocked 다른 직원이 서 있어 비켜가야 할 칸 (목적지는 제외됨)
 * @returns start 다음 칸부터 goal 까지. 길이 없으면 null
 */
export function findPath(start: Pt, goal: Pt, blocked?: Set<number>): Pt[] | null {
  if (start.x === goal.x && start.y === goal.y) return [];
  if (!walkable(goal.x, goal.y)) return null;

  const size = COLS * ROWS;
  const goalIdx = idx(goal.x, goal.y);
  const cameFrom = new Int32Array(size).fill(-1);
  const gScore = new Float64Array(size).fill(Infinity);
  const closed = new Uint8Array(size);

  const startIdx = idx(start.x, start.y);
  gScore[startIdx] = 0;

  // 작은 지도라 배열 기반 우선순위 큐로 충분합니다
  const open: { i: number; f: number }[] = [
    { i: startIdx, f: heuristic(start.x, start.y, goal.x, goal.y) },
  ];

  while (open.length) {
    let best = 0;
    for (let k = 1; k < open.length; k += 1) if (open[k].f < open[best].f) best = k;
    const current = open.splice(best, 1)[0].i;
    if (current === goalIdx) break;
    if (closed[current]) continue;
    closed[current] = 1;

    const cx = current % COLS;
    const cy = (current - cx) / COLS;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (!walkable(nx, ny)) continue;

      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      // 사람이 서 있는 칸은 돌아간다. 단 목적지면 그대로 간다
      if (blocked && blocked.has(ni) && ni !== goalIdx) continue;

      const tentative = gScore[current] + 1;
      if (tentative >= gScore[ni]) continue;

      cameFrom[ni] = current;
      gScore[ni] = tentative;
      open.push({ i: ni, f: tentative + heuristic(nx, ny, goal.x, goal.y) });
    }
  }

  if (cameFrom[goalIdx] === -1 && goalIdx !== startIdx) return null;

  const path: Pt[] = [];
  let node = goalIdx;
  while (node !== startIdx && node !== -1) {
    path.push({ x: node % COLS, y: Math.floor(node / COLS) });
    node = cameFrom[node];
  }
  if (node === -1) return null;
  return path.reverse();
}
