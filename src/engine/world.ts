/**
 * 교무실 지도 — 타일 격자
 *
 * 학교 구조를 따릅니다. 가로 복도 2개를 두고 그 위아래로 교실이 늘어섭니다.
 * (기업식 4×3 그리드가 아니라, 복도를 지나 교실로 들어가는 동선입니다)
 *
 *   ┌ 교무실 ─ 승인 회의실 ─ 교사 휴게실 ┐   ← 윗층
 *   ├──────── 복 도 ────────┤
 *   │ 부서 1  2  3  4  5  6 │            ← 1층
 *   ├──────── 복 도 ────────┤
 *   │ 부서 7  8  9 10 11 12 │            ← 2층
 *   └────────── 출입구 ──────┘
 */
import { DEPARTMENTS } from "../../school.config";

export const TILE_PX = 16;
export const MAP_COLS = 68;
export const MAP_ROWS = 48;
export const MAP_PX_W = MAP_COLS * TILE_PX;
export const MAP_PX_H = MAP_ROWS * TILE_PX;

export type Cell = { x: number; y: number };
export type SpaceUse = "dept" | "teacher" | "meeting" | "lounge";

export type Desk = { x: number; y: number; chair: Cell };

export type Space = {
  id: string;
  name: string;
  short: string;
  icon: string;
  kind: SpaceUse;
  x: number; y: number; w: number; h: number;
  /** 복도로 통하는 문 */
  doors: Cell[];
  desks: Desk[];
  /** 방 안에서 서성일 수 있는 자리 */
  standSpots: Cell[];
};

// ── 배치 상수 ──────────────────────────────────────────
const TOP_Y = 2, TOP_H = 11;         // 윗층 (교무실·회의실·휴게실)
const FLOOR1_Y = 17, FLOOR2_Y = 33;  // 교실 두 줄
const TEAM_W = 10, TEAM_H = 12;
const TEAM_GAP = 1;
const TEAM_X0 = 1;

/** i번째 부서 방 (0~11) — 앞 6개는 1층, 뒤 6개는 2층 */
function teamSpace(index: number): Space {
  const meta = DEPARTMENTS[index];
  const col = index % 6;
  const x = TEAM_X0 + col * (TEAM_W + TEAM_GAP);
  const upper = index < 6;
  const y = upper ? FLOOR1_Y : FLOOR2_Y;

  // 책상 3개를 가로로
  const desks: Desk[] = [1, 4, 7].map((dx) => ({
    x: x + dx,
    y: y + 5,
    chair: { x: x + dx + 1, y: y + 6 },
  }));

  // 문은 복도 쪽 벽에 낸다 — 1층은 위쪽, 2층은 아래쪽이 복도
  const doorY = upper ? y : y + TEAM_H - 1;
  return {
    id: meta.id, name: meta.name, short: meta.short, icon: meta.icon,
    kind: "dept",
    x, y, w: TEAM_W, h: TEAM_H,
    doors: [{ x: x + 4, y: doorY }, { x: x + 5, y: doorY }],
    desks,
    standSpots: [
      { x: x + 2, y: y + 9 },
      { x: x + 5, y: y + 9 },
      { x: x + 8, y: y + 3 },
    ],
  };
}

export const TEACHER_SPACE: Space = {
  id: "teacher", name: "교무실", short: "teacher.desk", icon: "🍎",
  kind: "teacher",
  x: 1, y: TOP_Y, w: 19, h: TOP_H,
  doors: [{ x: 9, y: TOP_Y + TOP_H - 1 }, { x: 10, y: TOP_Y + TOP_H - 1 }],
  desks: [{ x: 8, y: 5, chair: { x: 9, y: 4 } }],
  standSpots: [{ x: 5, y: 9 }, { x: 10, y: 9 }, { x: 15, y: 8 }],
};

