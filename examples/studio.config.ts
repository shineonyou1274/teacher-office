// ══════════════════════════════════════════════════════════
//  실제로 쓰는 설정 예시 — 연수 · 바이브코딩 · 영상
// ══════════════════════════════════════════════════════════
//  빈 템플릿보다 채워진 예시가 고치기 쉽습니다. 이 파일은
//  "연수 아이디어와 흐름을 고민하고, 그날그날 코딩과 영상을 한다"는
//  실제 하루를 그대로 옮긴 것입니다.
//
//  쓰려면 이 파일을 school.config.ts 에 덮어쓰세요.
//    복사 전 원본을 남겨두시면 되돌리기 쉽습니다.
//
//  이 예시의 특징
//   - 부서 11개 (12개를 억지로 채우지 않았습니다)
//   - 웹을 뒤지기 전에 **내 구글 드라이브부터** 봅니다 (gws)
//   - **1차 추리기는 사람이** 합니다. AI가 먼저 거르지 않습니다
//   - 결재는 하루 한 번, **흐름안 고르기** 자리입니다
//   - 영상은 **이미 쓰던 스킬 흐름 그대로** 옮겼습니다
//       기획안 → master-sheet → storyboard-v1/v2 → seedance → 매일 한 화씩
//   - 코딩과 아직 연동 안 된 자동 생성은 PENDING 에 둬서 '자료 대기'로 뜹니다
// ══════════════════════════════════════════════════════════

/** 학교·교사 기본 정보 */
export const SCHOOL = {
  /** 좌측 상단에 뜨는 이름 */
  name: "Shiny Vibe Studio",
  /** 로고 배지 글자 1개 */
  badge: "S",
  /** 화면 상단 큰 제목 */
  title: "AI 교무실 — 연수·코딩·영상",
  /** 부제 한 줄 */
  subtitle: "연수·코딩·영상을 11개 팀이 나눠 맡고, 고르는 건 하루에 한 번 — 흐름안입니다",
  /** 브라우저 탭 제목 */
  pageTitle: "AI 교무실",
  /** 창 하단 라벨 */
  windowLabel: "teacher_office — 교무실",
};

