"use strict";

const TEST_MEMBER = { phone: "01012341234", points: 4259, createdAt: "demo-seed" };
const BARCODE_PRODUCTS = new Map([
  ["8809219929858", { id: "barcode-8809219929858", barcode: "8809219929858", name: "서리태 가득 콩물두유", price: 2500 }],
  ["8801223100209", { id: "barcode-8801223100209", barcode: "8801223100209", name: "초정 탄산수", price: 1500 }],
]);
const DEMO_POINT_HISTORY = [
  { dateTime: "2026-09-03 17:21:11", type: "적립", earned: 159, used: 0 },
  { dateTime: "2026-08-30 12:15:20", type: "사용", earned: 0, used: 100 },
  { dateTime: "2026-08-20 18:42:03", type: "적립", earned: 300, used: 0 },
  { dateTime: "2026-08-15 10:09:44", type: "적립", earned: 400, used: 0 },
  { dateTime: "2026-07-10 16:20:10", type: "사용", earned: 0, used: 500 },
  { dateTime: "2026-06-20 09:31:08", type: "적립", earned: 4000, used: 0 },
];
const productSpecs = {
  라면: ["신라면|1000|🍜", "진라면 매운맛|950|🍜", "짜파게티|1200|🍝", "불닭볶음면|1300|🌶️", "너구리|1150|🍲", "육개장 사발면|1100|🥣"],
  음료: ["생수 500ml|900|💧", "콜라 500ml|2200|🥤", "사이다 500ml|2100|🥤", "오렌지 주스|2500|🧃", "아메리카노|2300|☕", "이온음료|2000|🧊"],
  냉장: ["서울우유|2900|🥛", "딸기 요구르트|1800|🍓", "훈제란 2입|2200|🥚", "컵 과일|3900|🍎", "삼각김밥|1600|🍙", "치즈 샌드위치|3500|🥪"],
  간식: ["새우깡|1700|🦐", "감자칩|2200|🥔", "초코 쿠키|2500|🍪", "아몬드|3000|🥜", "젤리|1800|🍬", "초콜릿|2100|🍫"],
  생활: ["미니 물티슈|1500|🧻", "칫솔|2400|🪥", "우산|7000|☂️", "건전지 2입|3500|🔋", "마스크 3입|2000|😷", "휴대용 티슈|1200|🧻"],
  건강: ["비타민 음료|1400|🍋", "단백질 바|2800|💪", "견과 믹스|2500|🥜", "제로 탄산|1900|🫧", "홍삼 젤리|3200|🟥", "프로틴 음료|3400|🥛"],
  간편식: ["김치볶음밥|4500|🍛", "치킨 도시락|5900|🍱", "떡볶이|3800|🍢", "핫도그|2900|🌭", "참치 주먹밥|2400|🍙", "크림 파스타|5200|🍝"],
  반려동물: ["강아지 간식|3500|🐶", "고양이 간식|3300|🐱", "휴대용 물그릇|4900|🥣", "배변 봉투|2200|🐾", "미니 장난감|5500|🎾", "반려동물 물티슈|2800|🧻"],
};

const categories = Object.entries(productSpecs).map(([name, specs], categoryIndex) => ({
  name,
  products: specs.map((spec, productIndex) => {
    const [productName, price, emoji] = spec.split("|");
    const numericPrice = Number(price);
    return {
      id: `p-${categoryIndex}-${productIndex}`,
      name: productName,
      price: numericPrice,
      emoji,
      originalPrice: productIndex >= 4 ? Math.ceil((numericPrice * 1.25) / 100) * 100 : null,
    };
  }),
}));

const BAG_PRODUCT = { id: "bag", name: "쇼핑 봉투", price: 100, emoji: "🛍️" };
const methodLabels = { card: "신용카드", easy: "간편결제", cash: "현금결제" };
const state = {
  cart: new Map(),
  categoryIndex: 0,
  paymentMethod: "card",
  member: null,
  pointsUsed: 0,
  phoneInput: "",
  pointInput: "",
  modalMode: null,
  paymentTimer: null,
  countdownTimer: null,
  barcodeTimer: null,
  modalAutoCloseTimer: null,
  flowContext: "payment",
  historyRange: 7,
  touchStartX: null,
};

const $ = (selector) => document.querySelector(selector);
const elements = {
  kiosk: $("#kiosk"),
  stageShell: $("#stageShell"),
  cartList: $("#cartList"),
  cartCount: $("#cartCount"),
  categoryTabs: $("#categoryTabs"),
  activeCategoryName: $("#activeCategoryName"),
  categoryPosition: $("#categoryPosition"),
  productGrid: $("#productGrid"),
  paymentMethods: $("#paymentMethods"),
  subtotalText: $("#subtotalText"),
  discountText: $("#discountText"),
  totalText: $("#totalText"),
  memberSummary: $("#memberSummary"),
  checkoutLabel: $("#checkoutLabel"),
  checkoutButton: $("#checkoutButton"),
  paymentDock: $("#paymentDock"),
  paymentGuideText: $("#paymentGuideText"),
  amountHint: $("#amountHint"),
  memberHeader: $("#memberHeader"),
  memberPhoneText: $("#memberPhoneText"),
  memberPointText: $("#memberPointText"),
  barcodeScannerInput: $("#barcodeScannerInput"),
  historyButton: $("#historyButton"),
  pointLookupButton: $("#pointLookupButton"),
  modalLayer: $("#modalLayer"),
  modalContent: $("#modalContent"),
  toast: $("#toast"),
};

