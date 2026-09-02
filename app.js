const products = [
  { id: "beef", name: "한우 국거리 500g", unit: 18900, price: 14000, qty: 1, discount: 4900 },
  { id: "coffee", name: "콜드브루 250ml", unit: 2400, price: 1500, qty: 4, discount: 900 },
  { id: "milk", name: "서울우유 나100% 저지방 칼슘강화 신선우유 기획상품 1L", unit: 3100, price: 1633, qty: 3, discount: 1467 },
];

const catalog = [
  { id: "ramen1", name: "신라면 블랙 멀티 (4봉)", unit: 5780, price: 5780 },
  { id: "ramen2", name: "쇠고기 미역국 라면 (4봉)", unit: 5480, price: 5480 },
  { id: "ramen3", name: "일품 해물라면 (4봉)", unit: 4100, price: 4100 },
  { id: "ramen4", name: "오뚜기 해물 짬뽕 (4봉)", unit: 3400, price: 3400 },
  { id: "ramen5", name: "육개장 사발면", unit: 1000, price: 800, promo: true },
  { id: "ramen6", name: "튀김우동 큰사발", unit: 1500, price: 1000, promo: true },
];

const initialCart = products.map(item => ({ ...item }));
let cart = initialCart.map(item => ({ ...item }));
let selectedMethod = "card";
let phone = "";
let pointInput = "";
let memberPoints = 1243;
let usedPoints = 0;
let pendingSignupPhone = "";

const $ = selector => document.querySelector(selector);
const money = value => `${Math.max(0, Math.round(value)).toLocaleString("ko-KR")}원`;
const point = value => `${Math.max(0, Math.round(value)).toLocaleString("ko-KR")}P`;
const total = () => cart.reduce((sum, item) => sum + item.price * item.qty, 0);
const originalTotal = () => cart.reduce((sum, item) => sum + item.unit * item.qty, 0);

function resizeKiosk() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 1920);
  $("#kiosk").style.transform = `scale(${scale})`;
}

function renderCatalog() {
  $("#productGrid").innerHTML = catalog.map(item => `
    <button class="product-card" data-product="${item.id}" type="button">
      <strong>${item.name}</strong>
      <span class="price">${money(item.price)}</span>
      ${item.promo ? '<span class="promo">행사</span>' : '<span></span>'}
    </button>`).join("");
}

function renderCart() {
  const rows = $("#cartRows");
  rows.innerHTML = cart.map(item => `
    <div class="cart-row" data-id="${item.id}">
      <div class="product-info"><strong>${item.name}</strong>${item.unit > item.price ? `<small>행사할인 −${money((item.unit-item.price)*item.qty)}</small>` : ""}</div>
      <span class="unit">${money(item.unit)}</span>
      <div class="qty-control"><button data-action="minus" aria-label="${item.name} 수량 감소">−</button><strong>${item.qty}</strong><button data-action="plus" aria-label="${item.name} 수량 증가">+</button></div>
      <div class="row-amount">${item.unit > item.price ? `<del>${money(item.unit*item.qty)}</del>` : ""}<strong>${money(item.price*item.qty)}</strong></div>
      <button class="remove" data-action="remove" aria-label="${item.name} 삭제">×</button>
    </div>`).join("");
  $("#emptyCart").hidden = cart.length > 0;
  const qty = cart.reduce((sum,item) => sum + item.qty,0);
  const discount = originalTotal() - total();
  $("#totalQty").textContent = `${qty}개`;
  $("#totalDiscount").textContent = discount ? `−${money(discount)}` : "0원";
  $("#cartTotal").textContent = money(total());
  $("#paymentTotal").textContent = money(total());
}

function setMethod(method) {
  selectedMethod = method;
  document.querySelectorAll(".method").forEach(button => {
    const selected = button.dataset.method === method;
    button.classList.toggle("selected", selected);
    const old = button.querySelector("em:not(.available)");
    if (old) old.remove();
    if (selected) button.insertAdjacentHTML("beforeend", '<em>✓ 선택됨</em>');
  });
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.hidden = true, 2200);
}

function openModal(content) {
  $("#modal").innerHTML = content;
  $("#overlay").hidden = false;
}
function closeModal() { $("#overlay").hidden = true; $("#modal").innerHTML = ""; }
const backHeader = title => `<div class="modal-header"><button class="back" data-modal="close" type="button">← 뒤로</button><h2 id="modalTitle">${title}</h2></div>`;

function showPointEntry() {
  openModal(`${backHeader("포인트를 확인하시겠습니까?")}
    <p class="lead">휴대폰 번호로 회원을 확인하면 보유 포인트를 조회하고 사용할 수 있습니다.</p>
    <div class="notice">상품 특매·이벤트 할인은 로그인과 관계없이 장바구니 금액에 이미 반영되어 있습니다.</div>
    <div class="choice-grid">
      <button class="choice primary" data-flow="member-login">휴대폰 번호로 확인</button>
      <button class="choice soft" data-flow="signup-start">신규 회원가입</button>
      <button class="choice" data-flow="guest-pay">포인트 없이 결제</button>
    </div>`);
}

