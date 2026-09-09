/* ==========================================================================
   토마토 셀프 계산대 · 프로토타입 로직
   1. CONFIG   운영 옵션 (localStorage 저장)
   2. DATA     상품 · 회원 · 쿠폰 · 봉투
   3. STATE    화면과 장바구니 상태
   4. UTIL     포맷과 DOM 헬퍼
   5. CART     장바구니와 금액 계산
   6. RENDER   기본 화면 그리기
   7. MODAL    화면 정의와 전이
   8. SCANNER  바코드 입력
   9. INIT     초기화와 이벤트 연결
   ========================================================================== */

/* ==========================================================================
   1. CONFIG
   ========================================================================== */

const STORAGE_KEY = "tomato-kiosk-options";

/* 실제 매장 배포 시의 기본값 */
const OPERATION_DEFAULTS = {
  selfCheckout: true,
  useMemberLogin: true,
  useDirectSelect: true,
  blockSignup: false,
  usePointEarn: true,
  useCash: false,
  blockAgeRestricted: false,
  useBag: false,
  timeoutSec: 0,
};

/* 시연용 기본값 : 봉투와 현금결제를 켜 두어 기능을 모두 보여준다. */
const DEMO_DEFAULTS = {
  selfCheckout: true,
  useMemberLogin: true,
  useDirectSelect: true,
  blockSignup: false,
  usePointEarn: true,
  useCash: true,
  blockAgeRestricted: false,
  useBag: true,
  timeoutSec: 0,
};

const OPTION_META = [
  {
    key: "useMemberLogin",
    name: "셀프계산대 회원 로그인 사용",
    desc: "끄면 회원 혜택 확인 화면과 로그인·가입·포인트 화면을 건너뛰고 선택한 결제수단으로 바로 결제합니다. (운영 기본값 ON)",
    type: "toggle",
  },
  {
    key: "useDirectSelect",
    name: "상품직접선택 사용",
    desc: "끄면 우측 상품 직접 선택 영역을 숨기고 상품 담기 영역이 가로 전체를 채웁니다. (운영 기본값 ON)",
    type: "toggle",
  },
  {
    key: "selfCheckout",
    name: "셀프계산대 사용",
    desc: "POS 소형 모니터에 셀프 전환 메뉴를 노출합니다. 꺼지면 키오스크 모드로 진입할 수 없습니다. (운영 기본값 ON)",
    type: "toggle",
  },
  {
    key: "blockSignup",
    name: "신규회원 가입 금지",
    desc: "켜면 03-A 의 휴대폰 가입 타일과 APP 설치 QR, 03-B 의 가입 버튼이 모두 사라집니다. (운영 기본값 OFF)",
    type: "toggle",
  },
  {
    key: "usePointEarn",
    name: "고객적립 사용",
    desc: "끄면 결제 완료 화면의 적립 포인트가 0P 로 표시되고 적립 제외 안내가 함께 나옵니다. (운영 기본값 ON)",
    type: "toggle",
  },
  {
    key: "useCash",
    name: "현금결제 사용",
    desc: "기존 명칭 '현금소계할인 사용'. 끄면 현금결제 타일이 비활성으로 표시됩니다. (운영 기본값 OFF)",
    type: "toggle",
  },
  {
    key: "blockAgeRestricted",
    name: "연령제한상품 판매불가",
    desc: "켜면 연령제한 상품을 무조건 차단합니다. 끄면 관리자 승인 절차로 넘어갑니다. (운영 기본값 OFF)",
    type: "toggle",
  },
  {
    key: "useBag",
    name: "봉투판매 사용",
    desc: "끄면 봉투 구매 버튼이 비활성이 됩니다. 등록된 봉투만 최대 4종까지 노출합니다. (운영 기본값 OFF)",
    type: "toggle",
  },
  {
    key: "timeoutSec",
    name: "타임아웃 (초)",
    desc: "무조작이 이어지면 전체를 초기화합니다. 0 이면 사용하지 않습니다. 만료 10초 전에 경고를 띄웁니다.",
    type: "number",
  },
];

function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { ...DEMO_DEFAULTS };
    }
    return { ...DEMO_DEFAULTS, ...JSON.parse(saved) };
  } catch (error) {
    return { ...DEMO_DEFAULTS };
  }
}