const memberStore = {
  database: null,
  fallbackKey: "tomato-kiosk-members-v1",

  async open() {
    if ("indexedDB" in window) {
      try {
        this.database = await new Promise((resolve, reject) => {
          const request = indexedDB.open("tomato-kiosk-demo", 1);
          request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains("members")) {
              request.result.createObjectStore("members", { keyPath: "phone" });
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn("IndexedDB를 열지 못해 localStorage로 전환합니다.", error);
      }
    }
    await this.seed();
  },

  fallbackMembers() {
    try {
      return JSON.parse(localStorage.getItem(this.fallbackKey) || "{}");
    } catch {
      return {};
    }
  },

  async get(phone) {
    if (!this.database) {
      return this.fallbackMembers()[phone] || null;
    }
    return new Promise((resolve, reject) => {
      const request = this.database.transaction("members", "readonly").objectStore("members").get(phone);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async put(member) {
    if (!this.database) {
      const members = this.fallbackMembers();
      members[member.phone] = member;
      localStorage.setItem(this.fallbackKey, JSON.stringify(members));
      return;
    }
    return new Promise((resolve, reject) => {
      const request = this.database.transaction("members", "readwrite").objectStore("members").put(member);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clear() {
    if (!this.database) {
      localStorage.removeItem(this.fallbackKey);
    } else {
      await new Promise((resolve, reject) => {
        const request = this.database.transaction("members", "readwrite").objectStore("members").clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    await this.seed();
  },

  async seed() {
    const existingTestMember = await this.get(TEST_MEMBER.phone);
    if (!existingTestMember || (existingTestMember.createdAt === "demo-seed" && existingTestMember.points === 2000)) {
      await this.put({ ...TEST_MEMBER });
    }
  },
};

const won = (value) => `${Math.max(0, value).toLocaleString("ko-KR")}원`;
const points = (value) => `${Math.max(0, value).toLocaleString("ko-KR")}P`;
const subtotal = () => [...state.cart.values()].reduce((sum, item) => sum + item.product.price * item.quantity, 0);
const total = () => Math.max(0, subtotal() - state.pointsUsed);
const itemCount = () => [...state.cart.values()].reduce((sum, item) => sum + item.quantity, 0);
const normalizePhone = (value) => String(value).replace(/\D/g, "").slice(0, 11);

function formatPhone(value) {
  const digits = normalizePhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function phoneInputMarkup(value) {
  const digits = normalizePhone(value);
  const middle = digits.slice(3, 7);
  const last = digits.slice(7, 11);
  const middlePlaceholder = "_".repeat(4 - middle.length);
  const lastPlaceholder = "_".repeat(4 - last.length);

  return `<span class="phone-prefix">010</span><span class="phone-separator">-</span><span class="phone-entered">${middle}</span><span class="phone-placeholder">${middlePlaceholder}</span><span class="phone-separator">-</span><span class="phone-entered">${last}</span><span class="phone-placeholder">${lastPlaceholder}</span>`;
}

function safeMaxPoints() {
  if (!state.member) return 0;
  return Math.floor(Math.min(state.member.points, subtotal()) / 50) * 50;
}

function resolveKioskHeight(viewportHeight) {
  if (viewportHeight < 1600) return 1920;
  return Math.min(viewportHeight, 1920);
}

function updateScale() {
  const scale = Math.min(1, window.innerWidth / 1080);
  const kioskHeight = resolveKioskHeight(window.innerHeight);
  elements.kiosk.style.setProperty("--kiosk-scale", scale);
  elements.kiosk.style.setProperty("--kiosk-height", `${kioskHeight}px`);
  elements.stageShell.style.width = `${1080 * scale}px`;
  elements.stageShell.style.height = `${kioskHeight * scale}px`;
}

function renderTotals() {
  if (state.pointsUsed > safeMaxPoints()) state.pointsUsed = safeMaxPoints();
  const hasProducts = state.cart.size > 0;
  elements.subtotalText.textContent = won(subtotal());
  elements.discountText.textContent = points(state.pointsUsed);
  elements.totalText.textContent = won(total());
  elements.checkoutLabel.textContent = "결제하기";
  elements.checkoutButton.disabled = !hasProducts;
  elements.paymentDock.classList.toggle("is-disabled", !hasProducts);
  elements.paymentGuideText.textContent = hasProducts
    ? "결제수단을 선택한 뒤 결제하기를 눌러주세요"
    : "상품을 담으면 결제할 수 있습니다";
  elements.amountHint.textContent = hasProducts
    ? "결제하기를 누르면 포인트 확인 단계로 이동합니다"
    : "상품을 먼저 담아주세요";
  elements.paymentMethods.querySelectorAll(".payment-method").forEach((button) => {
    button.disabled = !hasProducts;
  });
  elements.memberSummary.textContent = state.member
    ? `${formatPhone(state.member.phone)} · 보유 ${points(state.member.points)} · 사용 ${points(state.pointsUsed)}`
    : "회원 확인 전 · 포인트 사용 전";
  elements.memberHeader.hidden = !state.member;
  elements.historyButton.disabled = !state.member;
  if (state.member) {
    elements.memberPhoneText.textContent = `${formatPhone(state.member.phone)} 님`;
    elements.memberPointText.textContent = `보유 포인트 ${points(state.member.points)}`;
  }
}

function renderCart() {
  const cartItems = [...state.cart.values()];
  const listPriceTotal = cartItems.reduce(
    (sum, { product, quantity }) => sum + (product.originalPrice || product.price) * quantity,
    0,
  );
  const productDiscount = Math.max(0, listPriceTotal - subtotal());
  const cartSummary = `
    <section class="cart-summary" aria-label="결제 요약">
      <div class="cart-summary-heading">
        <strong>결제 요약</strong>
        ${productDiscount ? '<span>할인 적용 완료</span>' : ""}
      </div>
      <div class="cart-summary-metrics">
        <div class="summary-metric">
          <span>총 수량</span>
          <strong>${itemCount().toLocaleString("ko-KR")}개</strong>
        </div>
        <div class="summary-metric summary-metric--discount">
          <span>상품 할인</span>
          <strong>−${won(productDiscount)}</strong>
        </div>
        <div class="summary-metric summary-metric--final">
          <span>예상 결제금액</span>
          <strong>${won(subtotal())}</strong>
        </div>
      </div>
    </section>`;

  elements.cartList.innerHTML = state.cart.size
    ? `${cartItems.map(({ product, quantity }) => {
        const originalUnitPrice = product.originalPrice || product.price;
        const originalLinePrice = originalUnitPrice * quantity;
        const linePrice = product.price * quantity;
        const discount = originalLinePrice - linePrice;
        return `
        <article class="cart-row" data-cart-id="${product.id}">
          <div class="cart-product">
            <div class="cart-product-name">${product.name}</div>
            ${discount ? `<span class="cart-promotion">행사할인&nbsp; −${won(discount)}</span>` : ""}
          </div>
          <div class="cart-unit-price">${won(originalUnitPrice)}</div>
          <div class="quantity-control" aria-label="${product.name} 수량">
            <button type="button" data-cart-action="decrease" aria-label="수량 감소">−</button>
            <span>${quantity}</span>
            <button type="button" data-cart-action="increase" aria-label="수량 증가">+</button>
          </div>
          <div class="cart-amount">
            ${discount ? `<del>${won(originalLinePrice)}</del>` : ""}
            <div class="cart-line-total ${discount ? "is-discounted" : ""}">${won(linePrice)}</div>
          </div>
          <button class="remove-item" type="button" data-cart-action="remove" aria-label="${product.name} 삭제">×</button>
        </article>`;
      }).join("")}${cartSummary}`
    : `<div class="empty-cart"><img class="empty-cart-icon" src="assets/scan-product.png" alt="" /><strong>아직 담긴 상품이 없습니다</strong><p>상품 바코드를 스캔하거나<br />오른쪽에서 상품을 직접 선택하세요</p></div>`;
  elements.cartCount.textContent = itemCount().toLocaleString("ko-KR");
  renderTotals();
}

function renderCatalog(animate = false) {
  const category = categories[state.categoryIndex];
  elements.categoryTabs.innerHTML = categories.map((item, index) => `
    <button class="category-tab ${index === state.categoryIndex ? "is-active" : ""}" type="button" role="tab" aria-selected="${index === state.categoryIndex}" data-category-index="${index}">${item.name}</button>`).join("");
  elements.productGrid.innerHTML = category.products.map((product) => `
    <button class="product-card" type="button" data-product-id="${product.id}">
      <strong>${product.name}</strong>
      <span class="product-price">${product.originalPrice ? `<del>${won(product.originalPrice)}</del>` : ""}${won(product.price)}</span>
      <span class="promotion-slot">${product.originalPrice ? "행사" : ""}</span>
    </button>`).join("");
  elements.activeCategoryName.textContent = category.name;
  elements.categoryPosition.textContent = `${state.categoryIndex + 1} / ${categories.length}`;
  if (animate) {
    elements.productGrid.classList.remove("is-changing");
    requestAnimationFrame(() => elements.productGrid.classList.add("is-changing"));
  }
  requestAnimationFrame(() => elements.categoryTabs.querySelector(".category-tab.is-active")?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }));
}

function setCategory(index) {
  state.categoryIndex = (index + categories.length) % categories.length;
  renderCatalog(true);
}

function findProduct(id) {
  return categories.flatMap((category) => category.products).find((product) => product.id === id);
}

function addProduct(product) {
  const current = state.cart.get(product.id);
  state.cart.set(product.id, { product, quantity: current ? current.quantity + 1 : 1 });
  renderCart();
  showToast(`${product.name} 상품을 담았습니다.`);
}

function changeQuantity(id, amount) {
  const current = state.cart.get(id);
  if (!current) return;
  if (current.quantity + amount <= 0) state.cart.delete(id);
  else state.cart.set(id, { ...current, quantity: current.quantity + amount });
  renderCart();
}

let toastTimer = null;
function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 1900);
}

function clearFlowTimers() {
  window.clearTimeout(state.paymentTimer);
  window.clearInterval(state.countdownTimer);
  window.clearTimeout(state.modalAutoCloseTimer);
  state.paymentTimer = null;
  state.countdownTimer = null;
  state.modalAutoCloseTimer = null;
}

function scannerScreenIsActive() {
  return elements.modalLayer.hidden;
}

function focusBarcodeScanner() {
  if (!scannerScreenIsActive()) return;
  elements.barcodeScannerInput.value = "";
  elements.barcodeScannerInput.focus({ preventScroll: true });
}

function openModal(mode, html) {
  clearFlowTimers();
  state.modalMode = mode;
  elements.modalContent.innerHTML = html;
  elements.modalLayer.hidden = false;
  requestAnimationFrame(() => elements.modalContent.querySelector("button, input")?.focus());
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeModal() {
  clearFlowTimers();
  state.modalMode = null;
  elements.modalLayer.hidden = true;
  elements.modalContent.innerHTML = "";
  window.setTimeout(focusBarcodeScanner, 0);
}

function modalHeader(kicker, title, description = "") {
  return `<header class="modal-header"><p class="modal-kicker">${kicker}</p><h2 id="modalTitle">${title}</h2>${description ? `<p class="modal-description">${description}</p>` : ""}</header>`;
}

function openUnknownProductModal(barcode) {
  openModal("unknown-product", `
    ${modalHeader("BARCODE ERROR", "등록되지 않은 상품입니다", "관리자에게 문의하세요.")}
    <div class="modal-body unknown-product-body">
      <div class="unknown-product-icon" aria-hidden="true">!</div>
      <p class="unknown-product-code">입력 바코드 <strong>${barcode || "확인 불가"}</strong></p>
      <p class="helper-note warning">이 안내는 3초 뒤 자동으로 닫힙니다.</p>
    </div>
    <div class="modal-actions"><button class="primary-button" type="button" data-action="close">확인</button></div>`);
  state.modalAutoCloseTimer = window.setTimeout(closeModal, 3000);
}

function processBarcode(rawValue) {
  window.clearTimeout(state.barcodeTimer);
  const barcode = String(rawValue).replace(/\D/g, "");
  elements.barcodeScannerInput.value = "";
  if (!barcode) return focusBarcodeScanner();
  const product = BARCODE_PRODUCTS.get(barcode);
  if (!product) return openUnknownProductModal(barcode);
  addProduct(product);
  window.setTimeout(focusBarcodeScanner, 0);
}

function parseHistoryDate(value) {
  return new Date(value.replace(" ", "T"));
}

function historyRows(rangeDays) {
  const reference = Math.max(...DEMO_POINT_HISTORY.map((row) => parseHistoryDate(row.dateTime).getTime()));
  const cutoff = reference - rangeDays * 24 * 60 * 60 * 1000;
  return DEMO_POINT_HISTORY.filter((row) => parseHistoryDate(row.dateTime).getTime() >= cutoff);
}

function openPointHistory(rangeDays = state.historyRange) {
  if (!state.member) return;
  state.historyRange = rangeDays;
  const rows = historyRows(rangeDays);
  const earnedTotal = rows.reduce((sum, row) => sum + row.earned, 0);
  const usedTotal = rows.reduce((sum, row) => sum + row.used, 0);
  openModal("point-history", `
    <div class="point-history-modal">
      ${modalHeader("POINT HISTORY", "포인트 적립·사용 내역", `${formatPhone(state.member.phone)} 님의 조회 내역입니다.`)}
      <div class="modal-body">
        <div class="history-filter" aria-label="조회 기간">
          ${[[7, "최근 1주일"], [30, "최근 1개월"], [90, "최근 3개월"]].map(([days, label]) => `<button class="${days === rangeDays ? "is-selected" : ""}" type="button" data-history-range="${days}">${label}</button>`).join("")}
        </div>
        <div class="history-summary"><span>조회 기간 합계</span><strong class="is-earned">+${points(earnedTotal)}</strong><strong class="is-used">−${points(usedTotal)}</strong></div>
        <div class="history-table" role="table" aria-label="포인트 내역">
          <div class="history-row history-head" role="row"><span>일시</span><span>적립/사용구분</span><span>적립</span><span>사용</span></div>
          ${rows.length ? rows.map((row) => `<div class="history-row" role="row"><time>${row.dateTime}</time><span><b class="history-type ${row.type === "적립" ? "is-earned" : "is-used"}">${row.type}</b></span><strong class="history-earned">${row.earned ? points(row.earned) : "-"}</strong><strong class="history-used">${row.used ? points(row.used) : "-"}</strong></div>`).join("") : '<p class="history-empty">해당 기간의 포인트 내역이 없습니다.</p>'}
        </div>
        <p class="history-source-note">시연 데이터 · 실제 연동 시 ERP의 일시, 적립/사용구분, 적립, 사용 컬럼을 표시합니다.</p>
      </div>
      <div class="modal-actions"><button class="primary-button" type="button" data-action="close">확인</button></div>
    </div>`);
}

function keypadMarkup(kind, options = {}) {
  const clearLabel = options.clearLabel || "전체삭제";
  const backspaceLabel = options.backspaceLabel || "←";
  const zeroPrefix = options.doubleZero ? '<button type="button" data-key="00">00</button>' : `<button type="button" data-key="clear">${clearLabel}</button>`;
  return `<div class="keypad" data-keypad="${kind}">
    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => `<button type="button" data-key="${number}">${number}</button>`).join("")}
    ${zeroPrefix}<button type="button" data-key="0">0</button><button type="button" data-key="backspace" aria-label="한 글자 지우기">${backspaceLabel}</button>
  </div>`;
}

function openPointLookup() {
  openModal("point-decision", `
    <div class="figma-modal point-decision-modal">
      <button class="figma-back" type="button" data-action="close">뒤로</button>
      <h2 id="modalTitle">포인트를 확인하시겠습니까?</h2>
      <div class="benefit-promise">
        <span class="benefit-icon">✓</span>
        <div>
          <strong>휴대폰 번호로 회원을 확인하면</strong>
          <b>보유 포인트 조회·사용 가능</b>
          <p>상품 특매·이벤트 할인은 로그인과 관계없이 장바구니 금액에 이미 반영되어 있습니다.</p>
        </div>
      </div>
      <div class="figma-action-stack">
        <button class="figma-primary" type="button" data-action="open-phone-entry">휴대폰 번호로 확인</button>
        <button class="figma-secondary" type="button" data-action="open-phone-entry">신규 회원가입</button>
        <button class="figma-secondary" type="button" data-action="guest-payment">포인트 없이 결제</button>
      </div>
      <p class="figma-footnote">다음 화면에서 휴대폰 번호를 입력하면 보유 포인트를 확인할 수 있습니다.</p>
    </div>`);
}

function openPhoneEntry() {
  state.phoneInput = "010";
  renderPointLookup();
}

function renderPointLookup() {
  if (!state.phoneInput.startsWith("010")) state.phoneInput = "010";
  openModal("phone", `
    <div class="figma-modal phone-login-modal">
      <button class="figma-back" type="button" data-action="back-to-point-decision">뒤로</button>
      <h2 id="modalTitle">휴대폰 번호를 입력해주세요</h2>
      <p class="figma-subtitle">회원 확인 후 보유 포인트를 조회하고 사용할 수 있습니다.</p>
      <section class="phone-login-panel">
        <h3>휴대폰 번호로 회원 확인</h3>
        <p>로그인 후 보유 포인트를 조회하고 사용할 수 있습니다.<br />특매·이벤트 할인은 이미 반영되어 있습니다.</p>
        <div class="phone-display" id="phoneDisplay" aria-label="휴대폰 번호 ${formatPhone(state.phoneInput)}">${phoneInputMarkup(state.phoneInput)}</div>
        ${keypadMarkup("phone")}
        <p class="error-message" id="phoneError"></p>
        <button class="figma-dark" type="button" data-action="lookup-member">확인</button>
      </section>
    </div>`);
}

async function lookupMember() {
  if (state.phoneInput.length !== 11) {
    $("#phoneError").textContent = "휴대폰 번호 11자리를 입력해 주세요.";
    return;
  }
  const member = await memberStore.get(state.phoneInput);
  if (!member) {
    openMemberNotFound();
    return;
  }
  state.member = member;
  state.pointsUsed = 0;
  renderTotals();
  if (state.flowContext === "header") {
    closeModal();
    showToast(`${formatPhone(member.phone)} 님 · 보유 포인트 ${points(member.points)}`);
    return;
  }
  openPointUse();
}

function openMemberNotFound() {
  openModal("not-found", `
    <div class="figma-modal member-not-found-modal">
      <button class="figma-back" type="button" data-action="retry-phone">뒤로</button>
      <section class="not-found-alert">
        <span>회원 확인 결과</span>
        <h2 id="modalTitle">등록된 회원을 찾지 못했습니다</h2>
        <strong>입력 번호&nbsp; ${formatPhone(state.phoneInput).replaceAll("-", " ")}</strong>
        <p>번호가 맞는지 확인하거나 아래에서 바로 회원가입을 진행해주세요.</p>
      </section>
      <section class="signup-benefit">
        <span class="benefit-icon">i</span>
        <div><strong>지금 바로 간편 회원가입</strong><p>휴대폰 번호만 확인하면 가입 완료 · 시연용 5,000P가 즉시 지급됩니다.</p></div>
      </section>
      <div class="signup-decision-row">
        <button class="figma-secondary" type="button" data-action="retry-phone">휴대폰 번호 다시 입력</button>
        <button class="figma-primary" type="button" data-action="complete-signup">이 번호로 회원가입</button>
      </div>
      <button class="figma-secondary figma-full" type="button" data-action="guest-payment">포인트 없이 결제</button>
    </div>`);
}

async function completeSignup() {
  const member = { phone: state.phoneInput, points: 5000, createdAt: new Date().toISOString() };
  await memberStore.put(member);
  state.member = member;
  state.pointsUsed = 0;
  renderTotals();
  openSignupComplete();
}

function openSignupComplete() {
  openModal("signup-complete", `
    <div class="figma-modal signup-complete-modal">
      <section class="signup-complete-summary">
        <span>회원가입 완료</span>
        <h2 id="modalTitle">회원가입이 완료되었습니다</h2>
        <strong>회원 번호&nbsp; ${formatPhone(state.phoneInput).replaceAll("-", " ")}</strong>
        <p>시연용 포인트 5,000P가 즉시 지급되었습니다.</p>
      </section>
      <section class="signup-benefit signup-benefit--success">
        <span class="benefit-icon">i</span>
        <div><strong>포인트 지급 완료 · 5,000P</strong><p>3초 뒤 선택한 결제수단으로 자동 이동합니다.</p></div>
      </section>
      <button class="figma-primary figma-full" type="button" data-action="continue-after-signup">결제 계속</button>
    </div>`);
  state.paymentTimer = window.setTimeout(() => startPayment(), 3000);
}

function openPointUse() {
  const maximum = safeMaxPoints();
  openModal("point-use", `
    <div class="figma-modal point-use-modal">
      <button class="figma-back" type="button" data-action="back-to-point-decision">뒤로</button>
      <h2 id="modalTitle">보유 포인트를 사용하시겠습니까?</h2>
      <section class="member-point-summary">
        <div class="member-point-heading"><strong>휴대폰 회원</strong><span>포인트 조회·적립</span></div>
        <div class="point-amount-grid">
          <div><span>보유 포인트 · 50P 단위 사용</span><strong>${points(state.member.points)}</strong></div>
          <div><span>결제금액</span><strong>${won(subtotal())}</strong></div>
        </div>
      </section>
      <div class="point-choice-row">
        <button class="figma-secondary ${state.pointsUsed === 0 ? "is-selected" : ""}" type="button" data-action="select-no-points">사용 안 함</button>
        <button class="figma-secondary" type="button" data-action="open-direct-points" ${maximum === 0 ? "disabled" : ""}>직접 입력</button>
        <button class="figma-primary ${state.pointsUsed === maximum && maximum > 0 ? "is-selected" : ""}" type="button" data-action="select-all-points" ${maximum === 0 ? "disabled" : ""}>사용 가능 전액 ✓</button>
      </div>
      <div class="applied-result"><div><span>포인트 사용 · 잔여 ${points(state.member.points - state.pointsUsed)}</span><strong>−${points(state.pointsUsed)}</strong></div><div><span>최종 결제금액</span><strong>${won(total())}</strong></div></div>
      <button class="figma-primary figma-full" type="button" data-action="apply-points">적용하고 결제 계속</button>
    </div>`);
}

function openDirectPoints() {
  state.pointInput = state.pointsUsed ? String(state.pointsUsed) : "";
  renderDirectPoints();
}

function renderDirectPoints(errorMessage = "") {
  const display = state.pointInput ? points(Number(state.pointInput)) : "0P";
  const hasError = Boolean(errorMessage);
  openModal("direct-points", `
    <div class="figma-modal direct-point-modal ${hasError ? "has-error" : ""}">
      <button class="figma-back" type="button" data-action="back-to-points">뒤로</button>
      <h2 id="modalTitle">사용할 포인트를 입력해주세요</h2>
      <div class="point-and-amount"><div><span>보유 포인트 · 50P 단위 사용</span><strong>${points(state.member.points)}</strong></div><div><span>결제금액</span><strong>${won(subtotal())}</strong></div></div>
      <div class="point-unit-rule"><strong>50P</strong><span>이 매장은 50P 단위로 사용할 수 있어요 · 최대 ${points(safeMaxPoints())}</span></div>
      <div class="point-input-display"><span>사용할 포인트</span><strong id="pointDisplay">${display}</strong></div>
      ${hasError ? `<p class="point-unit-error" id="pointError">${errorMessage}</p>` : ""}
      ${keypadMarkup("point", { doubleZero: true, backspaceLabel: "⌫" })}
      <div class="direct-point-actions"><button class="figma-secondary" type="button" data-action="clear-point-input">초기화</button><button class="${hasError ? "figma-disabled" : "figma-primary"}" type="button" data-action="confirm-direct-points">${hasError ? "입력값을 확인해주세요" : `${display} 적용`}</button></div>
    </div>`);
}

function confirmDirectPoints() {
  const value = Number(state.pointInput || 0);
  if (value <= 0) return renderDirectPoints("사용할 포인트를 입력해 주세요.");
  if (value % 50 !== 0) return renderDirectPoints("포인트는 50P 단위로 입력해 주세요.");
  if (value > safeMaxPoints()) return renderDirectPoints(`최대 ${points(safeMaxPoints())}까지 사용할 수 있습니다.`);
  state.pointsUsed = value;
  renderTotals();
  openPointUse();
}

function renderPaymentMethods() {
  elements.paymentMethods.querySelectorAll(".payment-method").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.method === state.paymentMethod);
  });
}

function startPayment(method = state.paymentMethod) {
  state.paymentMethod = method;
  renderPaymentMethods();
  const visual = {
    card: ["카드를 리더기에 꽂아주세요", "assets/card-reader.png", "카드를 읽고 있습니다."],
    easy: ["결제 바코드를 스캔해 주세요", "assets/easy-pay-scan.png", "간편결제 승인을 기다리고 있습니다."],
    cash: ["현금투입구에 돈을 넣어주세요", "assets/cash-slot.png", "투입 금액을 확인하고 있습니다."],
  }[method];
  const amount = method === "cash"
    ? `<div class="cash-breakdown"><div><span>결제 금액</span><strong>${won(total())}</strong></div><div><span>투입 금액</span><strong>${won(total())}</strong></div><div><span>남은 금액</span><strong>0원</strong></div></div>`
    : `<p class="amount-focus">결제 금액 <strong>${won(total())}</strong></p>`;
  openModal("processing", `
    ${modalHeader("PAYMENT", visual[0], "잠시만 기다려 주세요. 약 3초 뒤 테스트 결과가 표시됩니다.")}
    <div class="modal-body">${amount}<img class="payment-visual ${method === "card" ? "payment-visual--card" : ""}" src="${visual[1]}" alt="" /><div class="processing-bar" aria-hidden="true"></div><p class="processing-status">${visual[2]}</p></div>
    <div class="modal-actions"><button class="secondary-button" type="button" data-action="cancel-payment">결제 취소</button></div>`);
  state.paymentTimer = window.setTimeout(() => method === "easy" ? openPaymentError() : completePayment(), 3000);
}

function openPaymentError() {
  openModal("payment-error", `
    ${modalHeader("APPROVAL ERROR", "결제 승인이 완료되지 않았습니다", "간편결제 승인 시간이 초과되었습니다. 다른 결제수단을 선택하거나 다시 시도해 주세요.")}
    <div class="modal-body">
      <img class="status-icon" src="assets/payment-error.png" alt="결제 오류" />
      <p class="helper-note warning">승인 오류 · 다시 시도하거나 결제수단을 변경해 주세요.</p>
      <div class="preserved-state"><strong>현재 결제 정보는 그대로 유지됩니다</strong><p>장바구니 ${itemCount()}개 · ${state.member ? formatPhone(state.member.phone) : "비회원"} · 포인트 ${points(state.pointsUsed)} · 결제 ${won(total())}</p></div>
    </div>
    <div class="modal-actions" style="--action-columns: 2"><button class="secondary-button" type="button" data-action="change-payment-method">결제수단 변경</button><button class="primary-button" type="button" data-action="retry-payment">다시 시도</button></div>`);
}

function openMethodChange() {
  openModal("change-method", `
    ${modalHeader("PAYMENT METHOD", "결제수단을 변경해 주세요", "수단을 선택하면 유지된 결제 정보로 바로 다시 진행합니다.")}
    <div class="modal-body">
      <div class="change-method-grid">
        <button class="change-method-card" type="button" data-change-method="card"><span class="method-icon card"><img src="assets/payment-card.png" alt="" /></span><strong>신용카드</strong></button>
        <button class="change-method-card" type="button" data-change-method="easy"><span class="method-icon easy"><img src="assets/payment-easy.png" alt="" /></span><strong>간편결제</strong></button>
        <button class="change-method-card" type="button" data-change-method="cash"><span class="method-icon cash"><img src="assets/payment-cash.png" alt="" /></span><strong>현금결제</strong></button>
      </div>
      <div class="preserved-state"><strong>유지되는 정보</strong><p>장바구니, 회원 확인, 적용 포인트, 최종 결제금액</p></div>
    </div>
    <div class="modal-actions"><button class="secondary-button" type="button" data-action="back-to-error">이전 오류 화면</button></div>`);
}

async function completePayment() {
  if (state.member && state.pointsUsed > 0) {
    state.member = { ...state.member, points: Math.max(0, state.member.points - state.pointsUsed) };
    await memberStore.put(state.member);
  }
  openModal("complete", `
    ${modalHeader("PAYMENT COMPLETE", "결제가 완료되었습니다", "이용해 주셔서 감사합니다.")}
    <div class="modal-body">
      <img class="status-icon" src="assets/payment-success.png" alt="결제 완료" />
      <p class="amount-focus">최종 결제금액 <strong>${won(total())}</strong></p>
      <p class="helper-note success">${methodLabels[state.paymentMethod]} 결제 승인 완료${state.pointsUsed ? ` · ${points(state.pointsUsed)} 사용` : ""}</p>
      <p class="countdown"><span id="countdownNumber">8</span>초 뒤 처음 화면으로 돌아갑니다.</p>
    </div>
    <div class="modal-actions" style="--action-columns: 2"><button class="secondary-button" type="button" data-action="finish-without-receipt">영수증 없이 완료</button><button class="primary-button" type="button" data-action="finish-with-receipt">영수증 출력</button></div>`);
  let seconds = 8;
  state.countdownTimer = window.setInterval(() => {
    seconds -= 1;
    if ($("#countdownNumber")) $("#countdownNumber").textContent = seconds;
    if (seconds <= 0) resetDemo(false);
  }, 1000);
}

function resetDemo(showMessage = true) {
  closeModal();
  state.cart.clear();
  state.member = null;
  state.pointsUsed = 0;
  state.phoneInput = "";
  state.pointInput = "";
  state.paymentMethod = "card";
  state.categoryIndex = 0;
  renderCart();
  renderCatalog();
  renderPaymentMethods();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (showMessage) showToast("장바구니와 결제 상태를 초기화했습니다.");
}

function openResetOptions() {
  openModal("reset", `
    ${modalHeader("DEMO RESET", "시연 상태를 초기화할까요?", "필요한 범위만 선택할 수 있습니다.")}
    <div class="modal-body">
      <div class="point-choice-list">
        <button class="point-choice" type="button" data-action="reset-session"><span>현재 시연만 초기화</span><strong>회원 유지</strong></button>
        <button class="point-choice" type="button" data-action="reset-database"><span>회원 DB까지 초기화</span><strong>테스트 회원 복원</strong></button>
      </div>
      <p class="helper-note">회원 DB 초기화 시 현장에서 가입한 테스트 회원은 삭제되고 010-1234-1234 / 4,259P만 다시 생성됩니다.</p>
    </div>
    <div class="modal-actions"><button class="secondary-button" type="button" data-action="close">취소</button></div>`);
}

function handleKeypad(kind, key) {
  if (kind === "phone") {
    if (key === "clear") state.phoneInput = "010";
    else if (key === "backspace") {
      if (state.phoneInput.length > 3) state.phoneInput = state.phoneInput.slice(0, -1);
    }
    else if (state.phoneInput.length < 11) state.phoneInput += key;
    renderPointLookup();
    return;
  }
  if (key === "clear") state.pointInput = "";
  else if (key === "backspace") state.pointInput = state.pointInput.slice(0, -1);
  else if (state.pointInput.length < 7) state.pointInput = `${state.pointInput}${key}`.replace(/^0+/, "");
  renderDirectPoints();
}

elements.productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product-id]");
  if (!button) return;
  const product = findProduct(button.dataset.productId);
  if (product) addProduct(product);
});

elements.categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category-index]");
  if (button) setCategory(Number(button.dataset.categoryIndex));
});

