/**
 * 교무실 렌더러 — 캔버스에 직접 그립니다.
 *
 * 이미지 파일을 쓰지 않는 이유: 배포본이 가벼워지고, 확대해도 안 깨지고,
 * school.config.ts 에서 색을 바꾸면 그 자리에서 반영됩니다.
 */
import { useEffect, useRef } from "react";
import type { Person, ViewState } from "./sim";
import {
  TEAM_SPACES, FURNITURE, SPACES, TILE_PX, MAP_PX_H, MAP_PX_W, type Space,
} from "./world";

const C = {
  floor: "#efe7dc", floorAlt: "#e9e0d3", corridor: "#e3d9c9",
  wall: "#6d5a48", wallTop: "#8a7460",
  ink: "#2e2a26", faint: "#9b8f80",
  dept: "#f7f2ea", teacher: "#eaf3ef", meeting: "#f2eef8", lounge: "#fdf3e3",
  board: "#3f6b52", desk: "#c9a882", deskTop: "#dcbf9c",
  plant: "#5f8a5f", spot: "rgba(255, 214, 120, .28)",
};

const STATUS_DOT: Record<string, string> = {
  "마침": "#4aa17a", "작업 중": "#e0a63c", "결재 대기": "#d9647a",
  "자료 대기": "#8f7fd1", "대기": "#b9ae9f",
};

function spaceFill(space: Space) {
  if (space.kind === "teacher") return C.teacher;
  if (space.kind === "meeting") return C.meeting;
  if (space.kind === "lounge") return C.lounge;
  return C.dept;
}

function drawSpace(g: CanvasRenderingContext2D, space: Space, status: string | undefined, lit: boolean) {
  const x = space.x * TILE_PX, y = space.y * TILE_PX, w = space.w * TILE_PX, h = space.h * TILE_PX;

  g.fillStyle = spaceFill(space);
  g.fillRect(x, y, w, h);
  if (lit) { g.fillStyle = C.spot; g.fillRect(x, y, w, h); }

  // 벽 — 위쪽만 밝게 해서 입체감
  g.fillStyle = C.wall;
  g.fillRect(x, y, w, TILE_PX); g.fillRect(x, y + h - TILE_PX, w, TILE_PX);
  g.fillRect(x, y, TILE_PX, h); g.fillRect(x + w - TILE_PX, y, TILE_PX, h);
  g.fillStyle = C.wallTop;
  g.fillRect(x, y, w, 4);

  // 문 — 벽을 뚫어 바닥색으로
  g.fillStyle = C.corridor;
  for (const d of space.doors) g.fillRect(d.x * TILE_PX, d.y * TILE_PX, TILE_PX, TILE_PX);

  // 이름표
  g.fillStyle = "#fffdf8";
  g.fillRect(x + 6, y + 3, Math.min(w - 12, space.name.length * 11 + 26), 15);
  g.fillStyle = C.ink;
  g.font = "600 11px 'Malgun Gothic', system-ui, sans-serif";
  g.textBaseline = "middle";
  g.fillText(`${space.icon} ${space.name}`, x + 11, y + 11);

  if (status) {
    const cx = x + w - TILE_PX - 6, cy = y + TILE_PX + 8;
    g.fillStyle = STATUS_DOT[status] ?? C.faint;
    g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
  }

  g.fillStyle = C.faint;
  g.font = "9px 'Courier New', monospace";
  g.fillText(space.short, x + 10, y + h - 9);
}

function drawProps(g: CanvasRenderingContext2D) {
  for (const p of FURNITURE) {
    const x = p.x * TILE_PX, y = p.y * TILE_PX, w = p.w * TILE_PX, h = p.h * TILE_PX;
    switch (p.kind) {
      case "desk":
      case "teacher-desk":
        g.fillStyle = C.desk; g.fillRect(x, y, w, h);
        g.fillStyle = C.deskTop; g.fillRect(x, y, w, 4);
        break;
      case "monitor":
        g.fillStyle = "#3c4a5a"; g.fillRect(x + 4, y - 5, TILE_PX - 8, 8);
        g.fillStyle = "#7fb2a5"; g.fillRect(x + 6, y - 3, TILE_PX - 12, 4);
        break;
      case "table":
        g.fillStyle = "#d9c3a5"; g.fillRect(x, y, w, h);
        g.fillStyle = "#c2a884"; g.fillRect(x, y + h - 4, w, 4);
        break;
      case "board":
        g.fillStyle = C.board; g.fillRect(x, y, w, h);
        g.fillStyle = "#cfe3d5"; g.fillRect(x + 3, y + 3, w - 6, 3);
        if (p.label) {
          g.fillStyle = "#fff"; g.font = "700 9px system-ui";
          g.fillText(p.label, x + 4, y + h - 5);
        }
        break;
      case "shelf":
        g.fillStyle = "#b08d68"; g.fillRect(x, y, w, h);
        g.fillStyle = "#e2857f"; g.fillRect(x + 2, y + 2, 4, h - 4);
        g.fillStyle = "#7fb2a5"; g.fillRect(x + 8, y + 2, 4, h - 4);
        break;
      case "locker":
        g.fillStyle = "#9fb2c4"; g.fillRect(x, y, w, h);
        break;
      case "sofa":
        g.fillStyle = "#c98f86"; g.fillRect(x, y, w, h);
        g.fillStyle = "#dba79d"; g.fillRect(x, y, w, 5);
        break;
      case "coffee":
        g.fillStyle = "#6b4b3a"; g.fillRect(x, y, w, h);
        if (p.label) { g.font = "11px system-ui"; g.fillText(p.label, x + 3, y + h / 2); }
        break;
      case "plant":
        g.fillStyle = "#a9713f"; g.fillRect(x + 4, y + TILE_PX - 7, TILE_PX - 8, 7);
        g.fillStyle = C.plant;
        g.beginPath(); g.arc(x + TILE_PX / 2, y + 6, 6, 0, Math.PI * 2); g.fill();
        break;
      case "rug":
        g.fillStyle = "rgba(127, 178, 165, .28)"; g.fillRect(x, y, w, h);
        break;
    }
  }
}

