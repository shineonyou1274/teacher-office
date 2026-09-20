/**
 * 교무실 시뮬레이션 엔진
 *
 * 하는 일: 직원 이동(A*) + 상태 + 하루 시나리오 + 지시창 응답.
 *
 * 설계 메모 — 각본은 코드가 아니라 데이터(DAY_PLAN)입니다.
 * 단계를 바꾸고 싶으면 아래 DAY_PLAN 배열만 고치면 되고, 엔진은 안 건드려도 됩니다.
 */
import { DEPARTMENTS } from "../../school.config";
import { findRoute } from "./pathfind";
import { ROSTER, PENDING_INPUT, TEAM_INFO, LEADS, ME, type Profile } from "./staff";
import {
  MAP_COLS, FRONT_DOOR, MEETING_CHAIRS, BRIEFING_SPOT, TEACHER_CHAIR,
  spaceOf, type Cell,
} from "./world";

export type TeamState = "마침" | "작업 중" | "결재 대기" | "자료 대기" | "대기";
export type Pose = "stand" | "walk" | "sit" | "type" | "talk";
export type Heading = "up" | "down" | "left" | "right";
export type MsgSource = "rule" | "note";

export type Person = {
  id: string;
  seed: Profile;
  /** 타일 좌표 (실수 — 칸 사이를 부드럽게 지난다) */
  fx: number; fy: number;
  path: Cell[];
  pose: Pose;
  heading: Heading;
  status: string;
  bubble: string | null;
  bubbleUntil: number;
  seat: Cell | null;
};

export type Note = { id: number; time: string; icon: string; text: string; tone: Tone };
export type Tone = "mint" | "yellow" | "pink" | "lav" | "gray";
export type Msg = { id: number; time: string; from: "me" | "staff"; name: string; text: string; source?: MsgSource };

export type ViewState = {
  clock: string;
  stepName: string;
  stepIndex: number;
  stepCount: number;
  running: boolean;
  dayOver: boolean;
  signoffPending: boolean;
  signedOff: boolean;
  teamState: Record<string, TeamState>;
  stats: { present: number; done: number; working: number; approval: number; blocked: number };
  notes: Note[];
  messages: Msg[];
  meetingName: string | null;
  focusOn: boolean;
  litSpace: string | null;
};

const WALK_SPEED = 4.2;          // 타일/초
const SIM_MIN_PER_SEC = 3.8;     // 시뮬 1초 = 3.8분 → 08:00 출근이 16시대에 끝난다
const DAY_START_MIN = 8 * 60;    // 08:00 출근

/** 하루 각본 — 여기만 고치면 단계가 바뀝니다 */
const DAY_PLAN: { title: string; team?: string; secs?: number }[] = [
  { title: "출근 전" },
  { title: "08:00 전원 출근" },
  { title: "자료 조사", team: "research", secs: 6 },
  { title: "학습자 분석", team: "learner", secs: 5 },
  { title: "수업 아이디어 10개", team: "design", secs: 7 },
  { title: "교육과정 검수", team: "review", secs: 6 },
  { title: "수업안 3개로 좁히기" },
  { title: "선생님 결재 대기" },
  { title: "활동지 집필", team: "write", secs: 7 },
  { title: "수업자료·학습지 제작", team: "slide", secs: 6 },
  { title: "평가 문항 정리", team: "assess", secs: 5 },
  { title: "관찰 기록 정리", team: "care", secs: 4 },
  { title: "가정통신·협의 답장", team: "comm", secs: 4 },
  { title: "성찰 기록", team: "reflect", secs: 5 },
  { title: "교무 브리핑", team: "desk", secs: 4 },
  { title: "업무 종료" },
];

export const STEP_NAMES = DAY_PLAN.map((s) => s.title);
export const STEP_COUNT = STEP_NAMES.length;