elements.cartList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-cart-action]");
  const row = event.target.closest("[data-cart-id]");
  if (!actionButton || !row) return;
  const id = row.dataset.cartId;
  if (actionButton.dataset.cartAction === "increase") changeQuantity(id, 1);
  else if (actionButton.dataset.cartAction === "decrease") changeQuantity(id, -1);
  else {
    state.cart.delete(id);
    renderCart();
  }
});

elements.paymentMethods.addEventListener("click", (event) => {
  const button = event.target.closest("[data-method]");
  if (!button) return;
  state.paymentMethod = button.dataset.method;
  renderPaymentMethods();
});

elements.modalContent.addEventListener("click", async (event) => {
  const historyRangeButton = event.target.closest("[data-history-range]");
  if (historyRangeButton) {
    openPointHistory(Number(historyRangeButton.dataset.historyRange));
    return;
  }
  const keypadButton = event.target.closest("[data-key]");
  if (keypadButton) {
    handleKeypad(keypadButton.closest("[data-keypad]").dataset.keypad, keypadButton.dataset.key);
    return;
  }
  const methodButton = event.target.closest("[data-change-method]");
  if (methodButton) {
    startPayment(methodButton.dataset.changeMethod);
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;

  if (action === "close" || action === "cancel-payment") closeModal();
  else if (action === "open-phone-entry") openPhoneEntry();
  else if (action === "back-to-point-decision") openPointLookup();
  else if (action === "lookup-member") await lookupMember();
  else if (action === "retry-phone") openPhoneEntry();
  else if (action === "complete-signup") await completeSignup();
  else if (action === "continue-after-signup") startPayment();
  else if (action === "guest-payment") {
    state.member = null;
    state.pointsUsed = 0;
    renderTotals();
    startPayment();
  } else if (action === "select-no-points") {
    state.pointsUsed = 0;
    renderTotals();
    openPointUse();
  } else if (action === "select-all-points") {
    state.pointsUsed = safeMaxPoints();
    renderTotals();
    openPointUse();
  } else if (action === "open-direct-points") openDirectPoints();
  else if (action === "clear-point-input") {
    state.pointInput = "";
    renderDirectPoints();
  }
  else if (action === "back-to-points") openPointUse();
  else if (action === "confirm-direct-points") confirmDirectPoints();
  else if (action === "apply-points") startPayment();
  else if (action === "change-payment-method") openMethodChange();
  else if (action === "retry-payment") startPayment(state.paymentMethod);
  else if (action === "back-to-error") openPaymentError();
  else if (action === "finish-with-receipt") {
    resetDemo(false);
    showToast("영수증 출력 요청을 전송했습니다.");
  } else if (action === "finish-without-receipt") resetDemo(false);
  else if (action === "reset-session") resetDemo();
  else if (action === "reset-database") {
    await memberStore.clear();
    resetDemo(false);
    showToast("회원 DB를 초기화하고 테스트 회원을 복원했습니다.");
  }
});

$("#previousCategory").addEventListener("click", () => setCategory(state.categoryIndex - 1));
$("#nextCategory").addEventListener("click", () => setCategory(state.categoryIndex + 1));
$("#addBagButton").addEventListener("click", () => addProduct(BAG_PRODUCT));
elements.historyButton.addEventListener("click", () => openPointHistory());
elements.pointLookupButton.addEventListener("click", () => {
  state.flowContext = "header";
  openPhoneEntry();
});

elements.barcodeScannerInput.addEventListener("input", () => {
  const value = elements.barcodeScannerInput.value.replace(/\D/g, "");
  elements.barcodeScannerInput.value = value;
  window.clearTimeout(state.barcodeTimer);
  if (value.length >= 8) {
    state.barcodeTimer = window.setTimeout(() => processBarcode(value), 140);
  }
});

elements.barcodeScannerInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  processBarcode(elements.barcodeScannerInput.value);
});

