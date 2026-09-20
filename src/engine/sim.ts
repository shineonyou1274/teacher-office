/**
 * 교무실 시뮬레이션 엔진
 *
 * 하는 일: 직원 이동(A*) + 상태 + 하루 시나리오 + 지시창 응답.
 *
 * 설계 메모 — 각본은 코드가 아니라 데이터(SCRIPT)입니다.
 * 단계를 바꾸고 싶으면 아래 SCRIPT 배열만 고치면 되고, 엔진은 안 건드려도 됩니다.
 */
import { DEPARTMENTS } from "../../school.config";
import { findPath } from "./pathfind";
import { ALL_STAFF, BLOCKED, DEPT_BRIEF, DEPT_LEAD, ME, type Seed } from "./staff";
import {
  COLS, ENTRANCE, MEETING_SEATS, REPORT_SPOT, TEACHER_SEAT,
  roomOf, type Pt,
} from "./world";

export type DeptStatus = "완료" | "진행 중" | "승인 대기" | "자료 대기" | "대기";
export type Anim = "idle" | "walk" | "type" | "talk" | "sit";
export type Facing = "up" | "down" | "left" | "right";
export type ChatSource = "rule" | "note";

export type Agent = {
  id: string;
  seed: Seed;
  /** 타일 좌표 (실수 — 칸 사이를 부드럽게 지난다) */
  fx: number; fy: number;
  path: Pt[];
  anim: Anim;
  facing: Facing;
  status: string;
  bubble: string | null;
  bubbleUntil: number;
  seat: Pt | null;
};

export type LogEntry = { id: number; time: string; icon: string; text: string; tone: Tone };
export type Tone = "mint" | "yellow" | "pink" | "lav" | "gray";
export type ChatEntry = { id: number; time: string; from: "me" | "staff"; name: string; text: string; source?: ChatSource };

export type Snapshot = {
  clock: string;
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  running: boolean;
  dayDone: boolean;
  approvalPending: boolean;
  approved: boolean;
  deptStatus: Record<string, DeptStatus>;
  stats: { onDuty: number; done: number; working: number; approval: number; blocked: number };
  log: LogEntry[];
  chat: ChatEntry[];
  meetingTitle: string | null;
  focusMode: boolean;
  spotlight: string | null;
};

const WALK_SPEED = 4.2;          // 타일/초
const SIM_MIN_PER_SEC = 3.8;     // 시뮬 1초 = 3.8분 → 08:00 출근이 16시대에 끝난다
const DAY_START_MIN = 8 * 60;    // 08:00 출근

/** 하루 각본 — 여기만 고치면 단계가 바뀝니다 */
const SCRIPT: { phase: string; dept?: string; secs?: number; log?: [string, string, Tone] }[] = [
  { phase: "출근 전" },
  { phase: "08:00 전원 출근" },
  { phase: "자료 조사", dept: "research", secs: 6 },
  { phase: "학습자 분석", dept: "learner", secs: 5 },
  { phase: "수업 아이디어 10개", dept: "design", secs: 7 },
  { phase: "교육과정 검수", dept: "review", secs: 6 },
  { phase: "TOP 3 선정" },
  { phase: "선생님 승인 대기" },
  { phase: "활동지 집필", dept: "write", secs: 7 },
  { phase: "수업자료·학습지 제작", dept: "slide", secs: 6 },
  { phase: "평가 문항 정리", dept: "assess", secs: 5 },
  { phase: "관찰 기록 정리", dept: "care", secs: 4 },
  { phase: "가정통신·협의 답장", dept: "comm", secs: 4 },
  { phase: "성찰 기록", dept: "reflect", secs: 5 },
  { phase: "교무 브리핑", dept: "desk", secs: 4 },
  { phase: "업무 종료" },
];

export const PHASES = SCRIPT.map((s) => s.phase);
export const TOTAL_PHASES = PHASES.length;

