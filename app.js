"use strict";

const TEST_MEMBER = { phone: "01012341234", points: 2000, createdAt: "demo-seed" };
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
    if (!(await this.get(TEST_MEMBER.phone))) {
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

function safeMaxPoints() {
  if (!state.member) return 0;
  return Math.floor(Math.min(state.member.points, subtotal()) / 50) * 50;
}

function updateScale() {
  const scale = Math.min(1, window.innerWidth / 1080);
  elements.kiosk.style.setProperty("--kiosk-scale", scale);
  elements.stageShell.style.width = `${1080 * scale}px`;
  elements.stageShell.style.height = `${1920 * scale}px`;
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
  if (state.member) {
    elements.memberPhoneText.textContent = formatPhone(state.member.phone);
    elements.memberPointText.textContent = `보유 포인트 ${points(state.member.points)}`;
  }
}

function renderCart() {
  elements.cartList.innerHTML = state.cart.size
    ? [...state.cart.values()].map(({ product, quantity }) => `
        <article class="cart-row" data-cart-id="${product.id}">
          <div class="cart-product"><div class="cart-product-name">${product.name}</div></div>
          <div class="cart-unit-price">${won(product.price)}</div>
          <div class="quantity-control" aria-label="${product.name} 수량">
            <button type="button" data-cart-action="decrease" aria-label="수량 감소">−</button>
            <span>${quantity}</span>
            <button type="button" data-cart-action="increase" aria-label="수량 증가">＋</button>
          </div>
          <div>
            <div class="cart-line-total">${won(product.price * quantity)}</div>
            <button class="remove-item" type="button" data-cart-action="remove">삭제</button>
          </div>
        </article>`).join("")
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
  state.paymentTimer = null;
  state.countdownTimer = null;
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
}

function modalHeader(kicker, title, description = "") {
  return `<header class="modal-header"><p class="modal-kicker">${kicker}</p><h2 id="modalTitle">${title}</h2>${description ? `<p class="modal-description">${description}</p>` : ""}</header>`;
}

function keypadMarkup(kind) {
  return `<div class="keypad" data-keypad="${kind}">
    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => `<button type="button" data-key="${number}">${number}</button>`).join("")}
    <button type="button" data-key="clear">전체삭제</button><button type="button" data-key="0">0</button><button type="button" data-key="backspace" aria-label="한 글자 지우기">⌫</button>
  </div>`;
}

function openPointLookup() {
  state.phoneInput = "";
  renderPointLookup();
}

function renderPointLookup() {
  const formatted = formatPhone(state.phoneInput);
  openModal("phone", `
    ${modalHeader("POINT LOOKUP", "휴대폰 번호로 포인트 확인", "가입한 휴대폰 번호를 입력하면 보유 포인트를 확인할 수 있습니다.")}
    <div class="modal-body">
      <div class="phone-display ${formatted ? "" : "is-placeholder"}" id="phoneDisplay">${formatted || "010-0000-0000"}</div>
      ${keypadMarkup("phone")}
      <button class="secondary-button" style="width: 100%; margin-top: 14px" type="button" data-action="fill-test-phone">테스트 번호 010-1234-1234 입력</button>
      <p class="helper-note">신규 가입 회원에게는 시연용 포인트 5,000P가 즉시 지급됩니다.</p>
      <p class="error-message" id="phoneError"></p>
    </div>
    <div class="modal-actions three-actions">
      <button class="secondary-button" type="button" data-action="close">돌아가기</button>
      <button class="primary-button" type="button" data-action="lookup-member">번호로 확인</button>
      <button class="secondary-button" type="button" data-action="guest-payment">포인트 없이 결제</button>
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
  openPointUse();
}

function openMemberNotFound() {
  openModal("not-found", `
    ${modalHeader("MEMBER NOT FOUND", "가입된 회원을 찾지 못했습니다", `${formatPhone(state.phoneInput)} 번호로 신규 가입하거나 번호를 다시 확인해 주세요.`)}
    <div class="modal-body"><p class="helper-note warning">신규 가입을 완료하면 테스트용 5,000P가 즉시 지급됩니다.</p></div>
    <div class="modal-actions three-actions">
      <button class="secondary-button" type="button" data-action="retry-phone">번호 재입력</button>
      <button class="primary-button" type="button" data-action="open-signup">신규 회원가입</button>
      <button class="secondary-button" type="button" data-action="guest-payment">포인트 없이 결제</button>
    </div>`);
}

function openSignup() {
  openModal("signup", `
    ${modalHeader("NEW MEMBER", "휴대폰 회원가입", `${formatPhone(state.phoneInput)} 번호로 회원 정보를 저장합니다.`)}
    <div class="modal-body">
      <div class="point-summary">
        <div><span>가입 휴대폰</span><strong>${formatPhone(state.phoneInput)}</strong></div>
        <div><span>즉시 지급</span><strong class="accent-value">5,000P</strong></div>
      </div>
      <div class="consent-card">
        <label><input id="requiredConsent" type="checkbox" /><span>[필수] 회원 서비스 이용 및 개인정보 처리에 동의합니다.</span></label>
        <p>이 데모에서는 입력한 번호와 포인트만 현재 브라우저에 저장합니다.</p>
      </div>
      <p class="error-message" id="signupError"></p>
    </div>
    <div class="modal-actions" style="--action-columns: 2">
      <button class="secondary-button" type="button" data-action="retry-phone">번호 재입력</button>
      <button class="primary-button" type="button" data-action="complete-signup">회원가입 완료</button>
    </div>`);
}

async function completeSignup() {
  if (!$("#requiredConsent")?.checked) {
    $("#signupError").textContent = "필수 동의를 확인해 주세요.";
    return;
  }
  const member = { phone: state.phoneInput, points: 5000, createdAt: new Date().toISOString() };
  await memberStore.put(member);
  state.member = member;
  state.pointsUsed = 0;
  renderTotals();
  showToast("회원가입 완료 · 5,000P가 지급되었습니다.");
  openPointUse(true);
}

function openPointUse(isNewMember = false) {
  const maximum = safeMaxPoints();
  openModal("point-use", `
    ${modalHeader("PHONE MEMBER", "포인트를 사용하시겠어요?", "보유 포인트가 0P인 회원도 이 화면에서 잔액을 확인합니다.")}
    <div class="modal-body">
      ${isNewMember ? '<p class="helper-note success" style="margin: 0 0 18px">회원가입 완료 · 5,000P 지급</p>' : ""}
      <div class="point-summary">
        <div><span>보유 포인트</span><strong class="accent-value">${points(state.member.points)}</strong></div>
        <div><span>50P 단위 사용 가능</span><strong>${points(maximum)}</strong></div>
      </div>
      <div class="point-choice-list">
        <button class="point-choice ${state.pointsUsed === 0 ? "is-selected" : ""}" type="button" data-action="select-no-points"><span>사용 안 함</span><strong>0P</strong></button>
        <button class="point-choice" type="button" data-action="open-direct-points" ${maximum === 0 ? "disabled" : ""}><span>직접 입력</span><strong>50P 단위</strong></button>
        <button class="point-choice ${state.pointsUsed === maximum && maximum > 0 ? "is-selected" : ""}" type="button" data-action="select-all-points" ${maximum === 0 ? "disabled" : ""}><span>사용 가능 전액</span><strong>${points(maximum)}</strong></button>
      </div>
      <p class="helper-note">포인트 적용 후 결제수단은 언제든 변경할 수 있습니다.</p>
    </div>
    <div class="modal-actions" style="--action-columns: 2">
      <button class="secondary-button" type="button" data-action="retry-phone">회원 다시 확인</button>
      <button class="primary-button" type="button" data-action="apply-points">적용하고 결제 계속</button>
    </div>`);
}

function openDirectPoints() {
  state.pointInput = state.pointsUsed ? String(state.pointsUsed) : "";
  renderDirectPoints();
}

function renderDirectPoints(errorMessage = "") {
  const display = state.pointInput ? points(Number(state.pointInput)) : "0P";
  openModal("direct-points", `
    ${modalHeader("POINT INPUT", "사용할 포인트를 입력해 주세요", `50P 단위로 최대 ${points(safeMaxPoints())}까지 사용할 수 있습니다.`)}
    <div class="modal-body">
      <div class="point-display ${state.pointInput ? "" : "is-placeholder"}" id="pointDisplay">${display}</div>
      ${keypadMarkup("point")}
      <p class="error-message" id="pointError">${errorMessage}</p>
    </div>
    <div class="modal-actions" style="--action-columns: 2">
      <button class="secondary-button" type="button" data-action="back-to-points">취소</button>
      <button class="primary-button" type="button" data-action="confirm-direct-points">포인트 적용</button>
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
      <p class="helper-note">회원 DB 초기화 시 현장에서 가입한 테스트 회원은 삭제되고 010-1234-1234 / 2,000P만 다시 생성됩니다.</p>
    </div>
    <div class="modal-actions"><button class="secondary-button" type="button" data-action="close">취소</button></div>`);
}

function handleKeypad(kind, key) {
  if (kind === "phone") {
    if (key === "clear") state.phoneInput = "";
    else if (key === "backspace") state.phoneInput = state.phoneInput.slice(0, -1);
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
  else if (action === "fill-test-phone") {
    state.phoneInput = TEST_MEMBER.phone;
    renderPointLookup();
  } else if (action === "lookup-member") await lookupMember();
  else if (action === "retry-phone") openPointLookup();
  else if (action === "open-signup") openSignup();
  else if (action === "complete-signup") await completeSignup();
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
$("#resetButton").addEventListener("click", openResetOptions);

$("#clearCartButton").addEventListener("click", () => {
  if (state.cart.size === 0) return showToast("취소할 상품이 없습니다.");
  state.cart.clear();
  state.pointsUsed = 0;
  renderCart();
  showToast("장바구니 상품을 모두 취소했습니다.");
});

$("#checkoutButton").addEventListener("click", () => {
  if (state.cart.size === 0) return showToast("먼저 상품을 담아 주세요.");
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

async function initialize() {
  updateScale();
  renderCatalog();
  renderCart();
  renderPaymentMethods();
  await memberStore.open();
}

initialize();
