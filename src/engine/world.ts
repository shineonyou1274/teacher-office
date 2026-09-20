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

export const TILE = 16;
export const COLS = 68;
export const ROWS = 48;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

export type Pt = { x: number; y: number };
export type RoomKind = "dept" | "teacher" | "meeting" | "lounge";

export type Desk = { deskX: number; deskY: number; seat: Pt };

export type Room = {
  id: string;
  name: string;
  short: string;
  icon: string;
  kind: RoomKind;
  x: number; y: number; w: number; h: number;
  /** 복도로 통하는 문 */
  doors: Pt[];
  desks: Desk[];
  /** 방 안에서 서성일 수 있는 자리 */
  loiter: Pt[];
};

// ── 배치 상수 ──────────────────────────────────────────
const TOP_Y = 2, TOP_H = 11;         // 윗층 (교무실·회의실·휴게실)
const FLOOR1_Y = 17, FLOOR2_Y = 33;  // 교실 두 줄
const DEPT_W = 10, DEPT_H = 12;
const DEPT_GAP = 1;
const DEPT_X0 = 1;

/** i번째 부서 방 (0~11) — 앞 6개는 1층, 뒤 6개는 2층 */
function deptRoom(index: number): Room {
  const meta = DEPARTMENTS[index];
  const col = index % 6;
  const x = DEPT_X0 + col * (DEPT_W + DEPT_GAP);
  const upper = index < 6;
  const y = upper ? FLOOR1_Y : FLOOR2_Y;

  // 책상 3개를 가로로
  const desks: Desk[] = [1, 4, 7].map((dx) => ({
    deskX: x + dx,
    deskY: y + 5,
    seat: { x: x + dx + 1, y: y + 6 },
  }));

  // 문은 복도 쪽 벽에 낸다 — 1층은 위쪽, 2층은 아래쪽이 복도
  const doorY = upper ? y : y + DEPT_H - 1;
  return {
    id: meta.id, name: meta.name, short: meta.short, icon: meta.icon,
    kind: "dept",
    x, y, w: DEPT_W, h: DEPT_H,
    doors: [{ x: x + 4, y: doorY }, { x: x + 5, y: doorY }],
    desks,
    loiter: [
      { x: x + 2, y: y + 9 },
      { x: x + 5, y: y + 9 },
      { x: x + 8, y: y + 3 },
    ],
  };
}

export const TEACHER_ROOM: Room = {
  id: "teacher", name: "교무실", short: "teacher.desk", icon: "🍎",
  kind: "teacher",
  x: 1, y: TOP_Y, w: 19, h: TOP_H,
  doors: [{ x: 9, y: TOP_Y + TOP_H - 1 }, { x: 10, y: TOP_Y + TOP_H - 1 }],
  desks: [{ deskX: 8, deskY: 5, seat: { x: 9, y: 4 } }],
  loiter: [{ x: 5, y: 9 }, { x: 10, y: 9 }, { x: 15, y: 8 }],
};

export const MEETING_ROOM: Room = {
  id: "meeting", name: "협의회실", short: "meeting.room", icon: "🗣️",
  kind: "meeting",
  x: 22, y: TOP_Y, w: 24, h: TOP_H,
  doors: [{ x: 33, y: TOP_Y + TOP_H - 1 }, { x: 34, y: TOP_Y + TOP_H - 1 }],
  desks: [],
  loiter: [{ x: 25, y: 9 }, { x: 43, y: 9 }],
};

export const LOUNGE_ROOM: Room = {
  id: "lounge", name: "교사 휴게실", short: "lounge", icon: "☕",
  kind: "lounge",
  x: 48, y: TOP_Y, w: 19, h: TOP_H,
  doors: [{ x: 56, y: TOP_Y + TOP_H - 1 }, { x: 57, y: TOP_Y + TOP_H - 1 }],
  desks: [],
  loiter: [{ x: 52, y: 6 }, { x: 55, y: 6 }, { x: 58, y: 8 }, { x: 62, y: 9 }],
};

/** 협의회 좌석 (책상 위아래 4+4) */
export const MEETING_SEATS: Pt[] = [
  { x: 28, y: 5 }, { x: 31, y: 5 }, { x: 34, y: 5 }, { x: 37, y: 5 },
  { x: 28, y: 9 }, { x: 31, y: 9 }, { x: 34, y: 9 }, { x: 37, y: 9 },
];

/** 선생님 자리 · 보고하러 서는 자리 · 출입구 */
export const TEACHER_SEAT: Pt = { x: 9, y: 4 };
export const REPORT_SPOT: Pt = { x: 9, y: 8 };
export const ENTRANCE: Pt = { x: 33, y: ROWS - 1 };