/** 지시창에서 부서를 찾을 때 쓰는 키워드 (구체적인 것부터) */
const DEPT_KEYWORDS: [string, string[]][] = [
  ["review", ["검수", "성취기준", "금칙어", "반려"]],
  ["learner", ["학습자", "수준", "진단", "반응"]],
  ["design", ["설계", "수업 설계", "아이디어", "기획"]],
  ["write", ["집필", "활동지", "원고", "발문"]],
  ["research", ["조사", "자료조사", "리서치", "정책"]],
  ["slide", ["수업자료", "슬라이드", "영상", "자막"]],
  ["print", ["학습지", "인쇄", "디자인", "정답지"]],
  ["assess", ["평가", "문항", "루브릭", "채점"]],
  ["care", ["생활", "상담", "관찰", "기록"]],
  ["comm", ["학부모", "가정통신", "동료", "소통", "메일"]],
  ["reflect", ["성찰", "리뷰", "피드백"]],
  ["desk", ["비서", "교무", "브리핑"]],
];

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export class Office {
  agents: Agent[] = [];
  byId = new Map<string, Agent>();

  private elapsed = 0;
  private simMinutes = DAY_START_MIN;
  private seq = 1;
  private script: Generator<number | (() => boolean), void, void> | null = null;
  private waitUntil = 0;
  private waitFor: (() => boolean) | null = null;

  phaseIndex = 0;
  running = false;
  dayDone = false;
  approvalPending = false;
  approved = false;
  focusMode = false;
  meetingTitle: string | null = null;
  spotlight: string | null = null;
  private spotlightUntil = 0;

  deptStatus: Record<string, DeptStatus> = {};
  private deptProgress: Record<string, number> = {};
  log: LogEntry[] = [];
  chat: ChatEntry[] = [];
  speed = 1;
  paused = false;

  constructor() {
    for (const dept of DEPARTMENTS) {
      this.deptStatus[dept.id] = BLOCKED[dept.id] ? "자료 대기" : "대기";
      this.deptProgress[dept.id] = 0;
    }
    const spawn = { x: ENTRANCE.x, y: ENTRANCE.y - 1 };
    this.addAgent(ME, TEACHER_SEAT, "자리");
    for (const seed of ALL_STAFF) this.addAgent(seed, spawn, "출근 전");

    this.pushLog("🍎", "교무실 준비 완료. ‘오늘 업무 시작’을 누르면 전원 출근합니다.", "lav");
    const secretary = DEPT_LEAD.desk;
    if (secretary) {
      this.pushChat("staff", secretary.name,
        `${ME.callsign}, 교무 비서실 ${secretary.name}입니다. 궁금한 건 여기 물어보세요.`);
    }
  }

  private addAgent(seed: Seed, at: Pt, status: string) {
    const agent: Agent = {
      id: seed.id, seed,
      fx: at.x, fy: at.y,
      path: [], anim: "idle", facing: "down",
      status, bubble: null, bubbleUntil: 0, seat: null,
    };
    this.agents.push(agent);
    this.byId.set(agent.id, agent);
  }

  // ── 시계 ────────────────────────────────────────────
  clockText(): string {
    const total = Math.floor(this.simMinutes);
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // ── 기록 ────────────────────────────────────────────
  pushLog(icon: string, text: string, tone: Tone = "gray") {
    this.log.unshift({ id: this.seq++, time: this.clockText(), icon, text, tone });
    if (this.log.length > 40) this.log.pop();
  }

  pushChat(from: "me" | "staff", name: string, text: string, source: ChatSource = "rule") {
    this.chat.push({
      id: this.seq++, time: this.clockText(), from, name, text,
      source: from === "me" ? undefined : source,
    });
    if (this.chat.length > 60) this.chat.shift();
  }

  private say(agent: Agent | undefined, text: string, secs = 2.5) {
    if (!agent) return;
    agent.bubble = text;
    agent.bubbleUntil = this.elapsed + secs;
    if (agent.anim !== "walk") agent.anim = "talk";
  }

  // ── 이동 ────────────────────────────────────────────
  private occupied(except: Agent): Set<number> {
    const set = new Set<number>();
    for (const a of this.agents) {
      if (a === except || a.status === "출근 전") continue;
      set.add(Math.round(a.fy) * COLS + Math.round(a.fx));
    }
    return set;
  }

  private goTo(agent: Agent, goal: Pt) {
    const from = { x: Math.round(agent.fx), y: Math.round(agent.fy) };
    const path = findPath(from, goal, this.occupied(agent)) ?? findPath(from, goal);
    agent.path = path ?? [];
    if (agent.path.length) agent.anim = "walk";
  }

  private arrived(agent: Agent) { return agent.path.length === 0; }
  private allArrived(ids: string[]) {
    return ids.every((id) => { const a = this.byId.get(id); return !a || this.arrived(a); });
  }

  private step(agent: Agent, dt: number) {
    if (!agent.path.length) {
      if (agent.anim === "walk") agent.anim = agent.seat ? "type" : "idle";
      return;
    }
    const next = agent.path[0];
    const dx = next.x - agent.fx;
    const dy = next.y - agent.fy;
    const dist = Math.hypot(dx, dy);
    const move = WALK_SPEED * dt;

    if (Math.abs(dx) > Math.abs(dy)) agent.facing = dx > 0 ? "right" : "left";
    else if (dy !== 0) agent.facing = dy > 0 ? "down" : "up";

    if (dist <= move || dist < 0.01) {
      agent.fx = next.x; agent.fy = next.y;
      agent.path.shift();
      if (!agent.path.length) agent.anim = agent.seat ? "type" : "idle";
    } else {
      agent.fx += (dx / dist) * move;
      agent.fy += (dy / dist) * move;
    }
  }

  // ── 자리 배정 ────────────────────────────────────────
  private seatFor(agent: Agent): Pt {
    const room = roomOf(agent.seed.deptId);
    const mine = ALL_STAFF.filter((s) => s.deptId === agent.seed.deptId);
    const i = Math.max(0, mine.findIndex((s) => s.id === agent.id));
    const desk = room.desks[i % room.desks.length];
    return desk ? desk.seat : rand(room.loiter);
  }

  private deptAgents(deptId: string) {
    return this.agents.filter((a) => a.seed.deptId === deptId);
  }

  // ── 하루 각본 ────────────────────────────────────────
  start() {
    if (this.running || this.dayDone) return;
    this.running = true;
    this.script = this.runDay();
    this.advance();
  }

  private *runDay(): Generator<number | (() => boolean), void, void> {
    // ① 출근
    this.phaseIndex = 1;
    this.pushLog("🚪", "08:00 전원 출근 — 복도를 지나 각자 교실로 갑니다.", "yellow");
    // 한꺼번에 몰리면 서로 길을 막는다. 6명씩 나눠 내보낸다.
    // (실시간 setTimeout 이 아니라 시뮬 시간 기준이라 배속을 올려도 어긋나지 않는다)
    const commuters = this.agents.filter((a) => a.id !== "teacher");
    for (let i = 0; i < commuters.length; i += 6) {
      for (const agent of commuters.slice(i, i + 6)) {
        agent.status = "출근 중";
        agent.seat = this.seatFor(agent);
        this.goTo(agent, agent.seat);
      }
      yield 0.35;
    }
    yield () => this.allArrived(this.agents.filter((a) => a.id !== "teacher").map((a) => a.id));
    for (const agent of this.agents) {
      if (agent.id === "teacher") continue;
      agent.status = "대기";
      agent.anim = "type";
    }
    const secretary = this.byId.get(DEPT_LEAD.desk?.id ?? "");
    this.say(secretary, `${ME.callsign}, 오늘 업무 시작합니다.`, 3);
    yield 1.5;

    // ② ~ ⑥ 순차 업무
    for (let i = 2; i <= 5; i += 1) {
      const step = SCRIPT[i];
      this.phaseIndex = i;
      if (!step.dept) continue;
      if (BLOCKED[step.dept]) { yield* this.waitingOnData(step.dept); continue; }
      yield* this.runDept(step.dept, step.secs ?? 5);
    }

    // ⑥ TOP 3
    this.phaseIndex = 6;
    this.pushLog("💡", "수업 설계팀: TOP 3 확정 — 검수 통과 3건", "pink");
    yield 1.5;

    // ⑦ 선생님 승인 — 여기서 진짜로 멈춘다
    this.phaseIndex = 7;
    this.approvalPending = true;
    this.deptStatus.design = "승인 대기";
    const attendees = ["design", "review", "desk"]
      .map((d) => this.byId.get(DEPT_LEAD[d].id))
      .filter((a): a is Agent => Boolean(a));
    attendees.forEach((agent, i) => {
      agent.status = "회의 중";
      agent.seat = null;
      this.goTo(agent, MEETING_SEATS[i]);
    });
    this.meetingTitle = "TOP 3 승인 협의";
    yield () => this.allArrived(attendees.map((a) => a.id));
    this.say(attendees[attendees.length - 1], `${ME.callsign}, 오늘 결정하실 건 이거 하나예요.`, 4);
    this.pushLog("✋", `협의회실에서 ${attendees.length}명이 승인을 기다립니다.`, "pink");

    yield () => this.approved;   // ← 버튼을 누를 때까지 정지

    this.approvalPending = false;
    this.meetingTitle = null;
    this.deptStatus.design = "완료";
    this.pushLog("✅", "선생님 승인 완료 — 활동지 집필로 넘어갑니다.", "mint");
    for (const agent of attendees) {
      agent.status = "대기";
      agent.seat = this.seatFor(agent);
      this.goTo(agent, agent.seat);
    }
    yield 1.5;

    // ⑧ ~ 마지막 업무 — 각본 배열을 그대로 따라간다 (단계를 늘려도 안 깨진다)
    for (let i = 8; i < SCRIPT.length - 1; i += 1) {
      const step = SCRIPT[i];
      this.phaseIndex = i;
      if (!step.dept) continue;
      if (BLOCKED[step.dept]) {
        yield* this.waitingOnData(step.dept);
        continue;
      }
      yield* this.runDept(step.dept, step.secs ?? 5);
      // 학습지 디자인팀은 수업자료팀에게서 원고를 받아 이어서 작업한다
      if (step.dept === "slide") yield* this.runDept("print", 5);
    }

    // ⑬ 브리핑 — 비서가 교무실로 걸어와 보고
    const brief = this.byId.get(DEPT_LEAD.desk.id);
    if (brief) {
      brief.status = "보고 중";
      brief.seat = null;
      this.goTo(brief, REPORT_SPOT);
      yield () => this.arrived(brief);
      this.say(brief, `${ME.callsign}, 오늘 업무가 정리됐어요.`, 4);
      yield 2;
      brief.seat = this.seatFor(brief);
      brief.status = "대기";
      this.goTo(brief, brief.seat);
    }

    this.phaseIndex = SCRIPT.length - 1;
    this.dayDone = true;
    this.running = false;
    this.pushLog("🌙", "오늘 업무 종료. 내일 08:00에 다시 출근합니다.", "lav");
  }

  /**
   * 자료가 없어 못 하는 부서.
   * 없는 걸 만들어내지 않고 '자료 대기'로 남기는 게 이 교무실의 원칙입니다.
   */
  private *waitingOnData(deptId: string): Generator<number | (() => boolean), void, void> {
    this.deptStatus[deptId] = "자료 대기";
    const lead = this.byId.get(DEPT_LEAD[deptId].id);
    this.say(lead, `${BLOCKED[deptId]}가 아직 없어요. 없는 내용은 만들지 않습니다.`, 3);
    this.pushLog("🧩", `${DEPT_BRIEF[deptId].name}: ${BLOCKED[deptId]} 미연동 → 기록만 남김`, "lav");
    yield 2;
  }

  /** 한 부서가 일하는 구간 */
  private *runDept(deptId: string, secs: number): Generator<number | (() => boolean), void, void> {
    const brief = DEPT_BRIEF[deptId];
    this.deptStatus[deptId] = "진행 중";
    this.deptProgress[deptId] = 0;
    this.spotlightRoom(deptId, secs);

    for (const agent of this.deptAgents(deptId)) {
      agent.status = "업무 중";
      if (!agent.seat) { agent.seat = this.seatFor(agent); this.goTo(agent, agent.seat); }
      agent.anim = "type";
    }
    const lead = this.byId.get(DEPT_LEAD[deptId].id);
    this.say(lead, rand(lead?.seed.thoughts ?? [brief.task]), 3);
    this.pushLog("▶", `${brief.name} 업무 시작 — ${brief.task}`, "yellow");

    const started = this.elapsed;
    yield () => {
      const ratio = Math.min(1, (this.elapsed - started) / secs);
      this.deptProgress[deptId] = Math.round(ratio * 100);
      return ratio >= 1;
    };

    this.deptStatus[deptId] = "완료";
    this.deptProgress[deptId] = 100;
    for (const agent of this.deptAgents(deptId)) agent.status = "대기";
    this.say(lead, brief.report, 3);
    this.pushLog("✔", `${brief.name} 완료 — ${brief.report}`, "mint");
  }

  private spotlightRoom(roomId: string, secs: number) {
    this.spotlight = roomId;
    this.spotlightUntil = this.elapsed + secs;
  }

  approve() { if (this.approvalPending) this.approved = true; }

  // ── 매 프레임 ────────────────────────────────────────
  tick(dtRaw: number) {
    if (this.paused) return;
    const dt = Math.min(0.1, dtRaw) * this.speed;
    this.elapsed += dt;
    if (this.running) this.simMinutes += dt * SIM_MIN_PER_SEC;

    for (const agent of this.agents) {
      this.step(agent, dt);
      if (agent.bubble && this.elapsed > agent.bubbleUntil) {
        agent.bubble = null;
        if (agent.anim === "talk") agent.anim = agent.seat ? "type" : "idle";
      }
    }
    if (this.spotlight && this.elapsed > this.spotlightUntil) this.spotlight = null;
    this.advance();
  }

  /** 각본을 조건이 풀릴 때까지 진행시킨다 */
  private advance() {
    if (!this.script) return;
    for (let guard = 0; guard < 50; guard += 1) {
      if (this.waitFor) {
        if (!this.waitFor()) return;
        this.waitFor = null;
      } else if (this.waitUntil > this.elapsed) {
        return;
      }
      const next = this.script.next();
      if (next.done) { this.script = null; return; }
      if (typeof next.value === "function") { this.waitFor = next.value; this.waitUntil = 0; }
      else { this.waitUntil = this.elapsed + next.value; this.waitFor = null; }
    }
  }

  // ── 지시창 ──────────────────────────────────────────
  command(raw: string) {
    const text = raw.trim();
    if (!text) return;
    this.pushChat("me", ME.name, text);

    const deptId = this.matchDept(text);
    if (deptId && !/전체|모두|다들/.test(text)) return this.deptReport(deptId);

    if (/집중|딴짓|자리 지켜/.test(text)) return this.setFocus(true);
    if (/자유|쉬어|집중 해제/.test(text)) return this.setFocus(false);
    if (/승인|결재|오케이|진행해/.test(text) && this.approvalPending) {
      this.approve();
      return this.pushChat("staff", DEPT_LEAD.desk.name, "승인 접수했습니다. 집필팀에 바로 넘길게요.");
    }
    if (/왜|늦|지연|막힘|안 ?되|문제/.test(text)) return this.reportDelay();
    if (/뭐|현황|상황|진행|보고|어디까지/.test(text)) return this.reportStatus();

    this.pushChat("staff", DEPT_LEAD.desk.name,
      "이렇게 물어보시면 제일 빨라요 — “현황 보고” / “왜 늦어져?” / “검수팀 뭐해?” / “집중 모드”.");
  }

  private matchDept(text: string): string | null {
    for (const [id, words] of DEPT_KEYWORDS) if (words.some((w) => text.includes(w))) return id;
    const staff = ALL_STAFF.find((s) => text.includes(s.name) || (s.callsign && text.includes(s.callsign)));
    return staff?.deptId ?? null;
  }

  private reportStatus() {
    const lead = DEPT_LEAD.desk;
    if (!this.running && !this.dayDone) {
      return this.pushChat("staff", lead.name, "아직 출근 전이에요. ‘오늘 업무 시작’을 눌러주시면 전원 출근합니다.");
    }
    const lines = [`지금 ${this.clockText()} · ‘${PHASES[this.phaseIndex]}’ 단계입니다.`];
    const working = Object.entries(this.deptStatus).filter(([, s]) => s === "진행 중").map(([d]) => d);
    if (working.length) {
      lines.push(`진행 중: ${working.map((d) => `${DEPT_BRIEF[d].name} ${this.deptProgress[d]}%`).join(" · ")}`);
    } else if (this.approvalPending) {
      lines.push(`전 부서가 ${ME.callsign} 승인을 기다리는 중입니다.`);
    } else if (this.dayDone) {
      lines.push("오늘 업무는 모두 끝났어요.");
    }
    const done = Object.values(this.deptStatus).filter((s) => s === "완료").length;
    const blocked = Object.values(this.deptStatus).filter((s) => s === "자료 대기").length;
    lines.push(`완료 ${done}팀 · 자료 대기 ${blocked}팀 · 근무 ${this.onDuty()}명.`);
    const next = PHASES[this.phaseIndex + 1];
    if (next && !this.dayDone) lines.push(`다음 순서는 ‘${next}’입니다.`);
    this.pushChat("staff", lead.name, lines.join("\n"));
  }

  private reportDelay() {
    const lead = DEPT_LEAD.desk;
    const lines: string[] = [];
    if (this.approvalPending) {
      lines.push(`원인은 하나예요 — ${ME.callsign} 승인 대기입니다.`);
      lines.push("승인만 눌러주시면 바로 활동지 집필로 넘어갑니다.");
    }
    const working = Object.entries(this.deptStatus).filter(([, s]) => s === "진행 중");
    for (const [d] of working) lines.push(`${DEPT_BRIEF[d].name}: 진행률 ${this.deptProgress[d]}%. 정상 속도예요.`);
    const blocked = Object.entries(this.deptStatus).filter(([, s]) => s === "자료 대기").map(([d]) => d);
    for (const d of blocked) lines.push(`${DEPT_BRIEF[d].name}: ${BLOCKED[d]}가 없어 오늘은 진행이 어려워요.`);
    if (!lines.length) lines.push("지연 없습니다.");
    this.pushChat("staff", lead.name, lines.join("\n"));
  }

  private deptReport(deptId: string) {
    const lead = DEPT_LEAD[deptId];
    const brief = DEPT_BRIEF[deptId];
    const status = this.deptStatus[deptId];
    const members = this.deptAgents(deptId).filter((a) => a.seed.rank === "member");
    const lines = [`${brief.name} · 지금 ${status}`];
    if (status === "진행 중") lines.push(`${brief.task} — 진행률 ${this.deptProgress[deptId]}%`);
    else if (status === "자료 대기") lines.push(`${BLOCKED[deptId]}가 아직 없어요. 없는 수치는 만들지 않습니다.`);
    else if (status === "완료") lines.push(brief.report);
    else lines.push(`${brief.task} — 앞 단계를 기다리는 중입니다.`);
    if (members.length) lines.push(`팀원: ${members.map((m) => `${m.seed.name}(${m.status})`).join(" · ")}`);
    this.pushChat("staff", `${lead.name} · ${brief.name}`, lines.join("\n"));
    this.spotlightRoom(deptId, 4);
  }

  private setFocus(on: boolean) {
    this.focusMode = on;
    const lead = DEPT_LEAD.desk;
    if (on) {
      for (const agent of this.agents) {
        if (agent.id === "teacher" || agent.status === "출근 전" || agent.status === "회의 중") continue;
        if (!agent.seat) agent.seat = this.seatFor(agent);
        this.goTo(agent, agent.seat);
      }
      this.pushChat("staff", lead.name, "집중 모드 켰습니다. 전원 자리에서 업무만 봅니다.");
    } else {
      this.pushChat("staff", lead.name, "집중 모드 껐어요. 다들 숨 좀 돌리겠습니다 ☕");
    }
  }

  onDuty() { return this.agents.filter((a) => a.status !== "출근 전" && a.id !== "teacher").length; }

  setSpeed(v: number) { this.speed = v; }
  togglePause() { this.paused = !this.paused; }

  snapshot(): Snapshot {
    const values = Object.values(this.deptStatus);
    return {
      clock: this.clockText(),
      phase: PHASES[this.phaseIndex],
      phaseIndex: this.phaseIndex,
      totalPhases: TOTAL_PHASES,
      running: this.running,
      dayDone: this.dayDone,
      approvalPending: this.approvalPending,
      approved: this.approved,
      deptStatus: { ...this.deptStatus },
      stats: {
        onDuty: this.onDuty(),
        done: values.filter((v) => v === "완료").length,
        working: values.filter((v) => v === "진행 중").length,
        approval: values.filter((v) => v === "승인 대기").length,
        blocked: values.filter((v) => v === "자료 대기").length,
      },
      log: this.log.slice(0, 20),
      chat: this.chat.slice(-24),
      meetingTitle: this.meetingTitle,
      focusMode: this.focusMode,
      spotlight: this.spotlight,
    };
  }
}

