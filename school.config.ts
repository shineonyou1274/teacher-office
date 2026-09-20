// ══════════════════════════════════════════════════════════
//  AI 교무실 설정 — 이 파일 하나만 고치면 됩니다
// ══════════════════════════════════════════════════════════
//  학교 이름, 내 이름, 12개 부서, 직원까지 전부 여기 있습니다.
//  src/ 안의 파일은 건드리지 않아도 됩니다.
//
//  ⚠️ 규칙 2가지
//   1. 부서 id(research, design, ...)는 바꾸지 마세요. 엔진이 이걸로 움직입니다.
//      → 바꿔도 되는 건 name · icon · short · task · report 입니다.
//   2. 부서는 12개를 유지하세요. 교무실 배치가 12칸 고정입니다.
//      안 쓰는 부서는 지우지 말고 이름만 바꿔 쓰세요.
//
//  직원 수는 자유입니다. 한 팀에 팀장(lead) 1명만 두세요.
// ══════════════════════════════════════════════════════════

/** 학교·교사 기본 정보 */
export const SCHOOL = {
  /** 좌측 상단에 뜨는 이름 */
  name: "○○고등학교",
  /** 로고 배지 글자 1개 */
  badge: "校",
  /** 화면 상단 큰 제목 */
  title: "AI 교무실",
  /** 부제 한 줄 */
  subtitle: "12개 AI 팀이 수업을 준비하고, 선생님은 하루에 한 번만 결정합니다",
  /** 브라우저 탭 제목 */
  pageTitle: "AI 교무실",
  /** 창 하단 라벨 */
  windowLabel: "teacher_office — 교무실",
};

/** 선생님(나) — 교무실 자리에 앉아 있는 캐릭터 */
export const TEACHER = {
  name: "김선생",
  /** AI 직원들이 나를 부르는 호칭 */
  callsign: "선생님",
  role: "담당 교사 · 최종 결정",
  subject: "담당 과목을 적으세요",
  colors: ["#3b2f4a", "#7fb2a5", "#ffd98e"] as [string, string, string],
  thoughts: [
    "AI는 조교, 수업의 최종 판단은 내가 해요.",
    "오늘 결정할 건 딱 하나만 남기자.",
    "우리 반 아이들이 이걸 45분 안에 할 수 있나?",
  ],
};

/**
 * 부서 12개.
 * id = 고정 / name·short·icon·task·report = 자유
 */
export const DEPARTMENTS = [
  { id: "research",  name: "자료조사팀",    short: "research",  icon: "🔎", task: "교육정책·수업자료 수집",   report: "공식 출처로 확인된 것만 올려요." },
  { id: "learner",   name: "학습자 분석팀", short: "learner",   icon: "🧩", task: "우리 반 수준·반응 점검",   report: "데이터가 없으면 수치를 지어내지 않아요." },
  { id: "design",    name: "수업 설계팀",   short: "design",    icon: "💡", task: "오늘의 수업 아이디어 10개", report: "성취기준이 붙은 안만 TOP 3로 좁혀요." },
  { id: "review",    name: "교육과정 검수팀", short: "review",  icon: "🛡️", task: "성취기준·난이도·표현 검사", report: "기준에서 벗어난 안은 사유를 달아 반려해요." },
  { id: "write",     name: "활동지 집필팀", short: "write",     icon: "✍️", task: "승인된 안만 활동지로 집필", report: "선생님이 고른 안만 글로 옮겨요." },
  { id: "slide",     name: "수업자료 제작팀", short: "slide",   icon: "🎬", task: "슬라이드·영상 자료 구성",   report: "원본은 보존하고 사본만 만들어요." },
  { id: "print",     name: "학습지 디자인팀", short: "print",   icon: "🖨️", task: "인쇄용 학습지·정답지 정리", report: "정답지는 반드시 분리합니다." },
  { id: "assess",    name: "평가 문항팀",   short: "assess",    icon: "📝", task: "형성평가 문항·루브릭",     report: "정답이 보이는 선지는 뺍니다." },
  { id: "care",      name: "생활·상담팀",   short: "care",      icon: "🌱", task: "관찰 기록 정리 (익명)",     report: "학생은 익명 코드로만 적습니다." },
  { id: "comm",      name: "학부모·동료 소통팀", short: "comm", icon: "✉️", task: "가정통신문·협의 답장 초안", report: "초안까지만 씁니다. 발송은 선생님이 해요." },
  { id: "reflect",   name: "수업 성찰팀",   short: "reflect",   icon: "📈", task: "수업 후 반응·학습점 기록",  report: "잘 된 이유를 다음에 쓸 패턴으로 남겨요." },
  { id: "desk",      name: "교무 비서실",   short: "desk",      icon: "📋", task: "전체 한줄보고·최종 브리핑", report: "결정할 것만 남겨드려요." },
] as const;