export const MEETING_SPACE: Space = {
  id: "meeting", name: "협의회실", short: "meeting.space", icon: "🗣️",
  kind: "meeting",
  x: 22, y: TOP_Y, w: 24, h: TOP_H,
  doors: [{ x: 33, y: TOP_Y + TOP_H - 1 }, { x: 34, y: TOP_Y + TOP_H - 1 }],
  desks: [],
  standSpots: [{ x: 25, y: 9 }, { x: 43, y: 9 }],
};

export const LOUNGE_SPACE: Space = {
  id: "lounge", name: "교사 휴게실", short: "lounge", icon: "☕",
  kind: "lounge",
  x: 48, y: TOP_Y, w: 19, h: TOP_H,
  doors: [{ x: 56, y: TOP_Y + TOP_H - 1 }, { x: 57, y: TOP_Y + TOP_H - 1 }],
  desks: [],
  standSpots: [{ x: 52, y: 6 }, { x: 55, y: 6 }, { x: 58, y: 8 }, { x: 62, y: 9 }],
};

/** 협의회 좌석 (책상 위아래 4+4) */
export const MEETING_CHAIRS: Cell[] = [
  { x: 28, y: 5 }, { x: 31, y: 5 }, { x: 34, y: 5 }, { x: 37, y: 5 },
  { x: 28, y: 9 }, { x: 31, y: 9 }, { x: 34, y: 9 }, { x: 37, y: 9 },
];

/** 선생님 자리 · 보고하러 서는 자리 · 출입구 */
export const TEACHER_CHAIR: Cell = { x: 9, y: 4 };
export const BRIEFING_SPOT: Cell = { x: 9, y: 8 };
export const FRONT_DOOR: Cell = { x: 33, y: MAP_ROWS - 1 };

export const TEAM_SPACES: Space[] = DEPARTMENTS.map((_, i) => teamSpace(i));
export const SPACES: Space[] = [TEACHER_SPACE, MEETING_SPACE, LOUNGE_SPACE, ...TEAM_SPACES];

// ── 가구 ───────────────────────────────────────────────
export type Furniture = {
  kind: "desk" | "monitor" | "table" | "sofa" | "coffee" | "plant" | "shelf"
      | "board" | "teacher-desk" | "rug" | "locker";
  x: number; y: number; w: number; h: number; label?: string;
};

export const FURNITURE: Furniture[] = [];

/**
 * 교실 한 칸의 가구 배치.
 * 실제 교실처럼 — 문이 난 벽에는 사물함과 게시판, 맞은편 벽에는 책장과 화분.
 * 문 앞 두 칸(x+4, x+5)은 반드시 비워 둔다. 막으면 아무도 못 들어온다.
 */
for (const space of TEAM_SPACES) {
  for (const desk of space.desks) {
    FURNITURE.push({ kind: "desk", x: desk.x, y: desk.y, w: 2, h: 1 });
    FURNITURE.push({ kind: "monitor", x: desk.x, y: desk.y, w: 1, h: 1 });
  }
  const doorWall = space.doors[0].y === space.y ? space.y + 1 : space.y + TEAM_H - 2;
  const backWall = space.doors[0].y === space.y ? space.y + TEAM_H - 2 : space.y + 1;
  FURNITURE.push({ kind: "locker", x: space.x + 1, y: doorWall, w: 3, h: 1 });
  FURNITURE.push({ kind: "board",  x: space.x + 6, y: doorWall, w: 3, h: 1 });
  FURNITURE.push({ kind: "shelf",  x: space.x + 1, y: backWall, w: 2, h: 1 });
  FURNITURE.push({ kind: "plant",  x: space.x + 8, y: backWall, w: 1, h: 1 });
}