function formatPhone(raw) {
  if (!raw) return "010 ···· ····";
  return raw.replace(/(\d{3})(\d{0,4})(\d{0,4})/, (_,a,b,c) => [a,b,c].filter(Boolean).join(" "));
}

function phoneModal(mode, preset = "") {
  phone = preset;
  const signup = mode === "signup";
  openModal(`${backHeader(signup ? "회원가입할 휴대폰 번호를 입력해주세요" : "휴대폰 번호를 입력해주세요")}
    <p class="lead">${signup ? "포인트 적립을 위한 간편 회원가입입니다." : "회원 확인 후 보유 포인트를 조회하고 사용할 수 있습니다."}</p>
    <div class="notice">시연용 기존 회원: <b>010 1234 5678</b> · 0P 회원: <b>010 0000 0000</b></div>
    <div id="phoneDisplay" class="phone-display">${formatPhone(phone)}</div>
    <div class="keypad">${[1,2,3,4,5,6,7,8,9,"전체삭제",0,"←"].map(k => `<button class="key ${typeof k === "string" ? "action" : ""}" data-phone-key="${k}">${k}</button>`).join("")}</div>
    <div class="modal-actions single"><button class="choice primary" data-flow="${signup ? "signup-confirm" : "check-phone"}">${signup ? "다음" : "확인"}</button></div>`);
}

function notFound() {
  openModal(`${backHeader("회원 확인 결과")}
    <p class="lead"><strong style="font-size:30px;color:#222">등록된 회원을 찾지 못했습니다</strong><br>입력 번호&nbsp; ${formatPhone(phone)}</p>
    <div class="notice">번호가 맞는지 확인하거나 아래에서 바로 회원가입을 진행해주세요. 회원가입 시 이번 결제부터 포인트가 적립됩니다.</div>
    <div class="choice-grid">
      <button class="choice" data-flow="retry-phone">휴대폰 번호 다시 입력</button>
      <button class="choice primary" data-flow="signup-current">이 번호로 회원가입</button>
      <button class="choice" data-flow="guest-pay">포인트 없이 결제</button>
    </div>`);
}

function signupConfirmation() {
  pendingSignupPhone = phone;
  openModal(`${backHeader("회원가입 번호 재확인")}
    <p class="lead">입력한 번호가 맞습니까?</p>
    <div class="phone-display">${formatPhone(pendingSignupPhone)}</div>
    <div class="notice">잘못된 번호로 가입하면 포인트를 찾기 어렵습니다. 번호를 다시 확인해주세요.</div>
    <div class="modal-actions"><button class="choice" data-flow="edit-signup">번호 다시 입력</button><button class="choice primary" data-flow="complete-signup">번호 확인</button></div>
    <button class="choice" style="width:100%;margin-top:14px" data-flow="cancel-signup">회원가입 취소</button>`);
}

function signupComplete() {
  openModal(`<div class="complete-mark">✓</div><h2 id="modalTitle" style="text-align:center">회원가입이 완료되었습니다</h2>
    <p class="lead" style="text-align:center">회원 번호&nbsp; ${formatPhone(pendingSignupPhone)}</p>
    <div class="notice"><strong>포인트 적립 시작</strong><br>이번 결제부터 포인트가 자동 적립됩니다. 신규 회원은 사용할 포인트가 없으므로 바로 결제를 계속합니다.</div>
    <div class="modal-actions single"><button class="choice primary" data-flow="guest-pay">결제 계속</button></div>`);
}

function showPoints(points) {
  memberPoints = points;
  usedPoints = 0;
  openModal(`${backHeader("보유 포인트를 사용하시겠습니까?")}
    <div class="balance"><span>보유 포인트 · 10P 단위 사용</span><strong>${point(points)}</strong></div>
    <div class="choice-grid" style="grid-template-columns:repeat(3,1fr)">
      <button class="choice" data-points="none">사용 안 함</button>
      <button class="choice" data-points="custom" ${points < 10 ? "disabled" : ""}>직접 입력</button>
      <button class="choice soft" data-points="all" ${points < 10 ? "disabled" : ""}>사용 가능 전액</button>
    </div>
    <div class="point-summary"><div><small>결제금액</small><strong>${money(total())}</strong></div><div><small>포인트 사용</small><strong id="pointsUsed">0P</strong></div><div class="final"><small>최종 결제금액</small><strong id="afterPoints">${money(total())}</strong></div></div>
    ${points === 0 ? '<div class="notice" style="margin-top:20px">현재 보유 포인트는 0P입니다. 이번 결제 포인트는 결제 완료 후 적립됩니다.</div>' : ""}
    <div class="modal-actions single"><button class="choice primary" data-flow="apply-points">적용하고 결제 계속</button></div>`);
}