export type DeptId = (typeof DEPARTMENTS)[number]["id"];

export type StaffEntry = {
  dept: string;
  rank: "lead" | "member";
  name: string;
  role: string;
  colors: [string, string, string]; // [머리, 옷, 포인트]
  thoughts: string[];
  callsign?: string;
};

/** 직원 명단 — 이름·말버릇을 우리 학교에 맞게 바꾸세요 */
export const STAFF: StaffEntry[] = [
  { dept: "research", rank: "lead", name: "정해린", role: "자료조사 팀장", callsign: "정조사",
    colors: ["#4a3328", "#f0e2c8", "#d98e6a"],
    thoughts: ["공식 문서 원문부터 확인해야 해.", "블로그 요약본은 출처로 안 쳐요.", "올해 기준인지부터 봅니다."] },
  { dept: "research", rank: "member", name: "윤도경", role: "정책 조사",
    colors: ["#2f2a3d", "#bcd6e8", "#7fb2a5"],
    thoughts: ["2022 개정 기준으로 다시 볼게요.", "작년 자료 그대로 쓰면 사고 납니다."] },
  { dept: "research", rank: "member", name: "서하진", role: "수업자료 수집",
    colors: ["#5a3b2e", "#d8ead2", "#d98e6a"],
    thoughts: ["저작권 표시부터 확인합니다.", "출처 없는 이미지는 안 씁니다."] },

  { dept: "learner", rank: "lead", name: "노은우", role: "학습자 분석 팀장", callsign: "노학습",
    colors: ["#372b4a", "#cfc4e8", "#8f7fd1"],
    thoughts: ["데이터 없으면 수치를 지어내지 않아요.", "'평균'보다 '어디서 막혔나'를 봅니다."] },
  { dept: "learner", rank: "member", name: "오시연", role: "수준 진단",
    colors: ["#3c3a4f", "#ffe6ef", "#8f7fd1"],
    thoughts: ["상위권 기준으로 짜면 절반이 놓쳐요.", "오답 유형부터 묶어볼게요."] },
  { dept: "learner", rank: "member", name: "김채운", role: "수업 반응 분석",
    colors: ["#2f2a3d", "#d8ead2", "#ffd98e"],
    thoughts: ["조용한 게 이해한 건 아니에요.", "활동 3분 넘으면 집중이 끊깁니다."] },

  { dept: "design", rank: "lead", name: "류지완", role: "수업 설계 팀장", callsign: "류설계",
    colors: ["#4a3328", "#ffe6ef", "#e2857f"],
    thoughts: ["성취기준 없는 활동은 그냥 놀이예요.", "10개 채우고 3개로 줄입니다.", "45분 안에 끝나는지 계산부터."] },
  { dept: "design", rank: "member", name: "한예솔", role: "활동 아이디어",
    colors: ["#372b4a", "#f0e2c8", "#7fb2a5"],
    thoughts: ["모둠 4명이면 무임승차가 나와요.", "준비물 3개 넘으면 다음 반에서 못 씁니다."] },
  { dept: "design", rank: "member", name: "차민결", role: "도입 발문",
    colors: ["#3b2f4a", "#cfc4e8", "#ffd98e"],
    thoughts: ["첫 3분에 못 잡으면 끝까지 못 잡아요.", "정답이 하나인 질문은 도입에 안 씁니다."] },

  { dept: "review", rank: "lead", name: "문가율", role: "교육과정 검수 팀장", callsign: "문검수",
    colors: ["#2f2a3d", "#d8ead2", "#e2857f"],
    thoughts: ["기준에서 벗어나면 아무리 재밌어도 반려예요.", "반려 사유는 한 줄로 답니다.", "출처 없는 문장은 통과 못 시켜요."] },
  { dept: "review", rank: "member", name: "배준서", role: "성취기준 대조",
    colors: ["#5a3b2e", "#ffe6ef", "#8f7fd1"],
    thoughts: ["성취기준 코드까지 맞춰야 진짜 대조예요.", "학년 범위 넘는 개념이 섞였는지 봅니다."] },
  { dept: "review", rank: "member", name: "신유하", role: "표현·난이도 검수",
    colors: ["#3c3a4f", "#f0e2c8", "#7fb2a5"],
    thoughts: ["금칙어 목록은 TEACHER_OFFICE.md 를 따릅니다.", "뭘 검수할 문서인지부터 물어봐요. 잣대가 다릅니다."] },

  { dept: "write", rank: "lead", name: "임서온", role: "활동지 집필 팀장", callsign: "임집필",
    colors: ["#3b2f4a", "#ffe6ef", "#ffd98e"],
    thoughts: ["승인 안 난 안은 안 씁니다.", "지시문은 한 문장, 예시는 반드시 하나."] },
  { dept: "write", rank: "member", name: "고다인", role: "활동지 원고",
    colors: ["#4a3328", "#cfc4e8", "#7fb2a5"],
    thoughts: ["빈칸이 너무 많으면 받아쓰기가 돼요.", "쓸 공간을 줄 수로 계산합니다."] },
  { dept: "write", rank: "member", name: "박이현", role: "발문 설계",
    colors: ["#372b4a", "#d8ead2", "#e2857f"],
    thoughts: ["왜 그렇게 생각했는지 묻는 칸을 꼭 넣어요.", "한 문항에 한 가지만 묻습니다."] },

  { dept: "slide", rank: "lead", name: "최로운", role: "수업자료 제작 팀장", callsign: "최자료",
    colors: ["#2f2a3d", "#f0e2c8", "#8f7fd1"],
    thoughts: ["원본은 건드리지 않고 사본으로 작업해요.", "슬라이드 한 장에 메시지는 하나."] },
  { dept: "slide", rank: "member", name: "황시우", role: "슬라이드 구성",
    colors: ["#5a3b2e", "#cfc4e8", "#ffd98e"],
    thoughts: ["뒷자리에서 안 보이면 폰트가 작은 거예요.", "글자 줄이고 그림 키웁니다."] },
  { dept: "slide", rank: "member", name: "양보미", role: "영상·자막",
    colors: ["#3c3a4f", "#ffe6ef", "#7fb2a5"],
    thoughts: ["2분 넘는 영상은 끊어서 씁니다.", "자막 없으면 뒷줄은 못 들어요."] },

  { dept: "print", rank: "lead", name: "진아윤", role: "학습지 디자인 팀장", callsign: "진인쇄",
    colors: ["#372b4a", "#e2857f", "#ffd98e"],
    thoughts: ["흑백 인쇄해도 구분되는지부터 봐요.", "정답지는 반드시 분리합니다."] },
  { dept: "print", rank: "member", name: "손태율", role: "레이아웃",
    colors: ["#4a3328", "#d8ead2", "#8f7fd1"],
    thoughts: ["여백이 없으면 필기를 못 해요.", "양면 인쇄 기준으로 짝수 장 맞춥니다."] },
  { dept: "print", rank: "member", name: "우가온", role: "교정",
    colors: ["#3b2f4a", "#f0e2c8", "#e2857f"],
    thoughts: ["오타 하나가 30장 복사됩니다.", "출력 전에 한 부만 뽑아볼게요."] },

  { dept: "assess", rank: "lead", name: "조하람", role: "평가 문항 팀장", callsign: "조평가",
    colors: ["#2f2a3d", "#bcd6e8", "#d98e6a"],
    thoughts: ["정답이 보이는 선지는 뺍니다.", "채점 기준을 먼저 쓰고 문항을 만들어요."] },
  { dept: "assess", rank: "member", name: "백서진", role: "루브릭",
    colors: ["#5a3b2e", "#ffe6ef", "#7fb2a5"],
    thoughts: ["'성실히'는 채점 기준이 아니에요.", "학생이 읽고 알 수 있게 씁니다."] },

  { dept: "care", rank: "lead", name: "강윤슬", role: "생활·상담 팀장", callsign: "강기록",
    colors: ["#372b4a", "#d8ead2", "#7fb2a5"],
    thoughts: ["학생은 익명 코드로만 적습니다.", "관찰한 사실만 쓰고 평가는 안 붙여요."] },
  { dept: "care", rank: "member", name: "표선우", role: "관찰 기록 정리",
    colors: ["#3c3a4f", "#cfc4e8", "#ffd98e"],
    thoughts: ["수업 끝나고 3분 안에 적어야 남아요.", "기억은 왜곡돼요. 그날 적은 것만 믿습니다."] },

  { dept: "comm", rank: "lead", name: "남주원", role: "소통 팀장", callsign: "남소통",
    colors: ["#2f2a3d", "#ffe6ef", "#e2857f"],
    thoughts: ["초안까지만 씁니다. 발송은 선생님이 해요.", "학생 실명은 절대 문서에 안 남겨요."] },
  { dept: "comm", rank: "member", name: "하승민", role: "답장 초안",
    colors: ["#5a3b2e", "#bcd6e8", "#8f7fd1"],
    thoughts: ["감정이 실린 문의엔 사실부터 정리합니다.", "약속은 제가 못 해요. 선생님 확인 필요."] },

  { dept: "reflect", rank: "lead", name: "도연우", role: "수업 성찰 팀장", callsign: "도성찰",
    colors: ["#4a3328", "#f0e2c8", "#7fb2a5"],
    thoughts: ["잘된 이유를 못 적으면 다음에 반복 못 해요.", "망한 수업이 제일 자료가 많습니다."] },
  { dept: "reflect", rank: "member", name: "민세온", role: "반응 수집",
    colors: ["#3b2f4a", "#d8ead2", "#ffd98e"],
    thoughts: ["끝나고 손들기 말고 쪽지로 받아요.", "조용한 학생 반응이 진짜 신호입니다."] },

  { dept: "desk", rank: "lead", name: "유가을", role: "교무 비서실장", callsign: "유비서",
    colors: ["#3b2f4a", "#e2857f", "#ffd98e"],
    thoughts: ["선생님이 결정할 건 오늘 하나로 줄일게요.", "막힌 이유는 하나만 짚어 말씀드려요.", "'열심히 하고 있습니다'는 보고가 아니에요."] },
  { dept: "desk", rank: "member", name: "안리아", role: "보고 취합",
    colors: ["#3c3a4f", "#cfc4e8", "#7fb2a5"],
    thoughts: ["12개 팀 보고를 한 장으로 줄입니다.", "숫자 없는 보고는 다시 받아와요."] },
];

/** 아직 외부 연동이 안 된 팀 → 화면에 '자료 대기'로 표시 */
export const PENDING: Record<string, string> = {
  learner: "학급 반응 데이터",
  comm: "메일 연동",
};

/** 결과물 보관함 링크 (비우면 버튼이 숨겨집니다) */
export const STORAGE_LINK = "";

/**
 * 화면 맨 아래 크레딧.
 * 이 프로그램은 자유 라이선스입니다. 마음대로 고치고 이름 붙여 쓰세요.
 */
export const CREDITS = {
  maker: { name: "", note: "", links: [] as { icon: string; label: string; url: string }[] },
};