// 교무실 — 선생님 책상은 방 한가운데, 뒤로 사물함, 문 쪽에 응접 러그
FURNITURE.push({ kind: "teacher-desk", x: 7, y: 5, w: 5, h: 2 });
FURNITURE.push({ kind: "rug",    x: 6,  y: 8,  w: 8, h: 2 });
FURNITURE.push({ kind: "locker", x: 2,  y: 3,  w: 3, h: 1 });
FURNITURE.push({ kind: "shelf",  x: 15, y: 3,  w: 3, h: 1 });
FURNITURE.push({ kind: "plant",  x: 2,  y: 10, w: 1, h: 1 });
FURNITURE.push({ kind: "plant",  x: 18, y: 10, w: 1, h: 1 });

// 협의회실 — 긴 탁자 하나, 양쪽 벽에 게시판
FURNITURE.push({ kind: "table", x: 28, y: 6,  w: 12, h: 3 });
FURNITURE.push({ kind: "board", x: 24, y: 3,  w: 4,  h: 1, label: "오늘의 안" });
FURNITURE.push({ kind: "board", x: 40, y: 3,  w: 4,  h: 1 });
FURNITURE.push({ kind: "shelf", x: 24, y: 10, w: 3,  h: 1 });
FURNITURE.push({ kind: "plant", x: 44, y: 10, w: 1,  h: 1 });

// 휴게실 — 소파와 탁자를 마주 놓고, 커피는 문에서 먼 안쪽에
FURNITURE.push({ kind: "sofa",   x: 50, y: 4,  w: 5, h: 1 });
FURNITURE.push({ kind: "table",  x: 51, y: 7,  w: 3, h: 2 });
FURNITURE.push({ kind: "coffee", x: 63, y: 3,  w: 2, h: 1, label: "☕" });
FURNITURE.push({ kind: "shelf",  x: 59, y: 3,  w: 3, h: 1 });
FURNITURE.push({ kind: "plant",  x: 50, y: 10, w: 1, h: 1 });
FURNITURE.push({ kind: "plant",  x: 65, y: 9,  w: 1, h: 1 });

// ── 통행 가능 격자 ──────────────────────────────────────
function blockMap(): Uint8Array {
  const grid = new Uint8Array(MAP_COLS * MAP_ROWS); // 0 = 통행 가능
  const block = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return;
    grid[y * MAP_COLS + x] = 1;
  };

  // 바깥 벽
  for (let x = 0; x < MAP_COLS; x += 1) { block(x, 0); block(x, MAP_ROWS - 1); }
  for (let y = 0; y < MAP_ROWS; y += 1) { block(0, y); block(MAP_COLS - 1, y); }

  // 교실 벽
  for (const space of SPACES) {
    for (let x = space.x; x < space.x + space.w; x += 1) {
      block(x, space.y); block(x, space.y + space.h - 1);
    }
    for (let y = space.y; y < space.y + space.h; y += 1) {
      block(space.x, y); block(space.x + space.w - 1, y);
    }
  }

  // 가구 (러그는 밟을 수 있음)
  for (const item of FURNITURE) {
    if (item.kind === "rug") continue;
    for (let y = item.y; y < item.y + item.h; y += 1) {
      for (let x = item.x; x < item.x + item.w; x += 1) block(x, y);
    }
  }

  // 문 뚫기
  for (const space of SPACES) {
    for (const door of space.doors) grid[door.y * MAP_COLS + door.x] = 0;
  }
  // 출입구
  grid[FRONT_DOOR.y * MAP_COLS + FRONT_DOOR.x] = 0;
  grid[FRONT_DOOR.y * MAP_COLS + FRONT_DOOR.x + 1] = 0;

  return grid;
}

export const BLOCKED_TILES = blockMap();

export function canStand(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return false;
  return BLOCKED_TILES[y * MAP_COLS + x] === 0;
}

export function spaceOf(id: string): Space {
  const space = SPACES.find((r) => r.id === id);
  if (!space) throw new Error(`모르는 방입니다: ${id}`);
  return space;
}

/** 방 안쪽에서 문 바로 앞 타일 */
export function insideDoor(space: Space): Cell {
  const door = space.doors[0];
  return door.y === space.y ? { x: door.x, y: door.y + 1 } : { x: door.x, y: door.y - 1 };
}