export const DEPT_ROOMS: Room[] = DEPARTMENTS.map((_, i) => deptRoom(i));
export const ROOMS: Room[] = [TEACHER_ROOM, MEETING_ROOM, LOUNGE_ROOM, ...DEPT_ROOMS];

// ── 가구 ───────────────────────────────────────────────
export type Prop = {
  kind: "desk" | "monitor" | "table" | "sofa" | "coffee" | "plant" | "shelf"
      | "board" | "teacher-desk" | "rug" | "locker";
  x: number; y: number; w: number; h: number; label?: string;
};

export const PROPS: Prop[] = [];

for (const room of DEPT_ROOMS) {
  for (const desk of room.desks) {
    PROPS.push({ kind: "desk", x: desk.deskX, y: desk.deskY, w: 2, h: 1 });
    PROPS.push({ kind: "monitor", x: desk.deskX, y: desk.deskY, w: 1, h: 1 });
  }
  PROPS.push({ kind: "shelf", x: room.x + 1, y: room.y + 1, w: 3, h: 1 });
  PROPS.push({ kind: "board", x: room.x + 6, y: room.y + 1, w: 3, h: 1 });
  PROPS.push({ kind: "plant", x: room.x + DEPT_W - 2, y: room.y + DEPT_H - 3, w: 1, h: 1 });
}

// 교무실
PROPS.push({ kind: "teacher-desk", x: 7, y: 5, w: 5, h: 2 });
PROPS.push({ kind: "rug", x: 6, y: 8, w: 8, h: 2 });
PROPS.push({ kind: "shelf", x: 2, y: 3, w: 3, h: 1 });
PROPS.push({ kind: "locker", x: 16, y: 3, w: 2, h: 1 });
PROPS.push({ kind: "plant", x: 17, y: 9, w: 1, h: 1 });

// 협의회실
PROPS.push({ kind: "table", x: 28, y: 6, w: 12, h: 3 });
PROPS.push({ kind: "board", x: 25, y: 3, w: 6, h: 1, label: "TOP 3" });
PROPS.push({ kind: "board", x: 38, y: 3, w: 5, h: 1 });
PROPS.push({ kind: "plant", x: 44, y: 10, w: 1, h: 1 });

// 휴게실
PROPS.push({ kind: "sofa", x: 51, y: 5, w: 5, h: 1 });
PROPS.push({ kind: "table", x: 57, y: 7, w: 3, h: 2 });
PROPS.push({ kind: "coffee", x: 62, y: 4, w: 2, h: 1, label: "☕" });
PROPS.push({ kind: "plant", x: 65, y: 10, w: 1, h: 1 });

// ── 통행 가능 격자 ──────────────────────────────────────
function buildGrid(): Uint8Array {
  const grid = new Uint8Array(COLS * ROWS); // 0 = 통행 가능
  const block = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    grid[y * COLS + x] = 1;
  };

  // 바깥 벽
  for (let x = 0; x < COLS; x += 1) { block(x, 0); block(x, ROWS - 1); }
  for (let y = 0; y < ROWS; y += 1) { block(0, y); block(COLS - 1, y); }

  // 교실 벽
  for (const room of ROOMS) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      block(x, room.y); block(x, room.y + room.h - 1);
    }
    for (let y = room.y; y < room.y + room.h; y += 1) {
      block(room.x, y); block(room.x + room.w - 1, y);
    }
  }

  // 가구 (러그는 밟을 수 있음)
  for (const prop of PROPS) {
    if (prop.kind === "rug") continue;
    for (let y = prop.y; y < prop.y + prop.h; y += 1) {
      for (let x = prop.x; x < prop.x + prop.w; x += 1) block(x, y);
    }
  }

  // 문 뚫기
  for (const room of ROOMS) {
    for (const door of room.doors) grid[door.y * COLS + door.x] = 0;
  }
  // 출입구
  grid[ENTRANCE.y * COLS + ENTRANCE.x] = 0;
  grid[ENTRANCE.y * COLS + ENTRANCE.x + 1] = 0;

  return grid;
}

export const GRID = buildGrid();

export function walkable(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  return GRID[y * COLS + x] === 0;
}

export function roomOf(id: string): Room {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`모르는 방입니다: ${id}`);
  return room;
}

/** 방 안쪽에서 문 바로 앞 타일 */
export function doorApproach(room: Room): Pt {
  const door = room.doors[0];
  return door.y === room.y ? { x: door.x, y: door.y + 1 } : { x: door.x, y: door.y - 1 };
}