elements.barcodeScannerInput.addEventListener("blur", () => {
  window.setTimeout(focusBarcodeScanner, 20);
});

$("#clearCartButton").addEventListener("click", () => {
  if (state.cart.size === 0) return showToast("취소할 상품이 없습니다.");
  state.cart.clear();
  state.pointsUsed = 0;
  renderCart();
  showToast("장바구니 상품을 모두 취소했습니다.");
});

$("#checkoutButton").addEventListener("click", () => {
  if (state.cart.size === 0) return showToast("먼저 상품을 담아 주세요.");
  state.flowContext = "payment";
  openPointLookup();
});

elements.productGrid.addEventListener("pointerdown", (event) => {
  state.touchStartX = event.clientX;
});

elements.productGrid.addEventListener("pointerup", (event) => {
  if (state.touchStartX === null) return;
  const distance = event.clientX - state.touchStartX;
  state.touchStartX = null;
  if (Math.abs(distance) > 60) setCategory(state.categoryIndex + (distance < 0 ? 1 : -1));
});

window.addEventListener("keydown", (event) => {
  if (elements.modalLayer.hidden) return;
  if (event.key === "Escape" && state.modalMode !== "processing") return closeModal();
  const isPhone = state.modalMode === "phone";
  const isPoint = state.modalMode === "direct-points";
  if (!isPhone && !isPoint) return;
  if (/^\d$/.test(event.key)) handleKeypad(isPhone ? "phone" : "point", event.key);
  else if (event.key === "Backspace") handleKeypad(isPhone ? "phone" : "point", "backspace");
  else if (event.key === "Enter") isPhone ? lookupMember() : confirmDirectPoints();
});

window.addEventListener("resize", updateScale);
document.addEventListener("pointerup", () => window.setTimeout(focusBarcodeScanner, 0));

async function initialize() {
  updateScale();
  renderCatalog();
  renderCart();
  renderPaymentMethods();
  await memberStore.open();
  focusBarcodeScanner();
}

initialize();