function saveConfig(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

const CONFIG = loadConfig();

/* ==========================================================================
   2. DATA
   ========================================================================== */

/*
  ERP 에 1:1 로 등록된 상품 이미지 경로.
  실제 연동 시 product.image 에 ERP 이미지 URL 을 넣으면 그대로 표시된다.
  값이 없으면 빈 이미지 자리가 유지된다.
*/
const IMAGE_BASE = "assets/img/";
const IMAGE_EXTS = ["jpg", "png", "webp"];

/* 상품 id 에 맞춘 파일을 확장자 순서대로 찾아본다. */
function imageSources(id) {
  return IMAGE_EXTS.map((ext) => `${IMAGE_BASE}${id}.${ext}`);
}

const STORE = {
  name: "토마토마트 본점",
  kioskNo: 3,
  managerPhone: "010-9364-7929",
  pointMin: 1000,
  pointUnit: 10,
  signupBonus: 2000,
  earnRate: 0.01,
  receiptTimeoutSec: 8,
};

const CATEGORIES = ["라면", "음료", "냉장", "과자", "생활용품", "주류"];

/*
  라면 25개 중 앞 20개가 '라면기획전' 대상이다.
  프리셋은 페이지당 10개(2열 × 5행)이므로 라면은 10 / 10 / 5 로 나뉜다.
*/
const PRODUCTS = [
  // ── 라면 25 ──────────────────────────────────────────────────────────────
  {
    id: "r01",
    cat: "라면",
    name: "신라면 블랙 사골곰탕 멀티팩 (4봉)",
    price: 6980,
    sale: 6480,
    barcode: "8801043001101",
  },
  {
    id: "r02",
    cat: "라면",
    name: "진라면 매운맛 멀티팩 (5개입)",
    price: 3480,
    barcode: "8801043001102",
  },
  {
    id: "r03",
    cat: "라면",
    name: "안성탕면 멀티팩 (5개입)",
    price: 3280,
    barcode: "8801043001103",
  },
  {
    id: "r04",
    cat: "라면",
    name: "너구리 얼큰한 해물맛 멀티팩 (5개입)",
    price: 4180,
    sale: 3880,
    barcode: "8801043001104",
  },
  {
    id: "r05",
    cat: "라면",
    name: "짜파게티 오리지널 멀티팩 (5개입)",
    price: 4280,
    barcode: "8801043001105",
  },
  {
    id: "r06",
    cat: "라면",
    name: "오징어짬뽕 얼큰한 해물맛 멀티팩 (4개입)",
    price: 4580,
    barcode: "8801043001106",
  },
  {
    id: "r07",
    cat: "라면",
    name: "무파마탕면 멀티팩 (4개입)",
    price: 4380,
    barcode: "8801043001107",
  },
  {
    id: "r08",
    cat: "라면",
    name: "삼양라면 오리지널 (5개입)",
    price: 3180,
    barcode: "8801043001108",
  },
  {
    id: "r09",
    cat: "라면",
    name: "불닭볶음면 오리지널 (5개입)",
    price: 5180,
    sale: 4680,
    barcode: "8801043001109",
  },
  {
    id: "r10",
    cat: "라면",
    name: "까르보 불닭볶음면 (5개입)",
    price: 5480,
    barcode: "8801043001110",
  },
  {
    id: "r11",
    cat: "라면",
    name: "열라면 매운맛 (5개입)",
    price: 3580,
    barcode: "8801043001111",
  },
  {
    id: "r12",
    cat: "라면",
    name: "김치라면 (4개입)",
    price: 3380,
    barcode: "8801043001112",
  },
  {
    id: "r13",
    cat: "라면",
    name: "사리곰탕면 (4개입)",
    price: 3280,
    barcode: "8801043001113",
  },
  {
    id: "r14",
    cat: "라면",
    name: "육개장 사발면 (6개입)",
    price: 5880,
    barcode: "8801043001114",
  },
  {
    id: "r15",
    cat: "라면",
    name: "왕뚜껑 큰사발면 (6개입)",
    price: 6180,
    barcode: "8801043001115",
  },
  {
    id: "r16",
    cat: "라면",
    name: "튀김우동 큰사발면 (6개입)",
    price: 6280,
    sale: 5780,
    barcode: "8801043001116",
  },
  {
    id: "r17",
    cat: "라면",
    name: "새우탕 큰사발면 (6개입)",
    price: 6380,
    barcode: "8801043001117",
  },
  {
    id: "r18",
    cat: "라면",
    name: "쇠고기 미역국 라면 멀티팩 (4개입)",
    price: 4680,
    barcode: "8801043001118",
  },
  {
    id: "r19",
    cat: "라면",
    name: "일품 해물라면 (4개입)",
    price: 4880,
    barcode: "8801043001119",
  },
  {
    id: "r20",
    cat: "라면",
    name: "참깨라면 (4개입)",
    price: 4080,
    barcode: "8801043001120",
  },
  {
    id: "r21",
    cat: "라면",
    name: "짜왕 매콤한 맛 (4개입)",
    price: 4780,
    barcode: "8801043001121",
  },
  {
    id: "r22",
    cat: "라면",
    name: "진짬뽕 (4개입)",
    price: 4980,
    barcode: "8801043001122",
  },
  {
    id: "r23",
    cat: "라면",
    name: "신라면 건면 (5개입)",
    price: 4380,
    barcode: "8801043001123",
  },
  {
    id: "r24",
    cat: "라면",
    name: "순한 맛 순라면 (5개입)",
    price: 3080,
    barcode: "8801043001124",
  },
  {
    id: "r25",
    cat: "라면",
    name: "컵누들 우동맛 (6개입)",
    price: 5580,
    barcode: "8801043001125",
  },

  // ── 음료 7 ───────────────────────────────────────────────────────────────
  {
    id: "d01",
    cat: "음료",
    name: "초정탄산수 플레인 330ml",
    price: 330,
    barcode: "8801223100209",
  },
  {
    id: "d02",
    cat: "음료",
    name: "코카콜라 오리지널 500ml",
    price: 2200,
    barcode: "8801094001201",
  },
  {
    id: "d03",
    cat: "음료",
    name: "칠성사이다 500ml",
    price: 2100,
    barcode: "8801094001202",
  },
  {
    id: "d04",
    cat: "음료",
    name: "트로피카나 스파클링 오렌지 350ml",
    price: 1800,
    sale: 1500,
    barcode: "8801094001203",
  },
  {
    id: "d05",
    cat: "음료",
    name: "광동 옥수수수염차 500ml",
    price: 1900,
    barcode: "8801094001204",
  },
  {
    id: "d06",
    cat: "음료",
    name: "하루야채 토마토 200ml",
    price: 1700,
    barcode: "8801094001205",
  },
  {
    id: "d07",
    cat: "음료",
    name: "데자와 밀크티 500ml",
    price: 2300,
    barcode: "8801094001206",
  },

  // ── 냉장 6 ───────────────────────────────────────────────────────────────
  {
    id: "c01",
    cat: "냉장",
    name: "서울우유 저지방 1L",
    price: 3180,
    barcode: "8801115001301",
  },
  {
    id: "c02",
    cat: "냉장",
    name: "매일우유 오리지널 900ml",
    price: 2980,
    barcode: "8801115001302",
  },
  {
    id: "c03",
    cat: "냉장",
    name: "덴마크 드링킹 요구르트 딸기 750ml",
    price: 3480,
    sale: 2980,
    barcode: "8801115001303",
  },
  {
    id: "c04",
    cat: "냉장",
    name: "서리태 가득 검은콩 두유 팩 (16입)",
    price: 12900,
    sale: 10900,
    barcode: "8801115001304",
  },
  {
    id: "c05",
    cat: "냉장",
    name: "요플레 오리지널 딸기 (8개입)",
    price: 4980,
    barcode: "8801115001305",
  },
  {
    id: "c06",
    cat: "냉장",
    name: "상하치즈 슬라이스 (12매)",
    price: 5480,
    barcode: "8801115001306",
  },

  // ── 과자 8 ───────────────────────────────────────────────────────────────
  {
    id: "s01",
    cat: "과자",
    name: "포카칩 오리지널 66g",
    price: 1700,
    barcode: "8801062001401",
  },
  {
    id: "s02",
    cat: "과자",
    name: "새우깡 90g",
    price: 1500,
    barcode: "8801062001402",
  },
  {
    id: "s03",
    cat: "과자",
    name: "꼬북칩 초코츄러스맛 80g",
    price: 2200,
    sale: 1900,
    barcode: "8801062001403",
  },
  {
    id: "s04",
    cat: "과자",
    name: "홈런볼 초코 46g",
    price: 1800,
    barcode: "8801062001404",
  },
  {
    id: "s05",
    cat: "과자",
    name: "오예스 초코 (12개입)",
    price: 6480,
    barcode: "8801062001405",
  },
  {
    id: "s06",
    cat: "과자",
    name: "카스타드 대용량 (20개입)",
    price: 7980,
    barcode: "8801062001406",
  },
  {
    id: "s07",
    cat: "과자",
    name: "초코파이 情 오리지널 (12개입)",
    price: 5980,
    barcode: "8801062001407",
  },
  {
    id: "s08",
    cat: "과자",
    name: "프링글스 오리지널 110g",
    price: 3200,
    barcode: "8801062001408",
  },

  // ── 생활용품 6 ───────────────────────────────────────────────────────────
  {
    id: "l01",
    cat: "생활용품",
    name: "마이비데 비데 일체형 변좌",
    price: 35000,
    barcode: "8801166054966",
  },
  {
    id: "l02",
    cat: "생활용품",
    name: "크리넥스 3겹 데코 화장지 (30롤)",
    price: 18900,
    sale: 16900,
    barcode: "8801166001502",
  },
  {
    id: "l03",
    cat: "생활용품",
    name: "다우니 섬유유연제 실내건조 2L",
    price: 12900,
    barcode: "8801166001503",
  },
  {
    id: "l04",
    cat: "생활용품",
    name: "페리오 캐비티케어 치약 (5개입)",
    price: 8900,
    barcode: "8801166001504",
  },
  {
    id: "l05",
    cat: "생활용품",
    name: "참그린 주방세제 리필 1.2L",
    price: 6400,
    barcode: "8801166001505",
  },
  {
    id: "l06",
    cat: "생활용품",
    name: "좋은느낌 시크릿데이 중형 (18개입)",
    price: 9800,
    barcode: "8801166001506",
  },

  // ── 주류 6 (연령제한 4 · 품절 1) ─────────────────────────────────────────
  {
    id: "a01",
    cat: "주류",
    name: "참이슬 후레쉬 360ml",
    price: 1980,
    ageLimit: true,
    barcode: "8801048001601",
  },
  {
    id: "a02",
    cat: "주류",
    name: "처음처럼 360ml",
    price: 1880,
    ageLimit: true,
    barcode: "8801048001602",
  },
  {
    id: "a03",
    cat: "주류",
    name: "카스 프레시 500ml 캔",
    price: 2480,
    ageLimit: true,
    barcode: "8801048001603",
  },
  {
    id: "a04",
    cat: "주류",
    name: "테라 500ml 캔",
    price: 2580,
    ageLimit: true,
    barcode: "8801048001604",
  },
  {
    id: "a05",
    cat: "주류",
    name: "청정원 안주야 매콤 껍데기 250g",
    price: 6900,
    soldOut: true,
    barcode: "8801048001605",
  },
  {
    id: "a06",
    cat: "주류",
    name: "오징어 진미채 볶음 120g",
    price: 5900,
    barcode: "8801048001606",
  },
];

/* 라면기획전 대상 : 라면 25개 중 앞 20개 */
const RAMEN_EVENT_IDS = PRODUCTS.filter((p) => p.cat === "라면")
  .slice(0, 20)
  .map((p) => p.id);

const COUPONS = [
  {
    id: "farm",
    name: "농할쿠폰",
    desc: "마이비데 구매 시 5,000원 할인",
    type: "item",
    targetIds: ["l01"],
    amount: 5000,
  },
  {
    id: "welcome",
    name: "가입축하쿠폰",
    desc: "전 품목 1,000원 할인",
    type: "cart",
    amount: 1000,
  },
  {
    id: "ramen",
    name: "라면기획전",
    desc: "대상 라면 개당 500원 할인",
    type: "perUnit",
    targetIds: RAMEN_EVENT_IDS,
    amount: 500,
  },
];

const BAGS = [
  { id: "b01", name: "일반 봉투 소형", price: 100 },
  { id: "b02", name: "일반 봉투 중형", price: 200 },
  { id: "b03", name: "일반 봉투 대형", price: 300 },
  { id: "b04", name: "일반 봉투 초대형", price: 500 },
];

const MEMBERS = [
  { type: "app", key: "20250708000115", name: "갓준경", point: 5000, pin: "1234" },
  { type: "phone", key: "01012452534", name: "휴대폰 회원", point: 2000, pin: "1234" },
  { type: "phone", key: "01011111111", name: "휴대폰 회원", point: 3000, pin: "1234" },
  { type: "phone", key: "01000000000", name: "휴대폰 회원", point: 0, pin: "1234" },
];

const MEMBER_STORAGE_KEY = "tomato-kiosk-phone-members";

function loadRegisteredMembers() {
  try {
    const saved = JSON.parse(localStorage.getItem(MEMBER_STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return;
    saved.forEach((member) => {
      if (
        member &&
        member.type === "phone" &&
        !MEMBERS.some((item) => item.key === member.key)
      ) {
        MEMBERS.push({ ...member, pin: String(member.pin || "1234") });
      }
    });
  } catch (error) {
    console.warn("저장된 휴대폰 회원 정보를 불러오지 못했습니다", error);
  }
}

function persistRegisteredMember(member) {
  const registered = MEMBERS.filter((item) => item.type === "phone");
  localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(registered));
}

loadRegisteredMembers();

/* ==========================================================================
   3. STATE
   ========================================================================== */

const state = {
  cart: [],
  category: "라면",
  page: 0,
  member: null,
  usedPoint: 0,
  method: null,
  modal: null,
  modalData: {},
  loginPurpose: "checkout",
  phoneInput: "",
  pointInput: "",
  signupPhone: "",
  signupPin: "",
  pointPinInput: "",
  pointPinAttempts: 0,
  pointPinVerified: false,
  pointPinReturnScreen: "point-phone",
  pointPinReturnData: {},
  vanRetry: 0,
  idleTimer: null,
  warnTimer: null,
  countdownTimer: null,
};

/* ==========================================================================
   4. UTIL
   ========================================================================== */

const $ = (selector) => document.querySelector(selector);

/*
  요소가 없어도 초기화가 멈추지 않도록 감싼다.
  HTML 을 고치면서 id 가 사라지면 예전에는 여기서 예외가 나
  이후 렌더링이 통째로 실행되지 않았다.
*/
function on(selector, event, handler) {
  const node = document.querySelector(selector);
  if (!node) {
    console.warn(`[bind] ${selector} 를 찾지 못했습니다`);
    return;
  }
  node.addEventListener(event, handler);
}
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function won(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function point(value) {
  return `${Number(value).toLocaleString("ko-KR")}P`;
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (html !== undefined) {
    node.innerHTML = html;
  }
  return node;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

/* 원형 단색 아이콘 : 성공 104 초록 / 경고 84 주황 */
function iconSuccess() {
  return `
    <svg class="alert-icon" viewBox="0 0 104 104" width="104" height="104">
      <circle cx="52" cy="52" r="52" fill="var(--c-success-soft)" />
      <circle cx="52" cy="52" r="40" fill="#35b778" />
      <path
        d="M33 53 L46 66 L72 38"
        fill="none"
        stroke="#ffffff"
        stroke-width="9"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

function iconWarning() {
  return `
    <svg class="alert-icon" viewBox="0 0 84 84" width="84" height="84">
      <circle cx="42" cy="42" r="42" fill="var(--c-warning)" />
      <rect x="38" y="20" width="8" height="30" rx="4" fill="#ffffff" />
      <circle cx="42" cy="62" r="4" fill="#ffffff" />
    </svg>
  `;
}

/* ==========================================================================
   5. CART
   ========================================================================== */

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || BAGS.find((b) => b.id === id);
}

function unitPrice(product) {
  return product.sale !== undefined ? product.sale : product.price;
}

function addToCart(product, quantity = 1) {
  const existing = state.cart.find((line) => line.id === product.id);
  if (existing) {
    existing.qty += quantity;
  } else {
    state.cart.push({ id: product.id, qty: quantity });
  }
  renderTransaction();
  resetIdleTimer();
}

function changeQty(id, delta) {
  const line = state.cart.find((item) => item.id === id);
  if (!line) {
    return;
  }
  line.qty += delta;
  if (line.qty <= 0) {
    state.cart = state.cart.filter((item) => item.id !== id);
  }
  renderAll();
  resetIdleTimer();
}

function removeLine(id) {
  state.cart = state.cart.filter((item) => item.id !== id);
  renderAll();
  resetIdleTimer();
}

/*
  금액 계산 순서
  1) 상품 행사 할인   정가 - 행사가
  2) 회원 쿠폰 할인   APP · 휴대폰 로그인 시 자동 적용
  3) 포인트 사용      04-INP 에서 입력한 값
*/
function calcTotals() {
  let listTotal = 0;
  let saleDiscount = 0;
  let qty = 0;

  state.cart.forEach((line) => {
    const product = findProduct(line.id);
    if (!product) {
      return;
    }
    qty += line.qty;
    listTotal += product.price * line.qty;
    saleDiscount += (product.price - unitPrice(product)) * line.qty;
  });

  const afterSale = listTotal - saleDiscount;
  /* APP 로그인에서만 쿠폰·회원할인을 자동 적용한다.
     휴대폰 회원은 Figma 기획대로 포인트 조회·사용만 제공한다. */
  const coupons =
    state.member && state.member.type === "app" ? activeCoupons() : [];
  const couponDiscount = coupons.reduce((sum, c) => sum + c.applied, 0);
  const beforePoint = Math.max(0, afterSale - couponDiscount);
  const usedPoint = Math.min(state.usedPoint, beforePoint);

  return {
    qty,
    listTotal,
    saleDiscount,
    afterSale,
    coupons,
    couponDiscount,
    beforePoint,
    usedPoint,
    payable: Math.max(0, beforePoint - usedPoint),
  };
}

function activeCoupons() {
  const result = [];

  COUPONS.forEach((coupon) => {
    let applied = 0;

    if (coupon.type === "cart" && state.cart.length > 0) {
      applied = coupon.amount;
    }

    if (coupon.type === "item") {
      const hit = state.cart.find((line) => coupon.targetIds.includes(line.id));
      applied = hit ? coupon.amount : 0;
    }

    if (coupon.type === "perUnit") {
      const units = state.cart
        .filter((line) => coupon.targetIds.includes(line.id))
        .reduce((sum, line) => sum + line.qty, 0);
      applied = units * coupon.amount;
    }

    if (applied > 0) {
      result.push({ ...coupon, applied });
    }
  });

  return result;
}

/* 적립은 회원에게만 발생한다. 비회원 결제는 적립 행 자체를 두지 않는다. */
function earnedPoint(payable) {
  if (!state.member) {
    return null;
  }
  if (!CONFIG.usePointEarn) {
    return 0;
  }
  return Math.floor((payable * STORE.earnRate) / 10) * 10;
}

/* ==========================================================================
   6. RENDER
   ========================================================================== */

function renderAll() {
  renderOperationalLayout();
  renderCart();
  renderSummary();
  renderCatalog();
  renderMethods();
  renderMember();
}

/* 장바구니 조작 때 카탈로그 DOM을 다시 만들지 않아 깜빡임과 스크롤 초기화를 막는다. */
function renderTransaction() {
  renderCart();
  renderSummary();
  renderMethods();
  renderMember();
}

function renderOperationalLayout() {
  const workspace = $(".workspace");
  const catalog = $(".panel--catalog");
  const cartPanel = $(".panel--cart");
  const bagButton = $("#btn-bag");
  const directSelectOff = !CONFIG.useDirectSelect;
  workspace.classList.toggle("is-direct-select-off", directSelectOff);
  bagButton.classList.toggle("btn--cart-wide", directSelectOff);
  if (directSelectOff) {
    cartPanel.appendChild(bagButton);
  } else {
    catalog.appendChild(bagButton);
  }
  catalog.hidden = directSelectOff;
  $("#notice-text").textContent = directSelectOff
    ? "상품 바코드를 스캔해 주세요"
    : "상품 바코드를 스캔하거나 오른쪽에서 직접 선택하세요";
}

function renderCart() {
  const list = $("#cart-list");
  const empty = $("#cart-empty");
  list.innerHTML = "";

  const isEmpty = state.cart.length === 0;
  empty.hidden = !isEmpty;
  list.hidden = isEmpty;

  state.cart.forEach((line) => {
    const product = findProduct(line.id);
    if (!product) {
      return;
    }

    const price = unitPrice(product);
    const hasSale = product.sale !== undefined;
    const row = el("li", "cart__row");

    const nameCell = el("div", "cart__name");
    nameCell.appendChild(el("span", "cart__name-text", product.name));
    if (hasSale) {
      const badges = el("div", "cart__badges");
      badges.appendChild(
        el(
          "span",
          "badge badge--sale",
          `행사할인 −${(product.price - price).toLocaleString("ko-KR")}원`,
        ),
      );
      nameCell.appendChild(badges);
    }

    const unitCell = el("div", "cart__unit");
    if (hasSale) {
      unitCell.appendChild(
        el("del", null, product.price.toLocaleString("ko-KR")),
      );
    }
    unitCell.appendChild(el("span", null, price.toLocaleString("ko-KR")));

    const qtyCell = el("div", "cart__qty");
    const minus = el("button", "icon-btn", "−");
    const value = el("span", "cart__qty-value", String(line.qty));
    const plus = el("button", "icon-btn icon-btn--brand", "+");
    minus.addEventListener("click", () => changeQty(line.id, -1));
    plus.addEventListener("click", () => changeQty(line.id, 1));
    qtyCell.append(minus, value, plus);

    const amountCell = el("div", "cart__amount");
    if (hasSale) {
      amountCell.appendChild(el("del", null, won(product.price * line.qty)));
    }
    amountCell.appendChild(el("span", null, won(price * line.qty)));

    const removeCell = el("div", "cart__remove");
    const removeBtn = el("button", "icon-btn", "✕");
    removeBtn.addEventListener("click", () => removeLine(line.id));
    removeCell.appendChild(removeBtn);

    row.append(nameCell, unitCell, qtyCell, amountCell, removeCell);
    list.appendChild(row);
  });
}

function renderSummary() {
  const totals = calcTotals();
  $("#sum-qty").textContent = `${totals.qty}개`;
  $("#sum-discount").textContent =
    `−${(totals.saleDiscount + totals.couponDiscount).toLocaleString("ko-KR")}원`;
  $("#sum-total").textContent = won(totals.payable);
}

/* 격자를 잠깐 흐리게 했다가 다시 그려 전환이 눈에 보이도록 한다. */
function switchCatalog(mutate) {
  const grid = $("#product-grid");
  grid.classList.add("is-switching");
  setTimeout(() => {
    mutate();
    renderCatalog();
    grid.classList.remove("is-switching");
  }, 140);
  resetIdleTimer();
}

function renderCatalog() {
  const tabs = $("#category-tabs");
  tabs.innerHTML = "";

  CATEGORIES.forEach((cat) => {
    const tab = el(
      "button",
      `tab${cat === state.category ? " is-active" : ""}`,
      cat,
    );
    tab.addEventListener("click", () => {
      switchCatalog(() => {
        state.category = cat;
        state.page = 0;
      });
    });
    tabs.appendChild(tab);
  });

  const items = PRODUCTS.filter((p) => p.cat === state.category);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  state.page = Math.min(state.page, pageCount - 1);

  const grid = $("#product-grid");
  grid.innerHTML = "";

  items
    .slice(state.page * pageSize, state.page * pageSize + pageSize)
    .forEach((product) => {
      const card = el(
        "button",
        `product${product.soldOut ? " is-soldout" : ""}`,
      );

      /* 1) 상품명 : 꼭대기 고정, 두 줄까지 보여주고 넘치면 말줄임 */
      card.appendChild(el("span", "product__name", product.name));

      /* 2) 상품 이미지 : ERP 에 1:1 로 등록된 파일. 없으면 빈 자리를 유지한다. */
      const imageBox = el("div", "product__image");
      const img = el("img");
      const sources = imageSources(product.id);
      let attempt = 0;
      img.alt = "";
      img.loading = "lazy";
      img.src = sources[attempt];
      img.addEventListener("error", () => {
        attempt += 1;
        if (attempt < sources.length) {
          img.src = sources[attempt];
          return;
        }
        /* 이미지가 없으면 자리만 비워 둔다. */
        img.remove();
      });
      imageBox.appendChild(img);
      card.appendChild(imageBox);

      /* 3) 행사면 원가에 삭선을 긋고, 그 아래 할인가와 작은 배지를 둔다. */
      const stack = el("div", "product__price-stack");
      if (product.sale !== undefined) {
        stack.appendChild(el("del", "product__list-price", won(product.price)));
      }

      const priceRow = el("div", "product__price-row");
      priceRow.appendChild(
        el("span", "product__price", won(unitPrice(product))),
      );
      if (product.sale !== undefined) {
        priceRow.appendChild(el("span", "badge badge--sale", "행사"));
      } else if (product.soldOut) {
        priceRow.appendChild(el("span", "badge badge--soldout", "품절"));
      }
      stack.appendChild(priceRow);
      card.appendChild(stack);

      card.addEventListener("click", () => pickProduct(product));
      grid.appendChild(card);
    });

  const dots = $("#page-dots");
  dots.innerHTML = "";
  for (let i = 0; i < pageCount; i += 1) {
    const dot = el(
      "button",
      `pager__dot${i === state.page ? " is-active" : ""}`,
      String(i + 1),
    );
    dot.addEventListener("click", () => {
      switchCatalog(() => {
        state.page = i;
      });
    });
    dots.appendChild(dot);
  }

  requestAnimationFrame(() => {
    const activeTab = tabs.querySelector(".tab.is-active");
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  });
}

function renderMethods() {
  const empty = state.cart.length === 0;

  $$(".method").forEach((node) => {
    const method = node.dataset.method;
    const disabled = (method === "cash" && !CONFIG.useCash) || empty;

    node.classList.toggle("is-disabled", disabled);
    node.classList.toggle("is-selected", state.method === method && !disabled);

    const stateLabel = node.querySelector(".method__state");
    if (method === "cash" && !CONFIG.useCash) {
      stateLabel.textContent = "사용 불가";
    } else if (empty) {
      stateLabel.textContent = "상품을 먼저 담아주세요";
    } else {
      stateLabel.textContent = "현재 사용 가능";
    }
  });

  const bagBtn = $("#btn-bag");
  bagBtn.classList.toggle("is-disabled", !CONFIG.useBag);
  bagBtn.disabled = !CONFIG.useBag;
}

function renderMember() {
  const info = $("#member-info");
  const pointButton = $("#btn-point-lookup");
  pointButton.hidden = !CONFIG.useMemberLogin;
  if (!CONFIG.useMemberLogin) {
    info.hidden = true;
    return;
  }
  if (!state.member) {
    info.hidden = true;
    pointButton.textContent = "포인트 조회";
    return;
  }
  info.hidden = false;
  $("#member-name").textContent = `${state.member.name} 님`;
  $("#member-point").textContent = `보유 ${point(state.member.point)}`;
  pointButton.textContent = "내역 조회";
}

/* ==========================================================================
   7. MODAL
   ========================================================================== */

function openModal(name, data = {}) {
  state.modal = name;
  state.modalData = data;
  const overlay = $("#overlay");
  const modal = $("#modal");

  modal.className = "modal";
  modal.innerHTML = "";
  const builder = SCREENS[name];
  if (builder) {
    builder(modal, data);
  }

  overlay.hidden = false;
  /* APP 로그인·간편결제·연령 승인 모달에서는 물리 스캐너 입력을 계속 받는다. */
  requestAnimationFrame(focusScanner);
  resetIdleTimer();
}

function closeModal() {
  state.modal = null;
  state.modalData = {};
  $("#overlay").hidden = true;
  $("#modal").innerHTML = "";
  focusScanner();
  resetIdleTimer();
}

function backButton(onClick) {
  const btn = el("button", "btn btn--back", "←&nbsp;&nbsp;뒤로");
  btn.addEventListener("click", onClick);
  return btn;
}

function actionRow(buttons, stack = false) {
  const row = el(
    "div",
    `modal__actions${stack ? " modal__actions--stack" : ""}`,
  );
  buttons.forEach(({ label, variant, onClick, disabled }) => {
    const btn = el("button", `btn btn--${variant}`, label);
    btn.disabled = Boolean(disabled);
    if (onClick) {
      btn.addEventListener("click", onClick);
    }
    row.appendChild(btn);
  });
  return row;
}

function rowItem(label, value, valueClass = "") {
  const row = el("div", "row");
  row.appendChild(el("span", "row__label", label));
  row.appendChild(el("strong", `row__value ${valueClass}`.trim(), value));
  return row;
}

/* 간단 알림 : 아이콘 + 제목 + 설명 + 확인 버튼 */
function alertScreen(modal, { icon, title, desc, rows = [], actions }) {
  modal.appendChild(el("div", "modal__icon", icon));
  modal.appendChild(el("h2", "modal__title", title));
  if (desc) {
    modal.appendChild(el("p", "modal__desc", desc));
  }
  if (rows.length > 0) {
    const box = el("div", "modal__rows");
    rows.forEach((r) =>
      box.appendChild(rowItem(r.label, r.value, r.className)),
    );
    modal.appendChild(box);
  }
  modal.appendChild(actions);
}

const SCREENS = {};

/* ── 02-A 봉투 선택 ───────────────────────────────────────────────────────── */
SCREENS["bag"] = (modal) => {
  modal.appendChild(el("h2", "modal__title", "원하는 봉투를 담아주세요"));

  const grid = el("div", "bags");
  BAGS.forEach((bag) => {
    const card = el("button", "bag");
    card.appendChild(el("span", "bag__name", bag.name));
    card.appendChild(el("strong", "bag__price", won(bag.price)));
    card.appendChild(el("span", "badge badge--sale", "+ 장바구니 담기"));
    card.addEventListener("click", () => {
      addToCart(bag);
      showToast(`${bag.name} 담았습니다`);
    });
    grid.appendChild(card);
  });
  modal.appendChild(grid);

  modal.appendChild(
    actionRow([
      { label: "봉투 없이 돌아가기", variant: "ghost", onClick: closeModal },
    ]),
  );
};

/* ── 03 로그인 유도 ───────────────────────────────────────────────────────── */
SCREENS["login-prompt"] = (modal) => {
  modal.appendChild(el("h2", "modal__title", "회원 혜택을 받으시겠어요?"));
  modal.appendChild(
    el(
      "p",
      "modal__desc",
      "토마토 APP 회원은 행사·쿠폰이 자동으로 적용되고\n포인트도 바로 사용할 수 있습니다",
    ),
  );

  const callout = el("div", "callout callout--brand");
  callout.appendChild(
    el("strong", "callout__title", "지금 로그인하면 할인 자동 적용"),
  );
  callout.appendChild(
    el(
      "p",
      "callout__text",
      "APP 바코드 또는 휴대폰 번호로 1초 만에 확인됩니다",
    ),
  );
  modal.appendChild(callout);

  modal.appendChild(
    actionRow(
      [
        {
          label: "로그인하고 혜택 받기",
          variant: "primary",
          onClick: () => openModal("login"),
        },
        {
          label: "회원 혜택 없이 결제",
          variant: "ghost",
          onClick: () => startPayment(),
        },
      ],
      true,
    ),
  );
};

/* ── 03-A 통합 로그인 ─────────────────────────────────────────────────────── */
SCREENS["login"] = (modal) => {
  modal.className = "modal modal--wide";
  modal.appendChild(backButton(() => openModal("login-prompt")));
  modal.appendChild(el("h2", "modal__title", "회원 정보를 확인해주세요"));

  const grid = el("div", "login");

  const app = el("div", "login__col login__col--app");
  app.appendChild(
    el("span", "badge badge--sale", "추천 · 모든 할인 자동 적용"),
  );
  app.appendChild(el("h3", "login__heading", "APP 회원 바코드 스캔"));
  app.appendChild(
    el(
      "p",
      "login__desc",
      "행사·쿠폰까지 사용 가능한 쿠폰을\n로그인 즉시 전부 자동으로 적용합니다",
    ),
  );
  const scanBox = el("div", "login__scan");
  scanBox.innerHTML = `
    <svg viewBox="0 0 120 150" width="120" height="150" aria-hidden="true">
      <rect x="4" y="4" width="112" height="142" rx="12" fill="#ffffff" stroke="var(--c-border-default)" stroke-width="2" />
      <g fill="var(--c-text-primary)">
        <rect x="20" y="42" width="4" height="52" />
        <rect x="28" y="42" width="2" height="52" />
        <rect x="34" y="42" width="6" height="52" />
        <rect x="44" y="42" width="3" height="52" />
        <rect x="51" y="42" width="5" height="52" />
        <rect x="60" y="42" width="2" height="52" />
        <rect x="66" y="42" width="6" height="52" />
        <rect x="76" y="42" width="3" height="52" />
        <rect x="83" y="42" width="4" height="52" />
        <rect x="91" y="42" width="6" height="52" />
      </g>
      <text x="60" y="112" text-anchor="middle" font-size="11" fill="var(--c-text-secondary)">APP</text>
    </svg>
  `;
  app.appendChild(scanBox);
  app.appendChild(el("p", "login__status", "● APP 회원 바코드 스캔 대기 중"));
  grid.appendChild(app);

  const phone = el("div", "login__col");
  phone.appendChild(el("h3", "login__heading", "휴대폰 번호로 확인"));
  phone.appendChild(
    el(
      "p",
      "login__desc",
      "APP 가입 · 휴대폰 번호 회원 모두\n포인트만 조회·사용할 수 있습니다",
    ),
  );
  phone.appendChild(phoneDisplay(state.phoneInput));
  phone.appendChild(
    keypad((key) => {
      handlePhoneKey(key);
      openModal("login");
    }),
  );

  const confirm = el("button", "btn btn--neutral", "확인");
  confirm.disabled = state.phoneInput.length !== 8;
  confirm.addEventListener("click", () =>
    lookupPhone(`010${state.phoneInput}`),
  );
  phone.appendChild(confirm);
  grid.appendChild(phone);

  modal.appendChild(grid);

  /* 신규회원 가입 금지 옵션이 켜지면 가입 안내 영역을 통째로 숨긴다. */
  if (!CONFIG.blockSignup) {
    modal.appendChild(
      el(
        "p",
        "modal__note text-center",
        "토마토 APP회원이 아니라면? APP을 설치하거나 휴대폰 번호로 바로 가입할 수 있어요",
      ),
    );

    const signupRow = el("div", "modal__actions");
    ["Android · Google Play", "iPhone · App Store"].forEach((label) => {
      const card = el("button", "btn btn--ghost", label);
      card.addEventListener("click", () =>
        showToast("시연에서는 앱 설치를 생략합니다"),
      );
      signupRow.appendChild(card);
    });
    const direct = el(
      "button",
      "btn btn--outline",
      "휴대폰 번호로 바로 가입하기",
    );
    direct.addEventListener("click", () => {
      state.signupPhone = "";
      openModal("signup-phone", { entryPath: "direct" });
    });
    signupRow.appendChild(direct);
    modal.appendChild(signupRow);
  }
};

function phoneDisplay(digits) {
  const box = el("div", "phone-display");
  box.appendChild(el("span", "phone-display__prefix", "010"));
  box.appendChild(el("span", "phone-display__prefix", "-"));

  const front = digits.slice(0, 4).padEnd(4, "_");
  const back = digits.slice(4, 8).padEnd(4, "_");
  box.appendChild(
    el(
      "span",
      `phone-display__slot${digits.length === 0 ? " phone-display__slot--empty" : ""}`,
      front,
    ),
  );
  box.appendChild(el("span", "phone-display__prefix", "-"));
  box.appendChild(
    el(
      "span",
      `phone-display__slot${digits.length <= 4 ? " phone-display__slot--empty" : ""}`,
      back,
    ),
  );
  return box;
}

function keypad(onKey) {
  const pad = el("div", "keypad");
  const keys = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "전체삭제",
    "0",
    "←",
  ];
  keys.forEach((key) => {
    const isFn = key === "전체삭제" || key === "←";
    const btn = el("button", `key${isFn ? " key--fn" : ""}`, key);
    btn.addEventListener("click", () => onKey(key));
    pad.appendChild(btn);
  });
  return pad;
}

function handlePhoneKey(key) {
  if (key === "전체삭제") {
    state.phoneInput = "";
  } else if (key === "←") {
    state.phoneInput = state.phoneInput.slice(0, -1);
  } else if (state.phoneInput.length < 8) {
    state.phoneInput += key;
  }
}

function lookupPhone(fullNumber) {
  const member = MEMBERS.find(
    (m) => m.type === "phone" && m.key === fullNumber,
  );
  if (member) {
    state.member = { ...member };
    state.phoneInput = "";
    renderMember();
    openLoginSuccessDestination();
    return;
  }
  openModal("not-member", { phone: fullNumber });
}

/*
  같은 로그인 화면이라도 진입 목적에 따라 성공 후 화면이 달라진다.
  - 결제수단에서 진입: 포인트 선택 화면
  - 헤더의 포인트 조회에서 진입: 포인트 적립·사용 내역
*/
function openLoginSuccessDestination() {
  if (state.loginPurpose === "history") {
    state.loginPurpose = "checkout";
    openModal("point-history");
    return;
  }
  openPointScreen();
}

/* ── 03-B 회원 미가입 안내 ────────────────────────────────────────────────── */
SCREENS["not-member"] = (modal, data) => {
  modal.appendChild(backButton(() => openModal("login")));
  modal.appendChild(el("h2", "modal__title", "가입되지 않은 번호입니다"));
  modal.appendChild(
    el(
      "p",
      "modal__desc",
      `${formatPhone(data.phone)} 로 가입된 회원 정보가 없습니다`,
    ),
  );

  if (!CONFIG.blockSignup) {
    const callout = el("div", "callout callout--success");
    callout.appendChild(
      el(
        "strong",
        "callout__title",
        `지금 가입하면 축하 포인트 ${point(STORE.signupBonus)}`,
      ),
    );
    callout.appendChild(
      el(
        "p",
        "callout__text",
        "이번 결제에 바로 사용할 수 있습니다 · 매장 ERP 설정값",
      ),
    );
    modal.appendChild(callout);
  }

  const buttons = [];
  if (!CONFIG.blockSignup) {
    buttons.push({
      label: "휴대폰 번호로 가입",
      variant: "primary",
      onClick: () => {
        state.signupPhone = data.phone.slice(3);
        openModal("signup-phone", { entryPath: "from-lookup" });
      },
    });
  }
  buttons.push({
    label: "회원 혜택 없이 결제",
    variant: "ghost",
    onClick: () => startPayment(),
  });
  modal.appendChild(actionRow(buttons, buttons.length > 1));
};

function formatPhone(raw) {
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
}

/* ── 03-C 가입 번호 입력 ──────────────────────────────────────────────────── */
SCREENS["signup-phone"] = (modal, data) => {
  modal.appendChild(backButton(() => openModal("login")));
  modal.appendChild(el("h2", "modal__title", "휴대폰 번호로 회원가입"));
  modal.appendChild(
    el(
      "p",
      "modal__desc",
      data.entryPath === "from-lookup"
        ? "03-A 에서 입력한 번호가 자동으로 채워집니다\n다른 번호로 가입하려면 지우고 다시 입력해 주세요"
        : "가입할 휴대폰 번호를 입력해 주세요",
    ),
  );
  modal.appendChild(phoneDisplay(state.signupPhone));
  modal.appendChild(
    keypad((key) => {
      if (key === "전체삭제") {
        state.signupPhone = "";
      } else if (key === "←") {
        state.signupPhone = state.signupPhone.slice(0, -1);
      } else if (state.signupPhone.length < 8) {
        state.signupPhone += key;
      }
      openModal("signup-phone", data);
    }),
  );

  modal.appendChild(
    actionRow([
      {
        label: "다음",
        variant: "primary",
        disabled: state.signupPhone.length !== 8,
        onClick: () => {
          state.signupPin = "";
          openModal("signup-pin");
        },
      },
    ]),
  );
};

/* ── 03-D 결제 비밀번호 설정 ──────────────────────────────────────────────── */
SCREENS["signup-pin"] = (modal) => {
  modal.appendChild(
    backButton(() => openModal("signup-phone", { entryPath: "from-lookup" })),
  );
  modal.appendChild(el("h2", "modal__title", "결제 비밀번호를 설정해주세요"));
  modal.appendChild(el("p", "modal__desc", "숫자 4자리를 입력해 주세요"));

  const box = el("div", "phone-display");
  box.appendChild(
    el("span", "phone-display__slot", state.signupPin.padEnd(4, "_")),
  );
  modal.appendChild(box);

  modal.appendChild(
    keypad((key) => {
      if (key === "전체삭제") {
        state.signupPin = "";
      } else if (key === "←") {
        state.signupPin = state.signupPin.slice(0, -1);
      } else if (state.signupPin.length < 4) {
        state.signupPin += key;
      }
      openModal("signup-pin");
    }),
  );

  modal.appendChild(
    actionRow([
      {
        label: "다음",
        variant: "primary",
        disabled: state.signupPin.length !== 4,
        onClick: () => openModal("signup-confirm"),
      },
    ]),
  );
};

/* ── 03-E 가입 정보 확인 ──────────────────────────────────────────────────── */
SCREENS["signup-confirm"] = (modal) => {
  modal.appendChild(backButton(() => openModal("signup-pin")));
  modal.appendChild(el("h2", "modal__title", "입력한 회원정보를 확인해주세요"));

  const box = el("div", "modal__rows");
  box.appendChild(rowItem("회원번호", formatPhone(`010${state.signupPhone}`)));
  box.appendChild(rowItem("결제 비밀번호", state.signupPin.replace(/./g, "•")));
  modal.appendChild(box);

  const callout = el("div", "callout callout--success");
  callout.appendChild(
    el(
      "strong",
      "callout__title",
      `가입 축하 포인트 ${point(STORE.signupBonus)} 지급`,
    ),
  );
  callout.appendChild(
    el("p", "callout__text", "이번 결제에 바로 사용할 수 있습니다"),
  );
  modal.appendChild(callout);

  modal.appendChild(
    actionRow([
      {
        label: "다시 입력",
        variant: "ghost",
        onClick: () => openModal("signup-phone", { entryPath: "direct" }),
      },
      {
        label: "가입 완료",
        variant: "primary",
        onClick: () => {
          const newMember = {
            type: "phone",
            key: `010${state.signupPhone}`,
            name: "휴대폰 회원",
            point: STORE.signupBonus,
            pin: state.signupPin,
            isNew: true,
          };
          MEMBERS.push(newMember);
          state.member = { ...newMember };
          renderMember();
          openPointScreen();
        },
      },
    ]),
  );
};

/* ── 04-APP / 04-PHN / 04-PHN-D ───────────────────────────────────────────── */
function openPointScreen() {
  const totals = calcTotals();
  const usable = state.member.point >= STORE.pointMin;

  if (!usable) {
    openModal("point-disabled", { totals });
    return;
  }
  openModal(state.member.type === "app" ? "point-app" : "point-phone", {
    totals,
  });
}

function pointHeader(modal, totals, title) {
  modal.appendChild(backButton(() => openModal("login")));
  modal.appendChild(el("h2", "modal__title", title));

  const box = el("div", "modal__rows");
  box.appendChild(
    rowItem("보유 포인트", point(state.member.point), "row__value--brand"),
  );
  box.appendChild(rowItem("결제 예정 금액", won(totals.beforePoint)));
  modal.appendChild(box);
}

SCREENS["point-app"] = (modal, { totals }) => {
  pointHeader(modal, totals, "할인은 이미 모두 적용됐어요");

  const callout = el("div", "callout callout--brand");
  callout.appendChild(
    el(
      "strong",
      "callout__title",
      `총 ${(totals.saleDiscount + totals.couponDiscount).toLocaleString("ko-KR")}원 할인`,
    ),
  );
  callout.appendChild(
    el(
      "p",
      "callout__text",
      "행사 할인과 사용 가능한 쿠폰이 전부 자동 적용되었습니다",
    ),
  );
  modal.appendChild(callout);

  const list = el("div", "modal__rows discount-list");
  totals.coupons.forEach((coupon) => {
    list.appendChild(
      rowItem(
        coupon.name,
        `−${coupon.applied.toLocaleString("ko-KR")}원`,
        "row__value--brand",
      ),
    );
  });
  if (totals.coupons.length === 0) {
    list.appendChild(rowItem("적용 가능한 쿠폰", "없음"));
  }
  modal.appendChild(list);

  modal.appendChild(pointOptions(totals));
  modal.appendChild(
    actionRow(
      [
        {
          label: "적용하고 결제 계속",
          variant: "primary",
          onClick: () => startPayment(),
        },
        {
          label: "계산 취소",
          variant: "neutral",
          onClick: () => openModal("cancel-checkout"),
        },
      ],
      true,
    ),
  );
};

SCREENS["point-phone"] = (modal, { totals }) => {
  pointHeader(modal, totals, "포인트를 사용하시겠어요?");

  if (state.member.isNew) {
    const callout = el("div", "callout callout--success");
    callout.appendChild(
      el("strong", "callout__title", "가입이 완료되었습니다"),
    );
    callout.appendChild(
      el(
        "p",
        "callout__text",
        `축하 포인트 ${point(STORE.signupBonus)} 포함 · 이번 결제에 바로 사용할 수 있습니다`,
      ),
    );
    modal.appendChild(callout);
  }

  modal.appendChild(pointOptions(totals));
  modal.appendChild(
    actionRow(
      [
        {
          label: "적용하고 결제 계속",
          variant: "primary",
          onClick: () => startPayment(),
        },
        {
          label: "계산 취소",
          variant: "neutral",
          onClick: () => openModal("cancel-checkout"),
        },
      ],
      true,
    ),
  );
};

SCREENS["point-disabled"] = (modal, { totals }) => {
  pointHeader(modal, totals, "포인트는 이번 결제에 사용할 수 없어요");

  const callout = el("div", "callout callout--warning");
  callout.appendChild(el("strong", "callout__title", "포인트 사용 불가"));
  callout.appendChild(
    el(
      "p",
      "callout__text",
      `보유 ${point(state.member.point)} · 이 매장은 ${point(STORE.pointMin)}부터 사용할 수 있어요`,
    ),
  );
  modal.appendChild(callout);

  const options = el("div", "point-options");
  ["사용 안 함", "직접 입력", "사용 가능 전액"].forEach((label) => {
    const btn = el("button", "point-option", label);
    btn.disabled = true;
    options.appendChild(btn);
  });
  modal.appendChild(options);

  modal.appendChild(
    actionRow(
      [
        {
          label: "결제 계속",
          variant: "primary",
          onClick: () => startPayment(),
        },
        {
          label: "계산 취소",
          variant: "neutral",
          onClick: () => openModal("cancel-checkout"),
        },
      ],
      true,
    ),
  );
};

function pointOptions(totals) {
  const wrap = el("div", "point-options");
  const maxUsable = Math.min(
    Math.floor(state.member.point / STORE.pointUnit) * STORE.pointUnit,
    Math.floor(totals.beforePoint / STORE.pointUnit) * STORE.pointUnit,
  );

  const none = el(
    "button",
    `point-option${state.usedPoint === 0 ? " is-selected" : ""}`,
    "사용 안 함",
  );
  none.addEventListener("click", () => {
    state.usedPoint = 0;
    state.pointPinVerified = false;
    renderSummary();
    openPointScreen();
  });

  const direct = el("button", "point-option", "직접 입력");
  direct.addEventListener("click", () => {
    state.pointPinVerified = false;
    state.pointInput = "";
    openModal("point-input", { maxUsable });
  });

  const all = el(
    "button",
    `point-option${state.usedPoint === maxUsable && maxUsable > 0 ? " is-selected" : ""}`,
  );
  all.appendChild(el("span", "point-option__label", "사용 가능 전액"));
  all.appendChild(el("strong", "point-option__value", point(maxUsable)));
  all.addEventListener("click", () => {
    state.usedPoint = maxUsable;
    renderSummary();
    beginPointPinVerification("point-app");
  });

  wrap.append(none, direct, all);
  return wrap;
}

/*
  04-PIN 진입점.
  포인트를 사용하지 않을 때는 비밀번호 확인이 필요 없으므로 바로 결제한다.
  뒤로가기를 위해 직전 포인트 화면과 그 화면의 데이터를 함께 보관한다.
*/
function beginPointPinVerification(returnScreen, returnData = {}) {
  if (!state.member || state.usedPoint <= 0) {
    startPayment();
    return;
  }

  state.pointPinInput = "";
  state.pointPinAttempts = 0;
  state.pointPinVerified = false;
  state.pointPinReturnScreen = returnScreen || "point-phone";
  state.pointPinReturnData = { ...returnData };
  openModal("point-pin");
}

function returnFromPointPin() {
  const returnScreen = state.pointPinReturnScreen || "point-phone";
  const returnData = { ...state.pointPinReturnData };
  state.pointPinInput = "";
  if (returnScreen === "point-input") {
    openModal(returnScreen, returnData);
    return;
  }
  openPointScreen();
}

/* ── 04-INP 포인트 직접 입력 ──────────────────────────────────────────────── */
SCREENS["point-input"] = (modal, { maxUsable }) => {
  modal.appendChild(backButton(() => openPointScreen()));
  modal.appendChild(el("h2", "modal__title", "사용할 포인트를 입력해주세요"));

  const box = el("div", "modal__rows");
  box.appendChild(
    rowItem("보유 포인트", point(state.member.point), "row__value--brand"),
  );
  box.appendChild(rowItem("결제금액", won(calcTotals().beforePoint)));
  modal.appendChild(box);

  modal.appendChild(
    el(
      "div",
      "point-rule",
      `최소 ${point(STORE.pointMin)}부터 &nbsp;·&nbsp; ${STORE.pointUnit}P 단위로 사용 가능`,
    ),
  );

  const value = Number(state.pointInput || 0);
  const input = el("div", "point-input");
  input.appendChild(el("span", "point-input__label", "사용할 포인트"));
  input.appendChild(el("strong", "point-input__value", point(value)));
  modal.appendChild(input);

  /* 실시간 검증 : 조건을 못 넘기면 사유를 인라인으로 알리고 버튼을 잠근다. */
  let hint = "";
  if (value > 0 && value < STORE.pointMin) {
    hint = `${point(STORE.pointMin)} 이상 입력해 주세요`;
  } else if (value % STORE.pointUnit !== 0) {
    hint = `${STORE.pointUnit}P 단위로 입력해 주세요`;
  } else if (value > maxUsable) {
    hint = "사용 가능한 포인트를 초과했습니다";
  }
  modal.appendChild(el("p", "point-hint", hint));

  const quick = el("div", "quick-picks");
  [1000, 5000].forEach((amount) => {
    const btn = el("button", "btn btn--ghost", point(amount));
    btn.disabled = amount > maxUsable;
    btn.addEventListener("click", () => {
      state.pointInput = String(amount);
      openModal("point-input", { maxUsable });
    });
    quick.appendChild(btn);
  });
  const allBtn = el("button", "btn btn--ghost", "전액 사용");
  allBtn.disabled = maxUsable < STORE.pointMin;
  allBtn.addEventListener("click", () => {
    state.pointInput = String(maxUsable);
    openModal("point-input", { maxUsable });
  });
  quick.appendChild(allBtn);
  modal.appendChild(quick);

  modal.appendChild(
    keypad((key) => {
      if (key === "전체삭제") {
        state.pointInput = "";
      } else if (key === "←") {
        state.pointInput = state.pointInput.slice(0, -1);
      } else if (state.pointInput.length < 7) {
        state.pointInput = (state.pointInput + key).replace(/^0+/, "");
      }
      openModal("point-input", { maxUsable });
    }),
  );

  const valid =
    value >= STORE.pointMin &&
    value % STORE.pointUnit === 0 &&
    value <= maxUsable;
  modal.appendChild(
    actionRow([
      {
        label: "초기화",
        variant: "ghost",
        onClick: () => {
          state.pointInput = "";
          openModal("point-input", { maxUsable });
        },
      },
      {
        label: valid ? `${point(value)} 적용` : "포인트 적용",
        variant: "primary",
        disabled: !valid,
        onClick: () => {
          state.usedPoint = value;
          renderSummary();
          openPointScreen();
        },
      },
    ]),
  );
};

/* ── 05 결제수단 안내 → P5·P6 승인 ────────────────────────────────────────── */
function startPayment() {
  const method = state.method || "card";
  if (method === "cash") {
    openModal("pay-cash");
    return;
  }
  openModal("pay-device", { method });
}

SCREENS["pay-device"] = (modal, { method }) => {
  const label =
    method === "card"
      ? "카드를 리더기에 꽂아주세요"
      : "간편결제 바코드를 스캔해주세요";
  alertScreen(modal, {
    icon: `<div class="spinner"></div>`,
    title: label,
    desc: "결제가 완료될 때까지 잠시만 기다려 주세요",
    rows: [
      {
        label: "결제금액",
        value: won(calcTotals().payable),
        className: "row__value--brand",
      },
    ],
    actions: actionRow([
      {
        label: "다른 결제수단 선택",
        variant: "primary",
        onClick: () => closeModal(),
      },
    ]),
  });

  setTimeout(() => {
    if (state.modal === "pay-device") {
      openModal("van-waiting", { method });
    }
  }, 1600);
};

SCREENS["pay-cash"] = (modal) => {
  alertScreen(modal, {
    icon: `<div class="spinner"></div>`,
    title: "현금을 투입구에 넣어주세요",
    desc: "지폐와 동전을 넣으면 자동으로 계산됩니다",
    rows: [
      {
        label: "필요 금액",
        value: won(calcTotals().payable),
        className: "row__value--brand",
      },
    ],
    actions: actionRow([
      { label: "결제수단 다시 선택", variant: "neutral", onClick: closeModal },
    ]),
  });

  setTimeout(() => {
    if (state.modal === "pay-cash") {
      completePayment();
    }
  }, 2200);
};

SCREENS["van-waiting"] = (modal, { method }) => {
  alertScreen(modal, {
    icon: `<div class="spinner"></div>`,
    title: "결제를 진행하고 있습니다",
    desc: "카드를 빼거나 자리를 뜨지 마세요\n승인 전까지 취소할 수 없습니다",
    rows: [
      {
        label: "결제금액",
        value: won(calcTotals().payable),
        className: "row__value--brand",
      },
    ],
    actions: actionRow([
      {
        label: "직원 호출",
        variant: "ghost",
        onClick: () => openModal("store-help"),
      },
    ]),
  });

  setTimeout(() => {
    if (state.modal !== "van-waiting") {
      return;
    }
    /* 간편결제는 시연을 위해 첫 시도에서 한 번 거절시킨다. */
    if (method === "easy" && state.vanRetry === 0) {
      state.vanRetry += 1;
      openModal("van-declined");
      return;
    }
    completePayment();
  }, 2000);
};

SCREENS["van-declined"] = (modal) => {
  alertScreen(modal, {
    icon: iconWarning(),
    title: "결제가 승인되지 않았습니다",
    desc: "카드사 응답 사유를 확인하고 다시 시도해 주세요",
    rows: [
      {
        label: "응답 코드",
        value: "051  한도 초과",
        className: "row__value--brand",
      },
    ],
    actions: actionRow(
      [
        {
          label: "다시 시도",
          variant: "primary",
          onClick: () =>
            openModal("van-waiting", { method: state.method || "card" }),
        },
        {
          label: "다른 결제수단 선택",
          variant: "outline",
          onClick: closeModal,
        },
        {
          label: "직원 호출",
          variant: "ghost",
          onClick: () => openModal("store-help"),
        },
      ],
      true,
    ),
  });
  modal.appendChild(
    el(
      "p",
      "modal__note text-center",
      `재시도 ${state.vanRetry} / 3 · 3회 초과 시 매장 문의로 전환됩니다`,
    ),
  );
};

/* ── E-HELP-01 매장 문의 ──────────────────────────────────────────────────── */
SCREENS["store-help"] = (modal) => {
  alertScreen(modal, {
    icon: iconWarning(),
    title: "결제가 완료되지 않았습니다",
    desc: "카드는 정상이며 결제 금액이 빠져나가지 않았습니다",
    rows: [
      {
        label: "키오스크 번호",
        value: `${STORE.kioskNo}번`,
        className: "row__value--big",
      },
      {
        label: "매장 담당자",
        value: STORE.managerPhone,
        className: "row__value--big",
      },
    ],
    actions: actionRow([
      { label: "확인", variant: "primary", onClick: closeModal },
    ]),
  });
  modal.appendChild(
    el(
      "p",
      "modal__note text-center",
      `“${STORE.kioskNo}번 키오스크에서 결제가 안 됐어요” 라고 말씀해 주세요`,
    ),
  );
};

/* ── 06 결제 완료 ─────────────────────────────────────────────────────────── */
function completePayment() {
  const totals = calcTotals();
  if (state.member) {
    state.member.point -= totals.usedPoint;
  }
  openModal("complete", { totals });
}

SCREENS["complete"] = (modal, { totals }) => {
  const earned = earnedPoint(totals.payable);

  modal.appendChild(el("div", "modal__icon", iconSuccess()));
  modal.appendChild(el("h2", "modal__title", "결제가 완료되었습니다"));
  modal.appendChild(
    el("p", "modal__desc", "카드와 구매하신 상품을 확인해주세요"),
  );

  const box = el("div", "modal__rows");
  box.appendChild(
    rowItem("최종 결제금액", won(totals.payable), "row__value--brand"),
  );
  if (totals.couponDiscount > 0) {
    box.appendChild(
      rowItem(
        "쿠폰 할인",
        `−${totals.couponDiscount.toLocaleString("ko-KR")}원`,
        "row__value--brand",
      ),
    );
  }
  if (totals.usedPoint > 0) {
    box.appendChild(rowItem("포인트 사용", point(totals.usedPoint)));
  }
  if (earned !== null) {
    box.appendChild(
      rowItem("적립 포인트", `+${point(earned)}`, "row__value--success"),
    );
    if (!CONFIG.usePointEarn) {
      box.appendChild(
        el("p", "modal__note", "키오스크 결제는 적립 제외됩니다."),
      );
    }
  } else {
    box.appendChild(
      el("p", "modal__note", "비회원 결제는 포인트가 적립되지 않습니다."),
    );
  }
  modal.appendChild(box);

  modal.appendChild(
    actionRow([
      { label: "영수증 없이 완료", variant: "ghost", onClick: resetKiosk },
      { label: "영수증 출력", variant: "primary", onClick: resetKiosk },
    ]),
  );

  const countdown = el("p", "modal__note text-center", "");
  modal.appendChild(countdown);

  let left = STORE.receiptTimeoutSec;
  clearInterval(state.countdownTimer);
  countdown.textContent = `${left}초 후 처음 화면으로 돌아갑니다`;
  state.countdownTimer = setInterval(() => {
    left -= 1;
    countdown.textContent = `${left}초 후 처음 화면으로 돌아갑니다`;
    if (left <= 0) {
      clearInterval(state.countdownTimer);
      resetKiosk();
    }
  }, 1000);
};

/* ── E-ITM 상품 등록 예외 ─────────────────────────────────────────────────── */
SCREENS["item-soldout"] = (modal, { product }) => {
  alertScreen(modal, {
    icon: iconWarning(),
    title: "품절된 상품입니다",
    desc: "이 상품은 담을 수 없습니다. 매대에 되돌려 주세요",
    rows: [{ label: "상품명", value: product.name }],
    actions: actionRow([
      { label: "확인", variant: "primary", onClick: closeModal },
    ]),
  });
};

SCREENS["item-unknown"] = (modal, { barcode }) => {
  alertScreen(modal, {
    icon: iconWarning(),
    title: "미등록 상품입니다",
    desc: "관리자에게 문의해 주세요",
    rows: [{ label: "읽은 바코드", value: barcode }],
    actions: actionRow([
      { label: "확인", variant: "primary", onClick: closeModal },
    ]),
  });
};

SCREENS["item-age"] = (modal, { product }) => {
  alertScreen(modal, {
    icon: iconWarning(),
    title: "미성년자 판매불가 상품입니다",
    desc: "연령 확인이 필요한 상품입니다",
    rows: [{ label: "상품명", value: product.name }],
    actions: actionRow([
      { label: "확인", variant: "primary", onClick: closeModal },
    ]),
  });
};

/* ── E-CNL 취소 확인 ──────────────────────────────────────────────────────── */
SCREENS["clear-cart"] = (modal) => {
  const totals = calcTotals();
  alertScreen(modal, {
    icon: iconWarning(),
    title: "담은 상품을 모두 취소할까요?",
    desc: "장바구니의 상품이 전부 삭제되며 처음 화면으로 돌아갑니다",
    rows: [{ label: "담은 상품", value: `${totals.qty}개` }],
    actions: actionRow([
      { label: "전체 취소", variant: "neutral", onClick: resetKiosk },
      { label: "계속 담기", variant: "primary", onClick: closeModal },
    ]),
  });
};

SCREENS["cancel-checkout"] = (modal) => {
  const totals = calcTotals();
  alertScreen(modal, {
    icon: iconWarning(),
    title: "계산을 취소할까요?",
    desc: "담은 상품과 로그인·포인트 적용이 모두 취소됩니다",
    rows: [{ label: "담은 상품", value: `${totals.qty}개` }],
    actions: actionRow([
      { label: "취소", variant: "neutral", onClick: resetKiosk },
      {
        label: "계속 결제",
        variant: "primary",
        onClick: () => openPointScreen(),
      },
    ]),
  });
};

/* ── E-TMO-01 타임아웃 경고 ───────────────────────────────────────────────── */
SCREENS["timeout"] = (modal) => {
  alertScreen(modal, {
    icon: iconWarning(),
    title: "10초 후 처음 화면으로 돌아갑니다",
    desc: "계속 이용하시려면 화면을 눌러 주세요\n돌아가면 담은 상품과 로그인이 모두 초기화됩니다",
    rows: [
      {
        label: "남은 시간",
        value: "10초",
        className: "row__value--big row__value--brand",
      },
    ],
    actions: actionRow([
      { label: "계속 이용하기", variant: "primary", onClick: closeModal },
    ]),
  });

  let left = 10;
  const valueNode = modal.querySelector(".row__value");
  clearInterval(state.countdownTimer);
  state.countdownTimer = setInterval(() => {
    left -= 1;
    valueNode.textContent = `${left}초`;
    if (left <= 0) {
      clearInterval(state.countdownTimer);
      resetKiosk();
    }
  }, 1000);
};

/* ── 운영 옵션 패널 ───────────────────────────────────────────────────────── */
SCREENS["options"] = (modal) => {
  modal.className = "modal modal--wide";
  modal.appendChild(el("h2", "modal__title", "셀프계산대 운영 옵션"));
  modal.appendChild(
    el(
      "p",
      "modal__desc",
      "적용하면 화면을 새로 불러옵니다. 설정은 이 브라우저에 저장됩니다.",
    ),
  );

  const draft = { ...CONFIG };
  const list = el("div", "options");

  OPTION_META.forEach((meta) => {
    const row = el("div", "option");
    const text = el("div", "option__text");
    text.appendChild(el("strong", "option__name", meta.name));
    text.appendChild(el("p", "option__desc", meta.desc));
    row.appendChild(text);

    if (meta.type === "toggle") {
      const toggle = el("button", `toggle${draft[meta.key] ? " is-on" : ""}`);
      toggle.addEventListener("click", () => {
        draft[meta.key] = !draft[meta.key];
        toggle.classList.toggle("is-on", draft[meta.key]);
      });
      row.appendChild(toggle);
    } else {
      const input = el("input", "option__number");
      input.type = "number";
      input.min = "0";
      input.value = String(draft[meta.key]);
      input.addEventListener("input", () => {
        draft[meta.key] = Number(input.value || 0);
      });
      row.appendChild(input);
    }

    list.appendChild(row);
  });

  modal.appendChild(list);
  modal.appendChild(
    actionRow([
      { label: "취소", variant: "ghost", onClick: closeModal },
      {
        label: "적용하고 새로고침",
        variant: "primary",
        onClick: () => {
          saveConfig(draft);
          location.reload();
        },
      },
    ]),
  );
};

SCREENS["reset-confirm"] = (modal) => {
  alertScreen(modal, {
    icon: iconWarning(),
    title: "시연 기본값으로 초기화할까요?",
    desc: "장바구니와 로그인, 운영 옵션이 모두 처음 상태로 돌아갑니다",
    actions: actionRow([
      { label: "취소", variant: "ghost", onClick: closeModal },
      {
        label: "초기화",
        variant: "primary",
        onClick: () => {
          saveConfig({ ...DEMO_DEFAULTS });
          location.reload();
        },
      },
    ]),
  });
};

/* ==========================================================================
   8. SCANNER
   ========================================================================== */

function focusScanner() {
  const input = $("#scanner-input");
  const scannerModal =
    state.modal === "login" ||
    (state.modal === "pay-device" && state.modalData.method === "easy") ||
    state.modal === "age-approval";
  if (state.modal === null || scannerModal) {
    input.focus({ preventScroll: true });
  }
}

function handleScan(code) {
  const trimmed = code.trim();
  if (trimmed.length === 0) {
    return;
  }

  /* 연령 확인 대기 중 매니저앱 바코드가 입력되면 대기 상품을 담는다. */
  if (state.modal === "age-approval") {
    const pendingProduct = state.modalData.product;
    closeModal();
    addToCart(pendingProduct);
    showToast("성인 확인이 완료되어 상품을 담았습니다");
    return;
  }

  /* 간편결제 바코드는 상품이나 회원 바코드로 해석하지 않는다. */
  if (state.modal === "pay-device" && state.modalData.method === "easy") {
    openModal("van-waiting", { method: "easy" });
    return;
  }

  /* APP 회원 바코드 : 14자리 숫자 */
  const member = MEMBERS.find((m) => m.type === "app" && m.key === trimmed);
  if (member) {
    state.member = { ...member };
    renderMember();
    showToast(`${member.name} 님, 환영합니다`);
    openLoginSuccessDestination();
    return;
  }

  /* 로그인 모달에서는 등록되지 않은 숫자를 상품으로 처리하지 않는다. */
  if (state.modal === "login") {
    openModal("not-member", {
      phone: trimmed.length === 11 ? trimmed : "",
      lookupValue: trimmed,
    });
    return;
  }

  const product = PRODUCTS.find((p) => p.barcode === trimmed);
  if (!product) {
    openModal("item-unknown", { barcode: trimmed });
    return;
  }

  pickProduct(product);
}

/* 화면 선택과 바코드 스캔이 같은 검증을 거치도록 한곳으로 모은다. */
function pickProduct(product) {
  if (product.soldOut) {
    openModal("item-soldout", { product });
    return;
  }
  if (product.ageLimit) {
    openModal(CONFIG.blockAgeRestricted ? "item-age" : "age-approval", {
      product,
    });
    return;
  }
  addToCart(product);
  showToast(`${product.name} 담았습니다`);
}

/* ==========================================================================
   9. INIT
   ========================================================================== */

function resetKiosk() {
  clearInterval(state.countdownTimer);
  state.cart = [];
  state.member = null;
  state.usedPoint = 0;
  state.method = null;
  state.loginPurpose = "checkout";
  state.phoneInput = "";
  state.pointInput = "";
  state.signupPhone = "";
  state.signupPin = "";
  state.pointPinInput = "";
  state.pointPinAttempts = 0;
  state.pointPinVerified = false;
  state.pointPinReturnScreen = "point-phone";
  state.pointPinReturnData = {};
  state.vanRetry = 0;
  state.category = CATEGORIES[0];
  state.page = 0;
  closeModal();
  renderAll();
}

function resetIdleTimer() {
  clearTimeout(state.idleTimer);
  clearTimeout(state.warnTimer);

  const limit = Number(CONFIG.timeoutSec || 0);
  if (limit <= 0) {
    return;
  }

  /* 만료 10초 전에 경고를 띄운다. 경고보다 짧게 설정하면 즉시 경고. */
  const warnAfter = Math.max(1, limit - 10) * 1000;
  state.warnTimer = setTimeout(() => {
    if (state.modal === null && state.cart.length > 0) {
      openModal("timeout");
    }
  }, warnAfter);
}

function bindEvents() {
  on("#btn-options", "click", () => openModal("options"));
  on("#btn-reset", "click", () => openModal("reset-confirm"));
  on("#btn-point-lookup", "click", () => {
    if (state.member) {
      openModal("point-history");
      return;
    }
    state.loginPurpose = "history";
    openModal("login");
  });
  on("#btn-bag", "click", () => openModal("bag"));
  on("#btn-clear-cart", "click", () => {
    if (state.cart.length === 0) {
      showToast("담긴 상품이 없습니다");
      return;
    }
    openModal("clear-cart");
  });
  /*
    결제수단 타일을 누르면 그 수단으로 곧바로 결제를 시작한다.
    별도의 결제하기 버튼은 두지 않는다. (04 기획 기준)
  */
  $$(".method").forEach((node) => {
    node.addEventListener("click", () => {
      const method = node.dataset.method;
      if (state.cart.length === 0) {
        showToast("담긴 상품이 없습니다");
        return;
      }
      if (method === "cash" && !CONFIG.useCash) {
        showToast("이 매장은 현금결제를 사용하지 않습니다");
        return;
      }
      state.method = method;
      renderMethods();
      resetIdleTimer();

      if (!CONFIG.useMemberLogin) {
        startPayment();
        return;
      }
      if (state.member) {
        openPointScreen();
        return;
      }
      state.loginPurpose = "checkout";
      openModal("login-prompt");
    });
  });

  on("#btn-cat-prev", "click", () => {
    switchCatalog(() => {
      const index = CATEGORIES.indexOf(state.category);
      state.category =
        CATEGORIES[(index - 1 + CATEGORIES.length) % CATEGORIES.length];
      state.page = 0;
    });
  });
  on("#btn-cat-next", "click", () => {
    switchCatalog(() => {
      const index = CATEGORIES.indexOf(state.category);
      state.category = CATEGORIES[(index + 1) % CATEGORIES.length];
      state.page = 0;
    });
  });

  on("#btn-page-prev", "click", () => {
    switchCatalog(() => {
      state.page = Math.max(0, state.page - 1);
    });
  });
  on("#btn-page-next", "click", () => {
    switchCatalog(() => {
      const items = PRODUCTS.filter((p) => p.cat === state.category);
      const last = Math.max(0, Math.ceil(items.length / 10) - 1);
      state.page = Math.min(last, state.page + 1);
    });
  });

  /* 스캐너 입력 : Enter 로 한 건이 끝난다. */
  const scanner = $("#scanner-input");
  scanner.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    const code = scanner.value;
    scanner.value = "";
    handleScan(code);
  });

  document.addEventListener("click", () => focusScanner());
  document.addEventListener("keydown", () => resetIdleTimer());
  setInterval(focusScanner, 1200);
}

function init() {
  $(".header__store-name").textContent = STORE.name;
  bindEvents();
  renderAll();
  focusScanner();
  resetIdleTimer();
  console.info("[토마토 키오스크] 운영 옵션", CONFIG);
}

document.addEventListener("DOMContentLoaded", init);