/** 선생님(나) — 교무실 자리에 앉아 있는 캐릭터 */
export const TEACHER = {
  name: "Shiny",
  /** AI 직원들이 나를 부르는 호칭 */
  callsign: "선생님",
  role: "담당 교사 · 최종 결정",
  subject: "고교 영어·진로 · 바이브코딩 · AI 영상",
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
  { id: "drive",    name: "내 드라이브팀",  short: "drive",    icon: "📁", task: "내 구글 드라이브에서 먼저 찾기 (gws)",  report: "이미 있는 것부터 꺼냈어요. 새로 안 만듭니다." },
  { id: "websearch",name: "웹 자료팀",      short: "search",   icon: "🔎", task: "바깥 자료 보태기 + 출처 확인",          report: "출처 확인된 것만 올렸어요." },
  { id: "plan",     name: "세부 기획팀",    short: "plan",     icon: "🧭", task: "연수 흐름·시간 배분 같이 조정",         report: "흐름안 3개, 꼭지별 분 단위까지 붙였어요." },
  { id: "slide",    name: "연수 자료팀",    short: "slide",    icon: "📊", task: "슬라이드 + 그 자리에서 해볼 것",        report: "꼭지마다 따라 할 것 하나씩 넣었어요." },
  { id: "code",     name: "바이브코딩팀",   short: "code",     icon: "💻", task: "그날 만들 도구·앱",                     report: "돌아가는 것만 넘깁니다." },
  { id: "story",    name: "영상 스토리팀",  short: "story",    icon: "🎬", task: "기획안 → 마스터 시트 → 콘티 (같이 짠다)",  report: "이미 쓰던 스킬 그대로 — master-sheet, storyboard." },
  { id: "auto",     name: "자동 생성팀",    short: "auto",     icon: "⚙️", task: "콘티 → Seedance 프롬프트 → 생성",       report: "연결 안 된 건 '미연동'이라고 적어요." },
  { id: "serial",   name: "연재 관리팀",    short: "serial",   icon: "📅", task: "오늘 올릴 1개 + 다음 화 대기열",        report: "올리는 건 선생님이 합니다. 저는 준비까지." },
  { id: "review",   name: "검수팀",         short: "review",   icon: "🛡️", task: "만든 것을 기준 A·B·C로 검사",          report: "반려 사유와 고칠 자리를 같이 적어요." },
  { id: "reflect",  name: "반응 기록팀",    short: "reflect",  icon: "📈", task: "연수·연재 반응 → 다음에 쓸 패턴",       report: "잘된 이유를 조건까지 적어 남겨요." },
  { id: "desk",     name: "비서실",         short: "desk",     icon: "📋", task: "전체 한줄보고 + 오늘 결정할 1개",       report: "결정할 것만 남겨드려요." },
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
  { dept: "drive", rank: "lead", name: "정해린", role: "드라이브 팀장", callsign: "정서랍",
    colors: ["#4a3328", "#f0e2c8", "#d98e6a"],
    thoughts: ["gws 로 내 드라이브부터 훑습니다.", "새로 만들기 전에 있는 것부터 찾아요.", "어디에 뒀는지가 반이에요."] },
  { dept: "drive", rank: "member", name: "윤도경", role: "지난 자료 정리",
    colors: ["#2f2a3d", "#bcd6e8", "#7fb2a5"],
    thoughts: ["반응 좋았던 꼭지를 먼저 꺼내요.", "고쳐 쓸 수 있는 건 새로 안 만듭니다."] },

  { dept: "websearch", rank: "lead", name: "서하진", role: "웹 자료 팀장", callsign: "서웹",
    colors: ["#5a3b2e", "#d8ead2", "#d98e6a"],
    thoughts: ["원문부터 확인하고 요약은 그다음이에요.", "올해 기준인지부터 봅니다.", "저작권 표시 없는 이미지는 안 씁니다."] },
  { dept: "websearch", rank: "member", name: "오시연", role: "사례 수집",
    colors: ["#3c3a4f", "#ffe6ef", "#8f7fd1"],
    thoughts: ["자랑 글 말고 불평 글에서 막힌 지점이 보여요.", "남의 연수 후기를 먼저 읽습니다."] },

  { dept: "plan", rank: "lead", name: "류지완", role: "세부 기획 팀장", callsign: "류흐름",
    colors: ["#4a3328", "#ffe6ef", "#e2857f"],
    thoughts: ["도입 3분을 자기소개로 쓰면 거기서 끝나요.", "꼭지마다 몇 분인지 안 적으면 반드시 넘깁니다.", "흐름은 하나로 안 정하고 세 개를 놓고 봅니다."] },
  { dept: "plan", rank: "member", name: "한예솔", role: "꼭지 배치",
    colors: ["#372b4a", "#f0e2c8", "#7fb2a5"],
    thoughts: ["앞뒤 꼭지가 이어지는지부터 봐요.", "한 꼭지에 두 가지를 넣으면 둘 다 안 남습니다."] },
  { dept: "plan", rank: "member", name: "차민결", role: "실습 설계",
    colors: ["#3b2f4a", "#cfc4e8", "#ffd98e"],
    thoughts: ["듣기만 하는 연수는 끝나면 남는 게 없어요.", "그 자리에서 따라 할 수 있어야 실습입니다."] },

  { dept: "slide", rank: "lead", name: "최로운", role: "연수 자료 팀장", callsign: "최자료",
    colors: ["#2f2a3d", "#f0e2c8", "#8f7fd1"],
    thoughts: ["슬라이드 한 장에 메시지는 하나.", "읽는 슬라이드는 아무도 안 봅니다.", "원본은 두고 사본으로 작업해요."] },
  { dept: "slide", rank: "member", name: "황시우", role: "화면 구성",
    colors: ["#5a3b2e", "#cfc4e8", "#ffd98e"],
    thoughts: ["뒷자리에서 안 보이면 글자가 작은 거예요.", "글자 줄이고 그림 키웁니다."] },

  { dept: "code", rank: "lead", name: "임서온", role: "바이브코딩 팀장", callsign: "임코딩",
    colors: ["#3b2f4a", "#ffe6ef", "#ffd98e"],
    thoughts: ["돌아가는 것만 넘깁니다. 안 돌면 안 넘겨요.", "만들기 전에 어디에 쓸지부터 정해요.", "한 번에 하나씩 고치고 확인합니다."] },
  { dept: "code", rank: "member", name: "고다인", role: "화면·배포",
    colors: ["#4a3328", "#cfc4e8", "#7fb2a5"],
    thoughts: ["남이 받아서 5분 안에 켜져야 도구예요.", "설치 안내가 길면 아무도 안 씁니다."] },

  { dept: "story", rank: "lead", name: "양보미", role: "영상 스토리 팀장", callsign: "양스토리",
    colors: ["#3c3a4f", "#ffe6ef", "#7fb2a5"],
    thoughts: ["기획안만 있으면 스토리는 같이 짜요. 혼자 안 정합니다.", "인물이 흔들리면 마스터 시트부터 다시 뽑아요.", "한 화에 하나만 남기고 나머지는 다음 화로."] },
  { dept: "story", rank: "member", name: "박이현", role: "화별 쪼개기",
    colors: ["#372b4a", "#d8ead2", "#e2857f"],
    thoughts: ["연재는 끊는 자리가 절반이에요.", "다음 화가 궁금해야 이어서 봅니다."] },

  { dept: "auto", rank: "lead", name: "우가온", role: "자동 생성 팀장", callsign: "우자동",
    colors: ["#3b2f4a", "#f0e2c8", "#e2857f"],
    thoughts: ["연결 안 된 건 '미연동'이라고 적습니다. 됐다고 안 해요.", "콘티가 흔들리면 생성도 흔들려요. 앞으로 돌려보냅니다.", "실패하면 실패했다고 적고 다시 겁니다."] },

  { dept: "serial", rank: "lead", name: "민세온", role: "연재 관리 팀장", callsign: "민연재",
    colors: ["#3b2f4a", "#d8ead2", "#ffd98e"],
    thoughts: ["오늘 올릴 건 하나면 됩니다. 몰아 올리면 다음 날이 빕니다.", "다음 화 대기열을 늘 하나는 채워둬요.", "올리는 건 선생님이 합니다. 저는 준비까지."] },
  { dept: "serial", rank: "member", name: "안리아", role: "대기열 관리",
    colors: ["#3c3a4f", "#cfc4e8", "#7fb2a5"],
    thoughts: ["오늘 몇 화인지부터 적습니다.", "밀린 화가 셋 넘으면 말씀드려요."] },

  { dept: "review", rank: "lead", name: "문가율", role: "검수 팀장", callsign: "문검수",
    colors: ["#2f2a3d", "#d8ead2", "#e2857f"],
    thoughts: ["뭘 검수할 문서인지부터 물어봐요. 잣대가 다릅니다.", "반려 사유는 한 줄, 고칠 자리는 꼭 같이 적어요.", "기계 검사에서 걸리면 제가 괜찮다고 해도 반려예요."] },
  { dept: "review", rank: "member", name: "신유하", role: "표현·말투 검수",
    colors: ["#3c3a4f", "#f0e2c8", "#7fb2a5"],
    thoughts: ["금칙어 목록은 TEACHER_OFFICE.md 를 따릅니다.", "듣는 사람에게 명령하는 말투를 걸러냅니다."] },

  { dept: "reflect", rank: "lead", name: "도연우", role: "반응 기록 팀장", callsign: "도성찰",
    colors: ["#4a3328", "#f0e2c8", "#7fb2a5"],
    thoughts: ["잘된 이유를 못 적으면 다음에 반복 못 해요.", "망한 연수가 제일 자료가 많습니다.", "'좋았다'만 쓰면 아무것도 안 남아요."] },

  { dept: "desk", rank: "lead", name: "유가을", role: "비서실장", callsign: "유비서",
    colors: ["#3b2f4a", "#e2857f", "#ffd98e"],
    thoughts: ["오늘 결정할 건 하나로 줄여드릴게요.", "막힌 이유는 하나만 짚어 말씀드려요.", "숫자 없는 보고는 다시 받아옵니다."] },
  { dept: "desk", rank: "member", name: "백서진", role: "보고 취합",
    colors: ["#5a3b2e", "#ffe6ef", "#7fb2a5"],
    thoughts: ["열한 팀 보고를 한 장으로 줄입니다.", "중복 설명을 지우는 게 절반이에요."] },
];