function selectPoints(value) {
  usedPoints = value === "all" ? Math.min(Math.floor(memberPoints / 10) * 10, Math.floor(total() / 10) * 10) : 0;
  document.querySelectorAll("[data-points]").forEach(b => b.classList.toggle("soft", b.dataset.points === value));
  $("#pointsUsed").textContent = usedPoints ? `−${point(usedPoints)}` : "0P";
  $("#afterPoints").textContent = money(total() - usedPoints);
}

function pointInputModal() {
  pointInput = "";
  openModal(`${backHeader("사용할 포인트를 입력해주세요")}
    <div class="balance"><span>보유 포인트 · 10P 단위 사용</span><strong>${point(memberPoints)}</strong></div>
    <div id="pointDisplay" class="point-display">0P</div><p id="pointError" class="lead" style="color:#d52a1e;min-height:32px"></p>
    <div class="keypad">${[1,2,3,4,5,6,7,8,9,"00",0,"⌫"].map(k => `<button class="key ${typeof k === "string" ? "action" : ""}" data-point-key="${k}">${k}</button>`).join("")}</div>
    <div class="modal-actions"><button class="choice" data-flow="clear-points">초기화</button><button class="choice primary" data-flow="confirm-custom-points">포인트 적용</button></div>`);
}

function processing() {
  const data = {
    card: ["신용카드 결제", "카드를 리더기에 꽂아주세요", "▰", "카드를 기다리고 있습니다"],
    easy: ["간편결제 · 바코드", "결제 바코드를 스캔해주세요", "▦", "바코드를 기다리고 있습니다"],
    cash: ["현금결제", "현금투입구에 돈을 넣어주세요", "▣", "현재 투입금액 0원"],
  }[selectedMethod];
  openModal(`<div class="processing"><div class="processing-icon">${data[2]}</div><h2 id="modalTitle">${data[0]}</h2><p class="lead">${data[1]}</p>
    <div class="balance"><span>결제금액</span><strong>${money(total()-usedPoints)}</strong></div><p class="lead" style="margin-top:22px">${data[3]}</p></div>
    <button class="choice" style="width:100%" data-flow="cancel-payment">${selectedMethod === "cash" ? "결제 취소 · 투입금 반환" : "결제 취소"}</button>
    <div class="demo-control"><small>시연 제어 — 실제 기기에서는 VAN 또는 현금 장치 결과에 따라 자동 이동합니다.</small><div class="modal-actions"><button class="choice" data-flow="payment-error">승인 오류 시연</button><button class="choice primary" data-flow="payment-success">승인 성공 시연</button></div></div>`);
}

function paymentError() {
  openModal(`<h2 id="modalTitle">결제를 완료하지 못했습니다</h2><p class="lead">결제사 통신 오류가 발생했습니다.</p>
    <div class="error-box">승인 결과 조회 완료 · 미승인 확인<br>VAN 통신 오류 | 오류코드 예시: VAN-001</div>
    <div class="notice" style="margin-top:20px">장바구니와 할인 정보, 회원 확인·포인트 적용 상태는 그대로 유지됩니다.</div>
    <div class="modal-actions"><button class="choice" data-flow="change-method">결제수단 변경</button><button class="choice primary" data-flow="retry-payment">다시 시도</button></div>`);
}

function paymentComplete() {
  let seconds = 8;
  openModal(`<div class="complete-mark">✓</div><h2 id="modalTitle" style="text-align:center">결제가 완료되었습니다</h2><p class="lead" style="text-align:center">카드와 구매하신 상품을 확인해주세요</p>
    <div class="point-summary"><div class="final"><small>최종 결제금액</small><strong>${money(total()-usedPoints)}</strong></div>${usedPoints ? `<div><small>포인트 사용</small><strong>${point(usedPoints)}</strong></div>` : ""}</div>
    <div class="receipt-actions"><button class="choice" data-flow="finish">영수증 없이 완료</button><button class="choice primary" data-flow="print">영수증 출력</button></div>
    <p id="countdown" class="lead" style="text-align:center;margin-top:24px">${seconds}초 후 처음 화면으로 돌아갑니다</p>`);
  clearInterval(paymentComplete.timer);
  paymentComplete.timer = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) { clearInterval(paymentComplete.timer); resetDemo(); }
    else if ($("#countdown")) $("#countdown").textContent = `${seconds}초 후 처음 화면으로 돌아갑니다`;
  },1000);
}

