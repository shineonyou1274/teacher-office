import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CREDITS, DEPARTMENTS, SCHOOL, STORAGE_LINK } from "../school.config";
import Canvas from "./engine/Canvas";
import { Office, STEP_NAMES, type Msg, type ViewState } from "./engine/sim";
import { configWarnings, FRONT_DESK, ME, ROSTER } from "./engine/staff";
import { ago, loadLive, type Live } from "./engine/live";

const SOURCE_LABEL: Record<NonNullable<Msg["source"]>, string> = {
  rule: "규칙",
  note: "안내",
};

const QUICK = [
  { label: "어디까지 됐어?", cmd: "어디까지 됐어?" },
  { label: "막힌 데 있어?", cmd: "막힌 데 있어?" },
  { label: "검수팀 상황", cmd: "검수팀 상황" },
  { label: "자리 지키기", cmd: "자리 지키기" },
];

/** 크레딧 줄에 붙는 링크들. 없으면 아무것도 안 그린다 */
function CreditLinks({ links }: { links?: { icon: string; label: string; url: string }[] }) {
  if (!links?.length) return null;
  return (
    <span className="links">
      {links.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.icon} {l.label}</a>
      ))}
    </span>
  );
}

export default function App() {
  const office = useMemo(() => new Office(), []);
  const [snap, setSnap] = useState<ViewState>(() => office.view());
  const [elapsed, setElapsed] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const problems = useMemo(() => configWarnings(), []);
  const [live, setLive] = useState<Live | null>(null);

  // 실제 작업 기록(public/state.json)을 읽는다. 없으면 각본만 돈다.
  // 기록이 생긴 뒤로는 5초마다, 그 전에는 20초마다 본다.
  // 파일이 없는 게 기본이라, 없을 때 5초마다 두드리면 헛일이라서다
  useEffect(() => {
    let alive = true;
    let timer = 0;
    const read = () => {
      loadLive().then((next) => {
        if (!alive) return;
        setLive(next);
        timer = window.setTimeout(read, next ? 5000 : 20000);
      });
    };
    read();
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);

  // 애니메이션 루프 — 화면 갱신은 초당 20번이면 충분합니다
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      office.tick(dt);
      acc += dt;
      setElapsed((e) => e + dt);
      if (acc > 0.05) { setSnap(office.view()); acc = 0; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [office]);

  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [snap.messages.length]);

  const send = useCallback((text: string) => {
    const value = text.trim();
    if (!value) return;
    office.ask(value);
    setDraft("");
  }, [office]);

  const agent = picked ? office.byId.get(picked) ?? null : null;
  const progress = Math.round((snap.stepIndex / (STEP_NAMES.length - 1)) * 100);

  if (problems.length) {
    return (
      <main className="shell">
        <section className="panel error">
          <h1>설정을 확인해주세요</h1>
          <p><code>school.config.ts</code> 에 문제가 있어 교무실을 열지 못했습니다.</p>
          <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="badge">{SCHOOL.badge}</span>
          <div>
            <b>{SCHOOL.name}</b>
            <small>{SCHOOL.windowLabel}</small>
          </div>
        </div>
        <div className="clock">
          <span>{snap.clock}</span>
          <small>{snap.stepName}</small>
        </div>
      </header>

      <section className="panel hero">
        <h1>{SCHOOL.title}</h1>
        <p>{SCHOOL.subtitle}</p>
        <div className="bar"><i style={{ width: `${progress}%` }} /></div>
        <div className="chips">
          <span className="chip">근무 {snap.stats.present}명</span>
          <span className="chip mint">마친 팀 {snap.stats.done}</span>
          <span className="chip yellow">작업 중 {snap.stats.working}팀</span>
          <span className="chip lav">자료 대기 {snap.stats.blocked}팀</span>
          {snap.focusOn ? <span className="chip pink">자리 지키는 중</span> : null}
        </div>

        {live ? (
          <div className="livebar">
            <b>실제 작업 기록을 읽는 중</b>
            <span>
              {live.log[0]
                ? `${live.log[0].note} · ${ago(live.log[0].at)}`
                : "아직 기록이 없습니다"}
            </span>
            <small>‘기록’이 붙은 팀은 각본이 아니라 실제 검사 결과입니다</small>
          </div>
        ) : null}
      </section>

      <section className="panel controls">
        {!snap.running && !snap.dayOver ? (
          <button className="btn primary" onClick={() => office.start()}>오늘 업무 시작</button>
        ) : (
          <button className="btn" onClick={() => office.togglePause()}>
            {office.paused ? "▶ 계속" : "❚❚ 일시정지"}
          </button>
        )}
        <div className="speeds">
          {[1, 2, 4].map((v) => (
            <button key={v} className={`btn tiny ${office.speed === v ? "on" : ""}`}
              onClick={() => office.setSpeed(v)}>{v}x</button>
          ))}
        </div>
        {snap.signoffPending ? (
          <button className="btn signOff" onClick={() => office.signOff()}>
            ★ 오늘 결정할 1건 — 결재하기
          </button>
        ) : (
          <span className="muted">
            {snap.dayOver ? "오늘 업무가 끝났습니다" : "선생님이 결정할 건 하루에 한 번입니다"}
          </span>
        )}
        {STORAGE_LINK ? <a className="btn tiny" href={STORAGE_LINK} target="_blank" rel="noreferrer">결과물 보관함</a> : null}
      </section>

      <div className="layout">
        <section className="panel stage">
          <div className="stage-scroll">
            <Canvas people={office.people} snap={snap} elapsed={elapsed} onPick={setPicked} />
          </div>
          <small className="hint">직원을 클릭하면 프로필이 열립니다</small>
        </section>

        <aside className="rail">
          <section className="panel console">
            <div className="panel-bar">🎤 선생님 지시창</div>
            <div className="messages" ref={feedRef}>
              {snap.messages.map((entry) => (
                <div key={entry.id} className={`line ${entry.from}`}>
                  <b>
                    {entry.from === "me" ? ME.callsign : entry.name}
                    {entry.source ? <i className={`src ${entry.source}`}>{SOURCE_LABEL[entry.source]}</i> : null}
                  </b>
                  <p>{entry.text}</p>
                  <small>{entry.time}</small>
                </div>
              ))}
            </div>
            <div className="quick">
              {QUICK.map((q) => (
                <button key={q.label} onClick={() => send(q.cmd)}>{q.label}</button>
              ))}
            </div>
            <form className="ask" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder="예: 검수팀 상황 / 막힌 데 있어?" aria-label="선생님 지시 입력" />
              <button className="btn primary tiny" type="submit">지시</button>
            </form>
          </section>

          <section className="panel feed">
            <div className="panel-bar">📋 오늘 기록</div>
            <ul>
              {snap.notes.map((l) => (
                <li key={l.id}><span className="t">{l.time}</span> <span className={`tone ${l.tone}`}>{l.icon}</span> {l.text}</li>
              ))}
            </ul>
          </section>

          <section className="panel roster">
            <div className="panel-bar">🧑‍🏫 부서 현황</div>
            <ul>
              {DEPARTMENTS.map((d) => {
                // 실제 기록이 있으면 각본보다 그걸 믿는다
                const real = live?.teams[d.id];
                const state = real?.state ?? snap.teamState[d.id];
                return (
                  <li key={d.id} title={real ? `${real.note} (${ago(real.at)})` : undefined}>
                    <span>{d.icon} {d.name}{real ? <b className="real">기록</b> : null}</span>
                    <em className={`st ${state?.replace(/\s/g, "")}`}>{state}</em>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>

      {agent ? (
        <div className="modal-back" onClick={() => setPicked(null)}>
          <div className="panel modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-bar">
              {agent.seed.name} · {agent.seed.role}
              <button onClick={() => setPicked(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="who">
                {DEPARTMENTS.find((d) => d.id === agent.seed.deptId)?.name}
                {agent.seed.callsign ? ` · 코드명 ${agent.seed.callsign}` : ""}
              </p>
              <p className="st-row">지금 상태 — <b>{agent.status}</b></p>
              <ul className="thoughts">
                {agent.seed.thoughts.map((t) => <li key={t}>“{t}”</li>)}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {snap.meetingName ? <div className="toast">🗣️ {snap.meetingName} — 협의회실</div> : null}

      <footer>
        {/* 이름을 안 넣었으면 아무것도 안 그린다.
            넣는 법은 school.config.ts 주석과 README 에 있지, 화면에 있을 말이 아니다 */}
        {CREDITS.maker.name ? (
          <p className="mine">
            <b>{SCHOOL.name} — {CREDITS.maker.name}</b>
            {CREDITS.maker.note ? <span> · {CREDITS.maker.note}</span> : null}
            <CreditLinks links={CREDITS.maker.links} />
          </p>
        ) : null}

        {/* 저작권 표시 — 지우지 않는 줄 */}
        <p className="origin">
          <span>© {CREDITS.copyright.year} {CREDITS.copyright.holder}. All rights reserved.</span>
          <CreditLinks links={CREDITS.copyright.links} />
        </p>

        <p className="tiny-note">
          {DEPARTMENTS.length}개 부서 · AI 직원 {ROSTER.length}명 · 비서 {FRONT_DESK.name}
        </p>
      </footer>
    </main>
  );
}