/**
 * 하루 순서 — **이 교무실이 선생님 업무 순서대로 돌게 하는 곳입니다.**
 *
 * 위 DEPARTMENTS 가 "누가 있나"라면, 여기는 "무엇을 먼저 하나"입니다.
 * 이걸 안 고치면 팀 이름만 바꾼 채 남의 순서대로 돌아갑니다.
 *
 * 순서를 바꾸고 싶으면 줄 순서를 바꾸세요. 단계를 빼려면 줄을 지우고,
 * 더하려면 줄을 늘리면 됩니다. 화면이 알아서 따라갑니다.
 *
 * kind 를 안 적으면 그냥 지나가는 단계입니다.
 *   출근   — 전원이 복도를 지나 자리로 갑니다 (하루에 한 번)
 *   결재   — **선생님이 버튼을 누를 때까지 멈춥니다** (하루에 한 번)
 *   브리핑 — 그 팀 팀장이 교무실로 걸어와 보고합니다
 *   종료   — 하루를 닫습니다
 */
export type DayStep = {
  title: string;
  /** 이 단계에서 일하는 팀 id. 없으면 화면 표시만 바뀝니다 */
  team?: string;
  /** 화면에서 몇 초쯤 걸리게 할지 */
  secs?: number;
  kind?: "출근" | "결재" | "브리핑" | "종료";
  /** 기록에 남길 한 줄 (선택) */
  note?: string;
  /** 결재 단계에서 협의회실에 모일 팀장들 */
  attendees?: string[];
};