function resetDemo() {
  clearInterval(paymentComplete.timer);
  cart = initialCart.map(item => ({ ...item })); selectedMethod = "card"; usedPoints = 0; phone = ""; pointInput = "";
  closeModal(); setMethod("card"); renderCart(); showToast("시연 화면을 처음 상태로 되돌렸습니다");
}

document.addEventListener("click", event => {
  const productButton = event.target.closest("[data-product]");
  if (productButton) {
    const item = catalog.find(p => p.id === productButton.dataset.product);
    const existing = cart.find(p => p.id === item.id);
    existing ? existing.qty++ : cart.push({ ...item, qty: 1, discount: item.unit-item.price });
    renderCart(); showToast(`${item.name}을(를) 담았습니다`); return;
  }
  const rowButton = event.target.closest(".cart-row button");
  if (rowButton) {
    const id = rowButton.closest(".cart-row").dataset.id; const item = cart.find(p => p.id === id);
    if (rowButton.dataset.action === "plus") item.qty++;
    if (rowButton.dataset.action === "minus") item.qty = Math.max(1,item.qty-1);
    if (rowButton.dataset.action === "remove") cart = cart.filter(p => p.id !== id);
    renderCart(); return;
  }
  const method = event.target.closest("[data-method]"); if (method) { setMethod(method.dataset.method); return; }
  const phoneKey = event.target.closest("[data-phone-key]");
  if (phoneKey) { const key=phoneKey.dataset.phoneKey; if(key==="전체삭제") phone=""; else if(key==="←") phone=phone.slice(0,-1); else if(phone.length<11) phone+=key; $("#phoneDisplay").textContent=formatPhone(phone); return; }
  const pointKey = event.target.closest("[data-point-key]");
  if (pointKey) { const key=pointKey.dataset.pointKey; if(key==="⌫") pointInput=pointInput.slice(0,-1); else if(pointInput.length<7) pointInput+=key; $("#pointDisplay").textContent=point(Number(pointInput||0)); $("#pointError").textContent=""; return; }
  const pointChoice = event.target.closest("[data-points]"); if(pointChoice) { if(pointChoice.dataset.points==="custom") pointInputModal(); else selectPoints(pointChoice.dataset.points); return; }
  const flow = event.target.closest("[data-flow]")?.dataset.flow;
  if (!flow) return;
  const flows = {
    "member-login":()=>phoneModal("login"), "signup-start":()=>phoneModal("signup"), "guest-pay":processing,
    "check-phone":()=>{ if(phone.length!==11) return showToast("휴대폰 번호 11자리를 입력해주세요"); if(phone==="01012345678") showPoints(1243); else if(phone==="01000000000") showPoints(0); else notFound(); },
    "retry-phone":()=>phoneModal("login"), "signup-current":()=>{ pendingSignupPhone=phone; signupConfirmation(); },
    "signup-confirm":()=>{ if(phone.length!==11) return showToast("휴대폰 번호 11자리를 입력해주세요"); signupConfirmation(); },
    "edit-signup":()=>phoneModal("signup",pendingSignupPhone), "complete-signup":signupComplete, "cancel-signup":showPointEntry,
    "apply-points":processing, "clear-points":()=>{pointInput="";$("#pointDisplay").textContent="0P";$("#pointError").textContent="";},
    "confirm-custom-points":()=>{const value=Number(pointInput||0);if(value%10!==0)return $("#pointError").textContent="10P 단위로 입력해주세요. 1의 자리 숫자를 0으로 바꿔주세요.";if(value>memberPoints)return $("#pointError").textContent="보유 포인트보다 많이 입력할 수 없습니다.";usedPoints=Math.min(value,total());processing();},
    "cancel-payment":closeModal, "payment-error":paymentError, "payment-success":paymentComplete,
    "change-method":closeModal, "retry-payment":processing, "finish":resetDemo, "print":()=>{showToast("영수증을 출력했습니다");setTimeout(resetDemo,900);}
  };
  flows[flow]?.();
});

$("#cartRows").addEventListener("click", () => {});
$("#startPayment").addEventListener("click", () => cart.length ? showPointEntry() : showToast("상품을 먼저 담아주세요"));
$("#addBag").addEventListener("click", () => { const bag=cart.find(p=>p.id==="bag"); bag?bag.qty++:cart.push({id:"bag",name:"일반 봉투",unit:100,price:100,qty:1,discount:0});renderCart();showToast("일반 봉투 1개가 장바구니에 추가되었습니다"); });
$("#clearCart").addEventListener("click", () => { cart=[];renderCart();showToast("장바구니를 비웠습니다"); });
$("#resetDemo").addEventListener("click", resetDemo);
$("#overlay").addEventListener("click", event => { if(event.target.matches('[data-modal="close"]')) closeModal(); });
window.addEventListener("resize", resizeKiosk);
renderCatalog(); renderCart(); resizeKiosk();