/** 지시창에서 부서를 찾을 때 쓰는 키워드 (구체적인 것부터) */
const TEAM_WORDS: [string, string[]][] = [
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
  people: Person[] = [];
  byId = new Map<string, Person>();

  private elapsed = 0;
  private simMinutes = DAY_START_MIN;
  private seq = 1;
  private script: Generator<number | (() => boolean), void, void> | null = null;
  private waitUntil = 0;
  private waitFor: (() => boolean) | null = null;

  stepIndex = 0;
  running = false;
  dayOver = false;
  signoffPending = false;
  signedOff = false;
  focusOn = false;
  meetingName: string | null = null;
  litSpace: string | null = null;
  private litUntil = 0;

  teamState: Record<string, TeamState> = {};
  private teamPercent: Record<string, number> = {};
  notes: Note[] = [];
  messages: Msg[] = [];
  speed = 1;
  paused = false;

  constructor() {
    for (const dept of DEPARTMENTS) {
      this.teamState[dept.id] = PENDING_INPUT[dept.id] ? "자료 대기" : "대기";
      this.teamPercent[dept.id] = 0;
    }
    const spawn = { x: FRONT_DOOR.x, y: FRONT_DOOR.y - 1 };
    this.addAgent(ME, TEACHER_CHAIR, "자리");
    for (const seed of ROSTER) this.addAgent(seed, spawn, "출근 전");

    this.addNote("🍎", "교무실 준비 완료. ‘오늘 업무 시작’을 누르면 전원 출근합니다.", "lav");
    const secretary = LEADS.desk;
    if (secretary) {
      this.addMsg("staff", secretary.name,
        `${ME.callsign}, 교무 비서실 ${secretary.name}입니다. 궁금한 건 여기 물어보세요.`);
    }
  }

  private addAgent(seed: Profile, at: Cell, status: string) {
    const agent: Person = {
      id: seed.id, seed,
      fx: at.x, fy: at.y,
      path: [], pose: "stand", heading: "down",
      status, bubble: null, bubbleUntil: 0, seat: null,
    };
    this.people.push(agent);
    this.byId.set(agent.id, agent);
  }

  // ── 시계 ────────────────────────────────────────────
  hhmm(): string {
    const total = Math.floor(this.simMinutes);
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // ── 기록 ────────────────────────────────────────────
  addNote(icon: string, text: string, tone: Tone = "gray") {
    this.notes.unshift({ id: this.seq++, time: this.hhmm(), icon, text, tone });
    if (this.notes.length > 40) this.notes.pop();
  }

  addMsg(from: "me" | "staff", name: string, text: string, source: MsgSource = "rule") {
    this.messages.push({
      id: this.seq++, time: this.hhmm(), from, name, text,
      source: from === "me" ? undefined : source,
    });
    if (this.messages.length > 60) this.messages.shift();
  }

  private say(agent: Person | undefined, text: string, secs = 2.5) {
    if (!agent) return;
    agent.bubble = text;
    agent.bubbleUntil = this.elapsed + secs;
    if (agent.pose !== "walk") agent.pose = "talk";
  }

  // ── 이동 ────────────────────────────────────────────
  private takenCells(except: Person): Set<number> {
    const set = new Set<number>();
    for (const a of this.people) {
      if (a === except || a.status === "출근 전") continue;
      set.add(Math.round(a.fy) * MAP_COLS + Math.round(a.fx));
    }
    return set;
  }

  private goTo(agent: Person, goal: Cell) {
    const from = { x: Math.round(agent.fx), y: Math.round(agent.fy) };
    const path = findRoute(from, goal, this.takenCells(agent)) ?? findRoute(from, goal);
    agent.path = path ?? [];
    if (agent.path.length) agent.pose = "walk";
  }

  private settled(agent: Person) { return agent.path.length === 0; }
  private allSettled(ids: string[]) {
    return ids.every((id) => { const a = this.byId.get(id); return !a || this.settled(a); });
  }

  private step(agent: Person, dt: number) {
    if (!agent.path.length) {
      if (agent.pose === "walk") agent.pose = agent.seat ? "type" : "stand";
      return;
    }
    const next = agent.path[0];
    const dx = next.x - agent.fx;
    const dy = next.y - agent.fy;
    const dist = Math.hypot(dx, dy);
    const move = WALK_SPEED * dt;

    if (Math.abs(dx) > Math.abs(dy)) agent.heading = dx > 0 ? "right" : "left";
    else if (dy !== 0) agent.heading = dy > 0 ? "down" : "up";

    if (dist <= move || dist < 0.01) {
      agent.fx = next.x; agent.fy = next.y;
      agent.path.shift();
      if (!agent.path.length) agent.pose = agent.seat ? "type" : "stand";
    } else {
      agent.fx += (dx / dist) * move;
      agent.fy += (dy / dist) * move;
    }
  }

  // ── 자리 배정 ────────────────────────────────────────
  private chairFor(agent: Person): Cell {
    const space = spaceOf(agent.seed.deptId);
    const mine = ROSTER.filter((s) => s.deptId === agent.seed.deptId);
    const i = Math.max(0, mine.findIndex((s) => s.id === agent.id));
    const desk = space.desks[i % space.desks.length];
    return desk ? desk.chair : rand(space.standSpots);
  }

  private peopleIn(deptId: string) {
    return this.people.filter((a) => a.seed.deptId === deptId);
  }

  // ── 하루 각본 ────────────────────────────────────────
  start() {
    if (this.running || this.dayOver) return;
    this.running = true;
    this.script = this.runDay();
    this.advance();
  }

  private *runDay(): Generator<number | (() => boolean), void, void> {
    // ① 출근
    this.stepIndex = 1;
    this.addNote("🚪", "08:00 전원 출근 — 복도를 지나 각자 교실로 갑니다.", "yellow");
    // 한꺼번에 몰리면 서로 길을 막는다. 6명씩 나눠 내보낸다.
    // (실시간 setTimeout 이 아니라 시뮬 시간 기준이라 배속을 올려도 어긋나지 않는다)
    const commuters = this.people.filter((a) => a.id !== "teacher");
    for (let i = 0; i < commuters.length; i += 6) {
      for (const agent of commuters.slice(i, i + 6)) {
        agent.status = "출근 중";
        agent.seat = this.chairFor(agent);
        this.goTo(agent, agent.seat);
      }
      yield 0.35;
    }
    yield () => this.allSettled(this.people.filter((a) => a.id !== "teacher").map((a) => a.id));
    for (const agent of this.people) {
      if (agent.id === "teacher") continue;
      agent.status = "대기";
      agent.pose = "type";
    }
    const secretary = this.byId.get(LEADS.desk?.id ?? "");
    this.say(secretary, `${ME.callsign}, 오늘 업무 시작합니다.`, 3);
    yield 1.5;

    // ② ~ ⑥ 순차 업무
    for (let i = 2; i <= 5; i += 1) {
      const step = DAY_PLAN[i];
      this.stepIndex = i;
      if (!step.team) continue;
      if (PENDING_INPUT[step.team]) { yield* this.noInputYet(step.team); continue; }
      yield* this.runTeam(step.team, step.secs ?? 5);
    }

    // ⑥ 후보 좁히기
    this.stepIndex = 6;
    this.addNote("💡", "수업 설계팀: 10개 중 3개로 좁혔습니다 — 검수 통과분만", "pink");
    yield 1.5;

    // ⑦ 선생님 결재 — 여기서 실제로 멈춘다
    this.stepIndex = 7;
    this.signoffPending = true;
    this.teamState.design = "결재 대기";
    const attendees = ["design", "review", "desk"]
      .map((d) => this.byId.get(LEADS[d].id))
      .filter((a): a is Person => Boolean(a));
    attendees.forEach((agent, i) => {
      agent.status = "회의 중";
      agent.seat = null;
      this.goTo(agent, MEETING_CHAIRS[i]);
    });
    this.meetingName = "수업안 결재 협의";
    yield () => this.allSettled(attendees.map((a) => a.id));
    this.say(attendees[attendees.length - 1], `${ME.callsign}, 오늘 결정하실 건 이거 하나예요.`, 4);
    this.addNote("✋", `협의회실에서 ${attendees.length}명이 결재를 기다립니다.`, "pink");

    yield () => this.signedOff;   // ← 버튼을 누를 때까지 정지

    this.signoffPending = false;
    this.meetingName = null;
    this.teamState.design = "마침";
    this.addNote("✅", "선생님 결재 끝 — 활동지 집필로 넘어갑니다.", "mint");
    for (const agent of attendees) {
      agent.status = "대기";
      agent.seat = this.chairFor(agent);
      this.goTo(agent, agent.seat);
    }
    yield 1.5;

    // ⑧ ~ 마지막 업무 — 각본 배열을 그대로 따라간다 (단계를 늘려도 안 깨진다)
    for (let i = 8; i < DAY_PLAN.length - 1; i += 1) {
      const step = DAY_PLAN[i];
      this.stepIndex = i;
      if (!step.team) continue;
      if (PENDING_INPUT[step.team]) {
        yield* this.noInputYet(step.team);
        continue;
      }
      yield* this.runTeam(step.team, step.secs ?? 5);
      // 학습지 디자인팀은 수업자료팀에게서 원고를 받아 이어서 작업한다
      if (step.team === "slide") yield* this.runTeam("print", 5);
    }

    // ⑬ 브리핑 — 비서가 교무실로 걸어와 보고
    const brief = this.byId.get(LEADS.desk.id);
    if (brief) {
      brief.status = "보고하러 감";
      brief.seat = null;
      this.goTo(brief, BRIEFING_SPOT);
      yield () => this.settled(brief);
      this.say(brief, `${ME.callsign}, 오늘 업무가 정리됐어요.`, 4);
      yield 2;
    }

    // 보고가 끝나면 하루를 닫는다. 시계는 여기서 멈추고,
    // 비서가 자리로 돌아가는 건 그 뒤에 조용히 이어진다 (퇴근 시각이 밀리지 않게)
    this.stepIndex = DAY_PLAN.length - 1;
    this.dayOver = true;
    this.running = false;
    this.addNote("🌙", "오늘 업무 종료. 내일 08:00에 다시 출근합니다.", "lav");

    if (brief) {
      brief.seat = this.chairFor(brief);
      brief.status = "대기";
      this.goTo(brief, brief.seat);
    }
  }

  /**
   * 자료가 없어 못 하는 부서.
   * 없는 걸 만들어내지 않고 '자료 대기'로 남기는 게 이 교무실의 원칙입니다.
   */
  private *noInputYet(deptId: string): Generator<number | (() => boolean), void, void> {
    this.teamState[deptId] = "자료 대기";
    const lead = this.byId.get(LEADS[deptId].id);
    this.say(lead, `${PENDING_INPUT[deptId]}가 아직 없어요. 없는 내용은 만들지 않습니다.`, 3);
    this.addNote("🧩", `${TEAM_INFO[deptId].name}: ${PENDING_INPUT[deptId]} 미연동 → 기록만 남김`, "lav");
    yield 2;
  }

  /** 한 부서가 일하는 구간 */
  private *runTeam(deptId: string, secs: number): Generator<number | (() => boolean), void, void> {
    const brief = TEAM_INFO[deptId];
    this.teamState[deptId] = "작업 중";
    this.teamPercent[deptId] = 0;
    this.lightUp(deptId, secs);

    for (const agent of this.peopleIn(deptId)) {
      agent.status = "작업 중";
      if (!agent.seat) { agent.seat = this.chairFor(agent); this.goTo(agent, agent.seat); }
      agent.pose = "type";
    }
    const lead = this.byId.get(LEADS[deptId].id);
    this.say(lead, rand(lead?.seed.thoughts ?? [brief.task]), 3);
    this.addNote("▶", `${brief.name} 업무 시작 — ${brief.task}`, "yellow");

    const started = this.elapsed;
    yield () => {
      const ratio = Math.min(1, (this.elapsed - started) / secs);
      this.teamPercent[deptId] = Math.round(ratio * 100);
      return ratio >= 1;
    };

    this.teamState[deptId] = "마침";
    this.teamPercent[deptId] = 100;
    for (const agent of this.peopleIn(deptId)) agent.status = "대기";
    this.say(lead, brief.report, 3);
    this.addNote("✔", `${brief.name} 마침 — ${brief.report}`, "mint");
  }

  private lightUp(roomId: string, secs: number) {
    this.litSpace = roomId;
    this.litUntil = this.elapsed + secs;
  }

  signOff() { if (this.signoffPending) this.signedOff = true; }

  // ── 매 프레임 ────────────────────────────────────────
  tick(dtRaw: number) {
    if (this.paused) return;
    const dt = Math.min(0.1, dtRaw) * this.speed;
    this.elapsed += dt;
    if (this.running) this.simMinutes += dt * SIM_MIN_PER_SEC;

    for (const agent of this.people) {
      this.step(agent, dt);
      if (agent.bubble && this.elapsed > agent.bubbleUntil) {
        agent.bubble = null;
        if (agent.pose === "talk") agent.pose = agent.seat ? "type" : "stand";
      }
    }
    if (this.litSpace && this.elapsed > this.litUntil) this.litSpace = null;
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
  ask(typed: string) {
    const text = typed.trim();
    if (!text) return;
    this.addMsg("me", ME.name, text);

    const deptId = this.teamFromText(text);
    if (deptId && !/전체|모두|다들/.test(text)) return this.sayTeam(deptId);

    if (/자리 지키|집중|딴짓/.test(text)) return this.setFocusMode(true);
    if (/풀어|쉬어|해제/.test(text)) return this.setFocusMode(false);
    if (/승인|결재|오케이|진행해/.test(text) && this.signoffPending) {
      this.signOff();
      return this.addMsg("staff", LEADS.desk.name, "결재 받았습니다. 집필팀에 바로 넘길게요.");
    }
    if (/왜|늦|지연|막히|막힌|막힘|안 ?되|문제/.test(text)) return this.sayBlocked();
    if (/뭐|현황|상황|진행|보고|어디까지/.test(text)) return this.sayProgress();

    this.addMsg("staff", LEADS.desk.name,
      "이렇게 물어보시면 제일 빨라요 — “어디까지 됐어?” / “막힌 데 있어?” / “검수팀 상황” / “자리 지키기”.");
  }

  private teamFromText(text: string): string | null {
    for (const [id, words] of TEAM_WORDS) if (words.some((w) => text.includes(w))) return id;
    const staff = ROSTER.find((s) => text.includes(s.name) || (s.callsign && text.includes(s.callsign)));
    return staff?.deptId ?? null;
  }

  private sayProgress() {
    const lead = LEADS.desk;
    if (!this.running && !this.dayOver) {
      return this.addMsg("staff", lead.name, "아직 출근 전이에요. ‘오늘 업무 시작’을 눌러주시면 전원 출근합니다.");
    }
    const lines = [`${this.hhmm()} 현재 ‘${STEP_NAMES[this.stepIndex]}’ 를 하고 있어요.`];
    const working = Object.entries(this.teamState).filter(([, s]) => s === "작업 중").map(([d]) => d);
    if (working.length) {
      lines.push(`손대고 있는 팀 — ${working.map((d) => `${TEAM_INFO[d].name} ${this.teamPercent[d]}%`).join(" · ")}`);
    } else if (this.signoffPending) {
      lines.push(`전 부서가 ${ME.callsign} 결재를 기다리는 중입니다.`);
    } else if (this.dayOver) {
      lines.push("오늘 잡힌 일은 다 끝났습니다. 남은 건 없어요.");
    }
    const done = Object.values(this.teamState).filter((s) => s === "마침").length;
    const blocked = Object.values(this.teamState).filter((s) => s === "자료 대기").length;
    lines.push(`마침 ${done}팀 · 자료 대기 ${blocked}팀 · 근무 ${this.present()}명.`);
    const next = STEP_NAMES[this.stepIndex + 1];
    if (next && !this.dayOver) lines.push(`이 다음은 ‘${next}’ 차례예요.`);
    this.addMsg("staff", lead.name, lines.join("\n"));
  }

  private sayBlocked() {
    const lead = LEADS.desk;
    const lines: string[] = [];
    if (this.signoffPending) {
      lines.push(`원인은 하나예요 — ${ME.callsign} 결재 대기입니다.`);
      lines.push("결재만 눌러주시면 바로 활동지 집필로 넘어갑니다.");
    }
    const working = Object.entries(this.teamState).filter(([, s]) => s === "작업 중");
    for (const [d] of working) lines.push(`${TEAM_INFO[d].name}: 진행률 ${this.teamPercent[d]}%. 정상 속도예요.`);
    const blocked = Object.entries(this.teamState).filter(([, s]) => s === "자료 대기").map(([d]) => d);
    for (const d of blocked) lines.push(`${TEAM_INFO[d].name}: ${PENDING_INPUT[d]}가 없어 오늘은 진행이 어려워요.`);
    if (!lines.length) lines.push("지연 없습니다.");
    this.addMsg("staff", lead.name, lines.join("\n"));
  }

  private sayTeam(deptId: string) {
    const lead = LEADS[deptId];
    const brief = TEAM_INFO[deptId];
    const status = this.teamState[deptId];
    const members = this.peopleIn(deptId).filter((a) => a.seed.rank === "member");
    const lines = [`${brief.name} · 지금 ${status}`];
    if (status === "작업 중") lines.push(`${brief.task} — 진행률 ${this.teamPercent[deptId]}%`);
    else if (status === "자료 대기") lines.push(`${PENDING_INPUT[deptId]}가 아직 없어요. 없는 수치는 만들지 않습니다.`);
    else if (status === "마침") lines.push(brief.report);
    else lines.push(`${brief.task} — 앞 단계를 기다리는 중입니다.`);
    if (members.length) lines.push(`팀원: ${members.map((m) => `${m.seed.name}(${m.status})`).join(" · ")}`);
    this.addMsg("staff", `${lead.name} · ${brief.name}`, lines.join("\n"));
    this.lightUp(deptId, 4);
  }

  private setFocusMode(keep: boolean) {
    this.focusOn = keep;
    const lead = LEADS.desk;
    if (keep) {
      for (const agent of this.people) {
        if (agent.id === "teacher" || agent.status === "출근 전" || agent.status === "회의 중") continue;
        if (!agent.seat) agent.seat = this.chairFor(agent);
        this.goTo(agent, agent.seat);
      }
      this.addMsg("staff", lead.name, "자리 지키기 켰습니다. 전원 제자리에서 하던 일만 봅니다.");
    } else {
      this.addMsg("staff", lead.name, "자리 지키기 풀었습니다. 다들 커피 한 잔 하고 오겠습니다 ☕");
    }
  }

  present() { return this.people.filter((a) => a.status !== "출근 전" && a.id !== "teacher").length; }

  setSpeed(v: number) { this.speed = v; }
  togglePause() { this.paused = !this.paused; }

  view(): ViewState {
    const values = Object.values(this.teamState);
    return {
      clock: this.hhmm(),
      stepName: STEP_NAMES[this.stepIndex],
      stepIndex: this.stepIndex,
      stepCount: STEP_COUNT,
      running: this.running,
      dayOver: this.dayOver,
      signoffPending: this.signoffPending,
      signedOff: this.signedOff,
      teamState: { ...this.teamState },
      stats: {
        present: this.present(),
        done: values.filter((v) => v === "마침").length,
        working: values.filter((v) => v === "작업 중").length,
        approval: values.filter((v) => v === "결재 대기").length,
        blocked: values.filter((v) => v === "자료 대기").length,
      },
      notes: this.notes.slice(0, 20),
      messages: this.messages.slice(-24),
      meetingName: this.meetingName,
      focusOn: this.focusOn,
      litSpace: this.litSpace,
    };
  }
}