/** 직원 한 명 — 머리 + 몸통 + 포인트색 */
function drawPerson(g: CanvasRenderingContext2D, a: Person, elapsed: number) {
  if (a.status === "출근 전") return;
  const px = a.fx * TILE_PX + TILE_PX / 2;
  const py = a.fy * TILE_PX + TILE_PX / 2;

  // 걸을 때 살짝 위아래로 (발소리 대신)
  const bob = a.pose === "walk" ? Math.sin(elapsed * 11 + a.fx * 2) * 1.2 : 0;
  const top = py - 11 + bob;

  g.fillStyle = "rgba(0,0,0,.14)";
  g.beginPath(); g.ellipse(px, py + 6, 6, 2.6, 0, 0, Math.PI * 2); g.fill();

  // 몸통
  g.fillStyle = a.seed.shirt;
  g.fillRect(px - 5, top + 7, 10, 9);
  g.fillStyle = a.seed.accent;
  g.fillRect(px - 5, top + 13, 10, 3);

  // 머리
  g.fillStyle = a.seed.skin;
  g.fillRect(px - 4.5, top, 9, 8);
  g.fillStyle = a.seed.hair;
  g.fillRect(px - 5, top - 1.5, 10, 4.5);
  if (a.heading === "down") {
    g.fillStyle = C.ink;
    g.fillRect(px - 2.5, top + 4, 1.4, 1.6);
    g.fillRect(px + 1.2, top + 4, 1.4, 1.6);
  }

  // 타이핑 중이면 깜빡이는 점
  if (a.pose === "type" && Math.floor(elapsed * 3) % 2 === 0) {
    g.fillStyle = "#e0a63c";
    g.fillRect(px + 6, top + 2, 2, 2);
  }

  // 이름표
  g.font = "600 9px 'Malgun Gothic', system-ui, sans-serif";
  const label = a.seed.name;
  const w = g.measureText(label).width + 8;
  g.fillStyle = "rgba(255,253,248,.92)";
  g.fillRect(px - w / 2, top - 14, w, 11);
  g.fillStyle = C.ink;
  g.textAlign = "center";
  g.fillText(label, px, top - 8.5);
  g.textAlign = "left";
}

function drawBubble(g: CanvasRenderingContext2D, a: Person) {
  if (!a.bubble || a.status === "출근 전") return;
  const px = a.fx * TILE_PX + TILE_PX / 2;
  const py = a.fy * TILE_PX + TILE_PX / 2;
  g.font = "11px 'Malgun Gothic', system-ui, sans-serif";
  const w = Math.min(230, g.measureText(a.bubble).width + 18);
  const x = px - w / 2, y = py - 42;

  g.fillStyle = "#fffdf8";
  g.strokeStyle = C.ink;
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(x, y, w, 21, 7);
  g.fill(); g.stroke();
  g.beginPath();
  g.moveTo(px - 4, y + 21); g.lineTo(px, y + 26); g.lineTo(px + 4, y + 21);
  g.fillStyle = "#fffdf8"; g.fill();

  g.fillStyle = C.ink;
  g.textAlign = "center";
  g.fillText(a.bubble.length > 30 ? a.bubble.slice(0, 29) + "…" : a.bubble, px, y + 11);
  g.textAlign = "left";
}

type Props = { people: Person[]; snap: ViewState; elapsed: number; onPick: (id: string) => void };

export default function Canvas({ people, snap, elapsed, onPick }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== MAP_PX_W * dpr) {
      canvas.width = MAP_PX_W * dpr;
      canvas.height = MAP_PX_H * dpr;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.textBaseline = "middle";

    // 바닥 — 복도는 조금 진하게
    g.fillStyle = C.corridor;
    g.fillRect(0, 0, MAP_PX_W, MAP_PX_H);
    for (let y = 0; y < MAP_PX_H; y += TILE_PX * 2) {
      for (let x = 0; x < MAP_PX_W; x += TILE_PX * 2) {
        g.fillStyle = ((x + y) / TILE_PX) % 4 === 0 ? C.floor : C.floorAlt;
        g.fillRect(x, y, TILE_PX, TILE_PX);
      }
    }

    for (const space of SPACES) {
      const isDept = TEAM_SPACES.some((r) => r.id === space.id);
      drawSpace(g, space, isDept ? snap.teamState[space.id] : undefined, snap.litSpace === space.id);
    }
    drawProps(g);

    // 아래쪽 직원이 앞에 오도록
    const sorted = [...people].sort((a, b) => a.fy - b.fy);
    for (const a of sorted) drawPerson(g, a, elapsed);
    for (const a of sorted) drawBubble(g, a);
  }, [people, snap, elapsed]);

  return (
    <canvas
      ref={ref}
      className="office-canvas"
      style={{ aspectRatio: `${MAP_PX_W} / ${MAP_PX_H}` }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const scale = MAP_PX_W / rect.width;
        const mx = (e.clientX - rect.left) * scale;
        const my = (e.clientY - rect.top) * scale;
        let best: { id: string; d: number } | null = null;
        for (const a of people) {
          if (a.status === "출근 전") continue;
          const d = Math.hypot(a.fx * TILE_PX + TILE_PX / 2 - mx, a.fy * TILE_PX + TILE_PX / 2 - my);
          if (d < 16 && (!best || d < best.d)) best = { id: a.id, d };
        }
        if (best) onPick(best.id);
      }}
    />
  );
}