export const DAY_PLAN: DayStep[] = [
  { title: "출근 전" },
  { title: "08:00 전원 출근", kind: "출근" },
  { title: "내 드라이브에서 찾기", team: "drive", secs: 5 },
  { title: "웹에서 보태기", team: "websearch", secs: 6 },
  { title: "1차 추리기 — 선생님이 직접", secs: 2,
    note: "모인 자료를 선생님이 먼저 훑는 자리입니다. 여기서 안 걸러진 게 뒤로 넘어갑니다." },
  { title: "AI와 세부 기획 조정", team: "plan", secs: 8 },
  { title: "흐름안 고르기", kind: "결재", team: "plan", attendees: ["plan", "review", "desk"] },
  { title: "연수 자료 만들기", team: "slide", secs: 7 },
  { title: "바이브코딩", team: "code", secs: 6 },
  { title: "AI와 영상 스토리 짜기", team: "story", secs: 7 },
  { title: "자동 생성에 넘기기", team: "auto", secs: 4 },
  { title: "오늘 연재분 준비", team: "serial", secs: 4 },
  { title: "만든 것 검수", team: "review", secs: 6 },
  { title: "반응 기록", team: "reflect", secs: 4 },
  { title: "한 줄 보고", team: "desk", kind: "브리핑" },
  { title: "업무 종료", kind: "종료" },
];

/** 아직 외부 연동이 안 된 팀 → 화면에 '자료 대기'로 표시 */
export const PENDING: Record<string, string> = {
  code: "오늘 만들 도구 (안 하는 날은 이대로 두세요)",
  auto: "영상 생성 도구 연동 (이 교무실과 아직 연결 안 됨)",
};

/** 결과물 보관함 링크 (비우면 버튼이 숨겨집니다) */
export const STORAGE_LINK = "";

/**
 * 화면 맨 아래 크레딧.
 *
 * ⚠️ copyright 줄은 지우지 마세요. 이 프로그램의 저작권 표시입니다.
 *    학교 이름·부서·직원·사규는 마음대로 바꾸셔도 됩니다.
 */
type Credit = {
  name: string;
  note?: string;
  links?: { icon: string; label: string; url: string }[];
};

export const CREDITS: { copyright: { year: string; holder: string; links?: Credit["links"] }; maker: Credit } = {
  /** 저작권 표시 — 지우지 마세요 */
  copyright: {
    year: "2026",
    holder: "Shiny Peace",
    links: [
      { icon: "📷", label: "@shiny.vibe_logic", url: "https://www.instagram.com/shiny.vibe_logic/" },
      { icon: "🧵", label: "Threads", url: "https://www.threads.com/@shiny.vibe_logic" },
    ],
  },
  /** 이 교무실을 쓰는 나 — 이름을 비우면 이 줄은 안 나옵니다 */
  maker: { name: "", note: "", links: [] },
};
