/* ==========================================================================
   Figma 04_전체 화면 및 플로우 · 모달 정밀 구현

   app.js의 데이터/상태/공통 함수를 그대로 사용하고, 화면 정의만 Figma 기준으로
   덮어쓴다. 모달 높이는 고정하지 않으며 콘텐츠가 높이를 결정한다.
   ========================================================================== */

/* 02-A의 기획 데이터와 시연 데이터를 일치시킨다. */
BAGS.splice(
  0,
  BAGS.length,
  { id: "b01", name: "일반 봉투 소형", price: 100, size: "소형" },
  { id: "b02", name: "종량제 봉투 10L", price: 500, size: "10L" },
  { id: "b03", name: "종량제 봉투 20L", price: 800, size: "20L" },
  { id: "b04", name: "종량제 봉투 50L", price: 1000, size: "50L" },
);

const POINT_HISTORY = [
  { date: "2026-09-03 17:21:11", type: "적립", earn: "159P", use: "-" },
  { date: "2026-08-30 12:15:20", type: "사용", earn: "-", use: "100P" },
];

function setModal(modal, variants) {
  modal.className = "modal";
  String(variants || "")
    .split(" ")
    .filter(Boolean)
    .forEach(function (name) {
      modal.classList.add(name);
    });
}

function modalIntro(modal, title, desc, eyebrow) {
  if (eyebrow) {
    modal.appendChild(el("p", "modal__eyebrow", eyebrow));
  }
  modal.appendChild(el("h2", "modal__title", title));
  if (desc) {
    modal.appendChild(el("p", "modal__desc", desc));
  }
}

function calloutCard(tone, title, desc) {
  const card = el("div", "callout callout--" + tone);
  card.appendChild(el("strong", "callout__title", title));
  if (desc) {
    card.appendChild(el("p", "callout__text", desc));
  }
  return card;
}

function statusPill(text, tone) {
  return el("p", "status-pill status-pill--" + (tone || "success"), text);
}

function infoRows(rows, className) {
  const box = el("div", "modal__rows " + (className || ""));
  rows.forEach(function (item) {
    box.appendChild(rowItem(item.label, item.value, item.className || ""));
  });
  return box;
}

function qrSvg() {
  return (
    '<svg class="qr-art" viewBox="0 0 88 104" width="88" height="104" aria-hidden="true">' +
    '<rect x="1" y="1" width="86" height="102" rx="10" fill="#fff" stroke="#dbe0eb"/>' +
    '<g fill="#248c5c">' +
    '<rect x="9" y="11" width="24" height="28" rx="2"/>' +
    '<rect x="56" y="11" width="23" height="28" rx="2"/>' +
    '<rect x="9" y="67" width="24" height="27" rx="2"/>' +
    '<rect x="39" y="47" width="10" height="12" rx="2"/>' +
    '<rect x="55" y="50" width="8" height="9" rx="2"/>' +
    '<rect x="37" y="69" width="9" height="10" rx="2"/>' +
    '<rect x="53" y="71" width="19" height="9" rx="2"/>' +
    '<rect x="65" y="85" width="10" height="9" rx="2"/>' +
    "</g></svg>"
  );
}

function scannerSvg() {
  return (
    '<svg class="scanner-art" viewBox="0 0 354 280" aria-hidden="true">' +
    '<rect x="101" y="25" width="152" height="230" rx="22" fill="#1f1f24"/>' +
    '<rect x="114" y="47" width="125" height="192" rx="10" fill="#fff"/>' +
    '<g fill="#1f1f24">' +
    '<rect x="133" y="89" width="5" height="71"/><rect x="143" y="89" width="3" height="71"/>' +
    '<rect x="152" y="89" width="7" height="71"/><rect x="165" y="89" width="4" height="71"/>' +
    '<rect x="175" y="89" width="8" height="71"/><rect x="189" y="89" width="3" height="71"/>' +
    '<rect x="198" y="89" width="7" height="71"/><rect x="211" y="89" width="4" height="71"/>' +
    '<rect x="221" y="89" width="6" height="71"/>' +
    "</g>" +
    '<text x="177" y="190" text-anchor="middle" font-family="Noto Sans KR" font-size="13" fill="#6b707d">APP</text>' +
    "</svg>"
  );
}

function paymentSvg(type) {
  if (type === "easy") {
    return (
      '<svg class="payment-art" viewBox="0 0 360 176" aria-hidden="true">' +
      '<rect x="104" y="12" width="152" height="152" rx="30" fill="#fff0ee"/>' +
      '<rect x="133" y="41" width="94" height="94" rx="18" fill="#f22417"/>' +
      '<g fill="#fff"><rect x="151" y="59" width="20" height="20" rx="4"/>' +
      '<rect x="189" y="59" width="20" height="20" rx="4"/>' +
      '<rect x="151" y="97" width="20" height="20" rx="4"/>' +
      '<rect x="190" y="98" width="19" height="19" rx="3"/></g></svg>'
    );
  }
  if (type === "cash") {
    return (
      '<svg class="payment-art" viewBox="0 0 360 176" aria-hidden="true">' +
      '<rect x="74" y="45" width="212" height="95" rx="18" fill="#e8f8f0"/>' +
      '<rect x="95" y="61" width="170" height="64" rx="12" fill="#35b778"/>' +
      '<circle cx="180" cy="93" r="22" fill="#fff"/>' +
      '<text x="180" y="101" text-anchor="middle" font-family="Noto Sans KR" font-size="24" font-weight="700" fill="#248c5c">₩</text>' +
      "</svg>"
    );
  }
  return (
    '<svg class="payment-art" viewBox="0 0 360 176" aria-hidden="true">' +
    '<rect x="94" y="22" width="172" height="132" rx="20" fill="#eef3ff"/>' +
    '<rect x="123" y="45" width="114" height="82" rx="12" fill="#3f6fd8"/>' +
    '<rect x="123" y="66" width="114" height="17" fill="#2b4ea6"/>' +
    '<rect x="139" y="99" width="35" height="9" rx="4.5" fill="#fff"/>' +
    "</svg>"
  );
}

function phoneDisplayExact(digits) {
  const box = el("div", "phone-display");
  box.appendChild(el("span", "phone-display__prefix", "010"));
  box.appendChild(el("span", "phone-display__dash", "-"));

  function group(start) {
    const wrap = el("span", "phone-slots");
    for (let i = start; i < start + 4; i += 1) {
      const slot = el(
        "span",
        "phone-slot" + (digits[i] ? " is-filled" : ""),
        digits[i] || "",
      );
      wrap.appendChild(slot);
    }
    return wrap;
  }

  box.appendChild(group(0));
  box.appendChild(el("span", "phone-display__dash", "-"));
  box.appendChild(group(4));
  return box;
}

function pinDisplay(digits) {
  const box = el("div", "pin-display");
  for (let i = 0; i < 4; i += 1) {
    box.appendChild(
      el("span", "pin-slot" + (digits[i] ? " is-filled" : ""), digits[i] || ""),
    );
  }
  return box;
}

function keypadExact(onKey, wide) {
  const pad = el("div", "keypad" + (wide ? " keypad--wide" : ""));
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "전체삭제", "0", "←"].forEach(
    function (key) {
      const button = el(
        "button",
        "key" + (key === "전체삭제" || key === "←" ? " key--fn" : ""),
        key,
      );
      button.type = "button";
      button.addEventListener("click", function () {
        onKey(key);
      });
      pad.appendChild(button);
    },
  );
  return pad;
}

function pointKeypad(onKey) {
  const pad = el("div", "keypad keypad--wide");
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "⌫"].forEach(
    function (key) {
      const button = el("button", "key", key);
      button.type = "button";
      button.addEventListener("click", function () {
        onKey(key);
      });
      pad.appendChild(button);
    },
  );
  return pad;
}

function handleDigits(current, key, maxLength) {
  if (key === "전체삭제") {
    return "";
  }
  if (key === "←") {
    return current.slice(0, -1);
  }
  return current.length < maxLength ? current + key : current;
}

function designAlert(modal, options) {
  setModal(modal, options.modalClass || "modal--alert");
  if (options.back) {
    modal.appendChild(backButton(options.back));
  }
  if (options.icon) {
    modal.appendChild(el("div", "modal__icon", options.icon));
  }
  modalIntro(modal, options.title, options.desc, options.eyebrow);
  if (options.rows && options.rows.length) {
    modal.appendChild(infoRows(options.rows));
  }
  if (options.note) {
    modal.appendChild(el("p", "modal__note text-center", options.note));
  }
  if (options.actions) {
    modal.appendChild(options.actions);
  }
}

/* 02-A 봉투 선택 */
SCREENS["bag"] = function (modal) {
  setModal(modal, "modal--bag");
  modalIntro(modal, "원하는 봉투를 담아주세요");
  const grid = el("div", "bags");
  BAGS.forEach(function (bag) {
    const card = el("button", "bag");
    card.type = "button";
    card.appendChild(el("span", "bag__name", bag.name));
    card.appendChild(el("span", "bag__size", bag.size));
    card.appendChild(el("strong", "bag__price", won(bag.price)));
    card.appendChild(el("span", "bag__action", "+ 장바구니 담기"));
    card.addEventListener("click", function () {
      addToCart(bag);
      showToast(bag.name + " 담았습니다");
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

/* 03 로그인 유도 */
SCREENS["login-prompt"] = function (modal) {
  setModal(modal, "modal--prompt");
  modal.appendChild(backButton(closeModal));
  modalIntro(
    modal,
    "회원 혜택을 확인할까요?",
    "토마토 APP에 로그인하면 할인과 쿠폰을 자동으로 확인하고\n포인트도 함께 사용할 수 있습니다.",
  );
  modal.appendChild(
    calloutCard(
      "brand",
      "✓  토마토 APP 로그인 한 번이면",
      "할인 가능한 쿠폰은 자동 적용돼요",
    ),
  );
  modal.appendChild(
    actionRow(
      [
        {
          label: "회원 혜택 확인하기",
          variant: "primary",
          onClick: function () {
            openModal("login");
          },
        },
        {
          label: "회원 혜택 없이 결제",
          variant: "ghost",
          onClick: startPayment,
        },
      ],
      true,
    ),
  );
};

/* 03-A 통합 회원 로그인 */
SCREENS["login"] = function (modal) {
  setModal(modal, "modal--wide modal--login");
  modal.appendChild(backButton(function () {
    openModal("login-prompt");
  }));
  modalIntro(modal, "회원 정보를 확인해주세요");

  const methods = el("div", "login");
  const app = el("section", "login__col login__col--app");
  app.appendChild(
    el("span", "recommended-badge", "추천 · 모든 할인 자동 적용"),
  );
  app.appendChild(el("h3", "login__heading", "APP 회원 바코드 스캔"));
  app.appendChild(
    el(
      "p",
      "login__desc",
      "행사·회원할인·사용 가능한 쿠폰을\n로그인 즉시 전부 결제에 반영합니다.",
    ),
  );
  app.appendChild(el("div", "login__scan", scannerSvg()));
  app.appendChild(statusPill("●  APP 회원 바코드 스캔 대기 중", "success"));
  methods.appendChild(app);

  const phone = el("section", "login__col login__col--phone");
  phone.appendChild(el("h3", "login__heading", "휴대폰 번호로 확인"));
  phone.appendChild(
    el(
      "p",
      "login__desc",
      "APP 쿠폰·회원할인은 제외되며\n포인트만 조회·사용할 수 있습니다.",
    ),
  );
  phone.appendChild(phoneDisplayExact(state.phoneInput));
  phone.appendChild(
    keypadExact(function (key) {
      state.phoneInput = handleDigits(state.phoneInput, key, 8);
      openModal("login");
    }),
  );
  const confirm = el("button", "btn btn--neutral login__confirm", "확인");
  confirm.disabled = state.phoneInput.length !== 8;
  confirm.addEventListener("click", function () {
    lookupPhone("010" + state.phoneInput);
  });
  phone.appendChild(confirm);
  methods.appendChild(phone);
  modal.appendChild(methods);

  if (!CONFIG.blockSignup) {
    modal.appendChild(
      el(
        "p",
        "modal__install-title",
        "토마토 APP회원이 아니라면?  APP을 설치하거나 휴대폰 번호로 바로 가입할 수 있어요",
      ),
    );
    const signup = el("div", "signup-methods");
    [
      ["Android", "Google Play에서 설치"],
      ["iPhone", "App Store에서 설치"],
    ].forEach(function (labels) {
      const card = el("button", "signup-card signup-card--qr");
      card.appendChild(el("span", "signup-card__qr", qrSvg()));
      const copy = el("span", "signup-card__copy");
      copy.appendChild(el("strong", "signup-card__title", labels[0]));
      copy.appendChild(el("span", "signup-card__desc", labels[1]));
      card.appendChild(copy);
      card.addEventListener("click", function () {
        showToast("시연에서는 앱 설치를 생략합니다");
      });
      signup.appendChild(card);
    });
    const direct = el("button", "signup-card signup-card--phone");
    direct.appendChild(
      el("strong", "signup-card__phone-title", "휴대폰 번호로\n바로 가입"),
    );
    direct.addEventListener("click", function () {
      state.signupPhone = "";
      openModal("signup-phone", { entryPath: "direct" });
    });
    signup.appendChild(direct);
    modal.appendChild(signup);
  }
};

/* 03-B 회원 로그인 실패 */
SCREENS["not-member"] = function (modal, data) {
  setModal(modal, "modal--member-failed");
  modal.appendChild(backButton(function () {
    openModal("login");
  }));
  modalIntro(
    modal,
    "회원 로그인 실패",
    "회원 정보를 확인하지 못했습니다",
  );
  modal.appendChild(
    calloutCard(
      "neutral",
      "확인 정보 → “" +
        (data.phone ? formatPhone(data.phone) : data.lookupValue || "") +
        "”",
      "입력한 휴대폰 번호 또는 APP 바코드를 다시 확인해주세요.",
    ),
  );
  if (!CONFIG.blockSignup) {
    modal.appendChild(
      calloutCard(
        "success",
        "✓  APP 또는 휴대폰 번호로 가입할 수 있어요",
        "APP 가입 시 할인·쿠폰·포인트가 적용되고, 휴대폰 가입 시 포인트를 조회·사용할 수 있습니다.",
      ),
    );
    modal.appendChild(
      el(
        "p",
        "modal__note text-center",
        "APP으로 가입하려면 QR을 촬영해 설치해주세요",
      ),
    );
    const qrRow = el("div", "signup-methods signup-methods--two");
    [
      ["Android", "Google Play에서 설치"],
      ["iPhone", "App Store에서 설치"],
    ].forEach(function (labels) {
      const card = el("button", "signup-card signup-card--qr");
      card.appendChild(el("span", "signup-card__qr", qrSvg()));
      const copy = el("span", "signup-card__copy");
      copy.appendChild(el("strong", "signup-card__title", labels[0]));
      copy.appendChild(el("span", "signup-card__desc", labels[1]));
      card.appendChild(copy);
      qrRow.appendChild(card);
    });
    modal.appendChild(qrRow);
    modal.appendChild(
      calloutCard(
        "plain",
        "휴대폰 번호로 회원가입",
        "휴대폰 번호 입력 → 미가입 확인 → 이 번호로 회원가입",
      ),
    );
  }
  const buttons = [];
  if (!CONFIG.blockSignup) {
    buttons.push({
      label: "휴대폰 번호로 가입",
      variant: "primary",
      onClick: function () {
        state.signupPhone = data.phone ? data.phone.slice(3) : "";
        openModal("signup-phone", { entryPath: "from-lookup" });
      },
    });
  }
  buttons.push({
    label: "회원 혜택 없이 결제",
    variant: "ghost",
    onClick: startPayment,
  });
  modal.appendChild(actionRow(buttons));
};

/* 03-C 휴대폰 회원가입 번호 입력 */
SCREENS["signup-phone"] = function (modal, data) {
  setModal(modal, "modal--keypad");
  modal.appendChild(backButton(function () {
    openModal(data.entryPath === "from-lookup" ? "not-member" : "login", {
      phone: "010" + state.signupPhone,
    });
  }));
  modalIntro(
    modal,
    "휴대폰 번호로 회원가입",
    data.entryPath === "from-lookup"
      ? "03-A에서 입력한 번호가 자동으로 채워집니다.\n다른 번호로 가입하려면 지우고 다시 입력해 주세요."
      : "가입할 휴대폰 번호를 입력해 주세요.",
    "가입할 휴대폰 번호 입력",
  );
  modal.appendChild(phoneDisplayExact(state.signupPhone));
  modal.appendChild(
    keypadExact(function (key) {
      state.signupPhone = handleDigits(state.signupPhone, key, 8);
      openModal("signup-phone", data);
    }),
  );
  modal.appendChild(
    actionRow([
      {
        label: "다음",
        variant: "primary",
        disabled: state.signupPhone.length !== 8,
        onClick: function () {
          state.signupPin = "";
          openModal("signup-pin");
        },
      },
    ]),
  );
};

/* 03-D 결제 비밀번호 설정 */
SCREENS["signup-pin"] = function (modal) {
  setModal(modal, "modal--keypad");
  modal.appendChild(backButton(function () {
    openModal("signup-phone", { entryPath: "from-lookup" });
  }));
  modalIntro(
    modal,
    "결제 비밀번호를 설정해주세요",
    "키오스크 결제 시 사용할 숫자 4자리를 입력해주세요.\n입력한 비밀번호는 다음 화면에서 확인할 수 있습니다.",
    "숫자 4자리 결제 비밀번호",
  );
  modal.appendChild(pinDisplay(state.signupPin));
  modal.appendChild(
    keypadExact(function (key) {
      state.signupPin = handleDigits(state.signupPin, key, 4);
      openModal("signup-pin");
    }),
  );
  modal.appendChild(
    actionRow([
      {
        label: "다음",
        variant: "primary",
        disabled: state.signupPin.length !== 4,
        onClick: function () {
          openModal("signup-confirm");
        },
      },
    ]),
  );
};

/* 03-E 가입 정보 확인 */
SCREENS["signup-confirm"] = function (modal) {
  setModal(modal, "modal--signup-confirm");
  modal.appendChild(backButton(function () {
    openModal("signup-pin");
  }));
  modalIntro(
    modal,
    "입력한 회원정보를 확인해주세요",
    "회원번호와 결제 비밀번호를 확인해주세요.\n수정이 필요하면 다시 입력할 수 있습니다.",
    "이 정보로 가입할까요?",
  );
  modal.appendChild(
    infoRows([
      { label: "회원번호", value: formatPhone("010" + state.signupPhone) },
      { label: "결제 비밀번호", value: state.signupPin },
    ]),
  );
  modal.appendChild(
    calloutCard(
      "success",
      "가입 축하 포인트 " + point(STORE.signupBonus) + " 지급",
      "이번 결제에 바로 사용할 수 있습니다",
    ),
  );
  modal.appendChild(
    actionRow([
      {
        label: "다시 입력",
        variant: "ghost",
        onClick: function () {
          openModal("signup-phone", { entryPath: "direct" });
        },
      },
      {
        label: "가입 완료",
        variant: "primary",
        onClick: function () {
          const newMember = {
            type: "phone",
            key: "010" + state.signupPhone,
            name: "휴대폰 회원",
            point: STORE.signupBonus,
            isNew: true,
          };
          MEMBERS.push(newMember);
          state.member = Object.assign({}, newMember);
          renderMember();
          openPointScreen();
        },
      },
    ]),
  );
};

function pointHeaderExact(modal, totals, title, subtitle) {
  modal.appendChild(backButton(function () {
    openModal("login");
  }));
  modalIntro(modal, title, subtitle);
  modal.appendChild(
    infoRows([
      {
        label: "보유 포인트 · " + STORE.pointUnit + "P 단위 사용",
        value: point(state.member.point),
        className: "row__value--brand",
      },
      { label: "결제금액", value: won(totals.beforePoint) },
    ]),
  );
}

function memberStrip(kind, status) {
  const strip = el("div", "member-strip");
  const copy = el("div", "member-strip__copy");
  copy.appendChild(
    el(
      "strong",
      "member-strip__name",
      kind === "app"
        ? (state.member.name || "APP 회원") + " APP 회원"
        : "휴대폰 회원",
    ),
  );
  copy.appendChild(
    el(
      "span",
      "member-strip__desc",
      kind === "app" ? "할인·쿠폰·포인트" : "포인트 조회·적립",
    ),
  );
  strip.appendChild(copy);
  strip.appendChild(statusPill(status, "success"));
  return strip;
}

function sectionHeading(title, desc) {
  const head = el("div", "modal-section-head");
  head.appendChild(el("strong", "modal-section-head__title", title));
  if (desc) {
    head.appendChild(el("span", "modal-section-head__desc", desc));
  }
  return head;
}

/* 04-APP */
SCREENS["point-app"] = function (modal, data) {
  const totals = data.totals;
  setModal(modal, "modal--point");
  pointHeaderExact(
    modal,
    totals,
    "할인은 이미 모두 적용됐어요",
    "포인트 사용 여부만 선택해주세요",
  );
  const automatic =
    totals.saleDiscount + totals.couponDiscount;
  modal.appendChild(memberStrip("app", "자동 할인 적용 완료"));
  modal.appendChild(
    calloutCard(
      "brand",
      "APP 로그인 자동 혜택 · 총 " + won(automatic) + " 할인",
      "상품 행사와 적용 가능한 쿠폰을 시스템이 전부 찾아 자동 반영했습니다.",
    ),
  );
  modal.appendChild(
    infoRows([
      {
        label: "상품 행사 자동 반영",
        value: "−" + won(totals.saleDiscount),
        className: "row__value--brand",
      },
      {
        label: "사용 가능 쿠폰 " + totals.coupons.length + "장 모두 적용",
        value: "−" + won(totals.couponDiscount),
        className: "row__value--brand",
      },
      { label: "APP 자동 할인 후 금액", value: won(totals.beforePoint) },
    ]),
  );
  const detail = el("button", "btn btn--outline", "자동 적용 할인 내역 보기");
  detail.addEventListener("click", function () {
    openModal("discount-details", { totals: totals });
  });
  modal.appendChild(detail);
  modal.appendChild(
    sectionHeading(
      "포인트 사용",
      "보유 " + point(state.member.point) + " · " + STORE.pointUnit + "P 단위",
    ),
  );
  modal.appendChild(pointOptions(totals));
  modal.appendChild(
    infoRows([
      {
        label:
          "포인트 사용 · 잔여 " +
          point(Math.max(0, state.member.point - state.usedPoint)),
        value: "−" + point(state.usedPoint),
        className: "row__value--brand",
      },
      {
        label: "최종 결제금액",
        value: won(totals.beforePoint - state.usedPoint),
        className: "row__value--brand",
      },
    ]),
  );
  modal.appendChild(
    actionRow([
      {
        label: "포인트 적용하고 결제 계속",
        variant: "primary",
        onClick: startPayment,
      },
      {
        label: "계산 취소",
        variant: "neutral",
        onClick: function () {
          openModal("cancel-checkout");
        },
      },
    ], true),
  );
};

/* 04-PHN */
SCREENS["point-phone"] = function (modal, data) {
  const totals = data.totals;
  setModal(modal, "modal--point");
  pointHeaderExact(
    modal,
    totals,
    "보유 포인트를 사용하시겠습니까?",
    "휴대폰 회원 · 포인트 조회·적립",
  );
  modal.appendChild(memberStrip("phone", "포인트 조회 완료"));
  if (state.member.isNew) {
    modal.appendChild(
      calloutCard(
        "success",
        "가입이 완료되었습니다",
        "축하 포인트 " + point(STORE.signupBonus) + " 포함 · 이번 결제에 바로 사용할 수 있습니다",
      ),
    );
  }
  modal.appendChild(
    sectionHeading(
      "포인트 사용",
      "보유 " + point(state.member.point) + " · " + STORE.pointUnit + "P 단위",
    ),
  );
  modal.appendChild(pointOptions(totals));
  modal.appendChild(
    infoRows([
      {
        label: "포인트 사용",
        value: "−" + point(state.usedPoint),
        className: "row__value--brand",
      },
      {
        label: "최종 결제금액",
        value: won(totals.beforePoint - state.usedPoint),
        className: "row__value--brand",
      },
    ]),
  );
  modal.appendChild(
    actionRow([
      {
        label: "적용하고 결제 계속",
        variant: "primary",
        onClick: startPayment,
      },
      {
        label: "계산 취소",
        variant: "neutral",
        onClick: function () {
          openModal("cancel-checkout");
        },
      },
    ], true),
  );
};

/* 04-APP-D / 04-PHN-D */
SCREENS["point-disabled"] = function (modal, data) {
  const totals = data.totals;
  setModal(modal, "modal--point");
  pointHeaderExact(
    modal,
    totals,
    "포인트는 이번 결제에 사용할 수 없어요",
    state.member.type === "app"
      ? "APP 로그인 자동 할인은 그대로 적용됩니다"
      : "휴대폰 회원 · 포인트 조회·적립",
  );
  modal.appendChild(
    calloutCard(
      "warning",
      "포인트 사용 불가",
      "보유 " + point(state.member.point) + " · 이 매장은 " + point(STORE.pointMin) + "부터 사용할 수 있어요",
    ),
  );
  modal.appendChild(
    memberStrip(
      state.member.type,
      state.member.type === "app" ? "자동 할인 적용 완료" : "포인트 조회 완료",
    ),
  );
  if (state.member.type === "app") {
    const detail = el("button", "btn btn--outline", "자동 적용 할인 내역 보기");
    detail.addEventListener("click", function () {
      openModal("discount-details", { totals: totals });
    });
    modal.appendChild(detail);
  }
  const disabledOptions = el("div", "point-options");
  ["사용 안 함", "직접 입력", "사용 가능 전액 ✓"].forEach(function (label) {
    const option = el("button", "point-option", label);
    option.disabled = true;
    disabledOptions.appendChild(option);
  });
  modal.appendChild(disabledOptions);
  modal.appendChild(
    infoRows([
      {
        label: "최종 결제금액",
        value: won(totals.beforePoint),
        className: "row__value--brand",
      },
    ]),
  );
  modal.appendChild(
    actionRow([
      { label: "결제 계속", variant: "primary", onClick: startPayment },
    ]),
  );
};

/* 04-DTL 자동 할인 상세 */
SCREENS["discount-details"] = function (modal, data) {
  const totals = data.totals || calcTotals();
  setModal(modal, "modal--discount-detail");
  modal.appendChild(backButton(openPointScreen));
  modalIntro(
    modal,
    "자동 적용된 할인 내역",
    "적용 가능한 혜택을 빠짐없이 확인했습니다",
  );
  modal.appendChild(
    calloutCard(
      "brand",
      "할인 " + (totals.coupons.length + 1) + "건 모두 자동 반영",
      "고객이 쿠폰을 고르지 않아도 가장 큰 할인 결과를 적용합니다.",
    ),
  );
  const rows = [
    {
      label: "상품 행사 자동 반영",
      value: "−" + won(totals.saleDiscount),
      className: "row__value--brand",
    },
  ];
  totals.coupons.forEach(function (coupon) {
    rows.push({
      label: coupon.name,
      value: "−" + won(coupon.applied),
      className: "row__value--brand",
    });
  });
  modal.appendChild(infoRows(rows, "discount-list"));
  modal.appendChild(
    infoRows([
      { label: "상품 정상가", value: won(totals.listTotal) },
      {
        label: "자동 할인 합계",
        value: "−" + won(totals.saleDiscount + totals.couponDiscount),
        className: "row__value--brand",
      },
      { label: "포인트 적용 전 금액", value: won(totals.beforePoint) },
    ]),
  );
  modal.appendChild(
    el(
      "p",
      "modal__note text-center",
      "쿠폰 중복·최소 구매금액·적용 제외 조건은 ERP 설정에 따라 자동 판단합니다.",
    ),
  );
  modal.appendChild(
    actionRow([{ label: "확인", variant: "primary", onClick: openPointScreen }]),
  );
};

/* 04-INP 포인트 직접 입력 */
SCREENS["point-input"] = function (modal, data) {
  const maxUsable = data.maxUsable;
  const value = Number(state.pointInput || 0);
  setModal(modal, "modal--point-input");
  modal.appendChild(backButton(openPointScreen));
  modalIntro(modal, "사용할 포인트를 입력해주세요");
  modal.appendChild(
    infoRows([
      {
        label: "보유 포인트 · " + STORE.pointUnit + "P 단위 사용",
        value: point(state.member.point),
        className: "row__value--brand",
      },
      { label: "결제금액", value: won(calcTotals().beforePoint) },
    ]),
  );
  modal.appendChild(
    el(
      "div",
      "point-rule",
      "최소 " + point(STORE.pointMin) + "부터  ·  " + STORE.pointUnit + "P 단위로 사용 가능",
    ),
  );
  const input = el("div", "point-input");
  input.appendChild(el("span", "point-input__label", "사용할 포인트"));
  input.appendChild(el("strong", "point-input__value", point(value)));
  modal.appendChild(input);

  let hint = "";
  if (value > 0 && value < STORE.pointMin) {
    hint = point(STORE.pointMin) + " 이상 입력해 주세요";
  } else if (value % STORE.pointUnit !== 0) {
    hint = STORE.pointUnit + "P 단위로 입력해 주세요";
  } else if (value > maxUsable) {
    hint = "사용 가능한 포인트를 초과했습니다";
  }
  modal.appendChild(el("p", "point-hint", hint));

  const quick = el("div", "quick-picks");
  [1000, 5000].forEach(function (amount) {
    const button = el("button", "btn btn--ghost", point(amount));
    button.disabled = amount > maxUsable;
    button.addEventListener("click", function () {
      state.pointInput = String(amount);
      openModal("point-input", { maxUsable: maxUsable });
    });
    quick.appendChild(button);
  });
  const all = el("button", "btn btn--ghost", "전액 사용");
  all.disabled = maxUsable < STORE.pointMin;
  all.addEventListener("click", function () {
    state.pointInput = String(maxUsable);
    openModal("point-input", { maxUsable: maxUsable });
  });
  quick.appendChild(all);
  modal.appendChild(quick);
  modal.appendChild(
    pointKeypad(function (key) {
      if (key === "⌫") {
        state.pointInput = state.pointInput.slice(0, -1);
      } else if (state.pointInput.length < 7) {
        state.pointInput = (state.pointInput + key)
          .slice(0, 7)
          .replace(/^0+/, "");
      }
      openModal("point-input", { maxUsable: maxUsable });
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
        onClick: function () {
          state.pointInput = "";
          openModal("point-input", { maxUsable: maxUsable });
        },
      },
      {
        label: valid ? point(value) + " 적용" : "입력값을 확인해주세요",
        variant: "primary",
        disabled: !valid,
        onClick: function () {
          state.usedPoint = value;
          renderSummary();
          openPointScreen();
        },
      },
    ]),
  );
};

/* H1 APP 포인트 적립·사용 내역 */
SCREENS["point-history"] = function (modal) {
  setModal(modal, "modal--wide modal--history");
  modalIntro(
    modal,
    "포인트 적립·사용 내역",
    (state.member ? state.member.name : "회원") + " 님의 조회 내역입니다.",
    "POINT HISTORY",
  );
  const periods = el("div", "history-periods");
  ["최근 1주일", "최근 1개월", "최근 3개월"].forEach(function (label, index) {
    const period = el(
      "button",
      "history-period" + (index === 0 ? " is-active" : ""),
      label,
    );
    period.addEventListener("click", function () {
      periods.querySelectorAll(".history-period").forEach(function (button) {
        button.classList.remove("is-active");
      });
      period.classList.add("is-active");
    });
    periods.appendChild(period);
  });
  modal.appendChild(periods);
  modal.appendChild(
    calloutCard("brand", "조회 기간 합계", "+159P 적립  ·  −100P 사용"),
  );
  const table = el("div", "history-table");
  ["일시", "적립/사용구분", "적립", "사용"].forEach(function (label) {
    table.appendChild(el("strong", "history-cell history-cell--head", label));
  });
  POINT_HISTORY.forEach(function (item) {
    [item.date, item.type, item.earn, item.use].forEach(function (value) {
      table.appendChild(el("span", "history-cell", value));
    });
  });
  modal.appendChild(table);
  modal.appendChild(
    el(
      "p",
      "modal__note text-center",
      "조회 가능 기간: 최근 1주일 · 최근 1개월 · 최근 3개월",
    ),
  );
  modal.appendChild(
    actionRow([{ label: "확인", variant: "primary", onClick: closeModal }]),
  );
};

function paymentModal(modal, type, title, desc, status, cancelLabel, cancel) {
  setModal(modal, "modal--payment");
  modalIntro(modal, title, desc, type === "card" ? "신용카드 결제" : type === "easy" ? "간편결제 · 바코드" : "현금결제");
  modal.appendChild(el("div", "modal__device", paymentSvg(type)));
  modal.appendChild(
    infoRows([
      {
        label: "결제금액",
        value: won(calcTotals().payable),
        className: "row__value--brand",
      },
    ]),
  );
  modal.appendChild(statusPill(status, "brand"));
  modal.appendChild(
    actionRow([{ label: cancelLabel, variant: "neutral", onClick: cancel }]),
  );
}

/* 05-A / 05-B */
SCREENS["pay-device"] = function (modal, data) {
  const type = data.method === "easy" ? "easy" : "card";
  paymentModal(
    modal,
    type,
    type === "card" ? "카드를 리더기에 꽂아주세요" : "결제 바코드를 스캔해주세요",
    type === "card"
      ? "IC칩이 위를 향하도록 끝까지 넣어주세요"
      : "카카오페이·네이버페이 등 결제 바코드를 스캐너에 보여주세요",
    type === "card" ? "카드를 기다리고 있습니다" : "바코드를 기다리고 있습니다",
    type === "card" ? "결제 취소" : "다른 결제수단 선택",
    closeModal,
  );
  setTimeout(function () {
    if (state.modal === "pay-device") {
      openModal("van-waiting", { method: type });
    }
  }, 1600);
};

/* 05-C 현금 */
SCREENS["pay-cash"] = function (modal) {
  setModal(modal, "modal--payment");
  modalIntro(
    modal,
    "현금투입구에 돈을 넣어주세요",
    "지폐와 동전을 한 번에 하나씩 천천히 넣어주세요",
    "현금결제",
  );
  modal.appendChild(el("div", "modal__device", paymentSvg("cash")));
  modal.appendChild(
    infoRows([
      { label: "결제금액", value: won(calcTotals().payable) },
      { label: "현재 투입금액", value: "0원" },
      {
        label: "남은 금액",
        value: won(calcTotals().payable),
        className: "row__value--brand",
      },
    ]),
  );
  modal.appendChild(
    el(
      "p",
      "modal__note text-center",
      "초과 투입금은 거스름돈으로 반환됩니다 · 장치 오류 시 투입금을 반환한 뒤 직원을 호출합니다",
    ),
  );
  modal.appendChild(
    actionRow([
      {
        label: "결제 취소 · 투입금 반환",
        variant: "neutral",
        onClick: function () {
          openModal("cash-return", { inserted: 0 });
        },
      },
    ]),
  );
  setTimeout(function () {
    if (state.modal === "pay-cash") {
      completePayment();
    }
  }, 2200);
};

/* P5-P6 승인 진행 */
SCREENS["van-waiting"] = function (modal, data) {
  setModal(modal, "modal--payment");
  modalIntro(
    modal,
    "결제를 진행하고 있습니다",
    "카드를 빼거나 자리를 뜨지 마세요",
    "승인 요청 중",
  );
  modal.appendChild(el("div", "modal__icon", '<div class="spinner"></div>'));
  modal.appendChild(
    infoRows([
      {
        label: "결제금액",
        value: won(calcTotals().payable),
        className: "row__value--brand",
      },
    ]),
  );
  modal.appendChild(statusPill("VAN 승인 요청 중 · 최대 30초 소요", "brand"));
  modal.appendChild(
    actionRow([
      {
        label: "직원 호출",
        variant: "ghost",
        onClick: function () {
          openModal("store-help");
        },
      },
    ]),
  );
  setTimeout(function () {
    if (state.modal !== "van-waiting") return;
    if (data.method === "easy" && state.vanRetry === 0) {
      state.vanRetry += 1;
      openModal("van-declined");
      return;
    }
    completePayment();
  }, 2000);
};

/* E-VAN-01 */
SCREENS["van-declined"] = function (modal) {
  designAlert(modal, {
    eyebrow: "승인 거절",
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
    note: "재시도 " + state.vanRetry + " / 3 · 3회 초과 시 직원 호출로 전환됩니다",
    actions: actionRow([
      {
        label: "다시 시도",
        variant: "primary",
        onClick: function () {
          openModal("van-waiting", { method: state.method || "card" });
        },
      },
      {
        label: "다른 결제수단 선택",
        variant: "outline",
        onClick: closeModal,
      },
      {
        label: "직원 호출",
        variant: "ghost",
        onClick: function () {
          openModal("store-help");
        },
      },
    ], true),
  });
};

/* E-CASH-01 */
SCREENS["cash-return"] = function (modal, data) {
  designAlert(modal, {
    eyebrow: "현금 반환",
    icon: paymentSvg("cash"),
    title: "투입하신 현금을 반환합니다",
    rows: [
      { label: "필요 금액", value: won(calcTotals().payable) },
      { label: "투입 금액", value: won(data.inserted || 0) },
      {
        label: "부족 금액",
        value: won(Math.max(0, calcTotals().payable - (data.inserted || 0))),
        className: "row__value--brand",
      },
    ],
    note: "반환구에서 현금을 수령해 주세요 · 장바구니는 그대로 유지됩니다",
    actions: actionRow([
      { label: "결제수단 다시 선택", variant: "primary", onClick: closeModal },
    ]),
  });
};

/* E-HELP-01 */
SCREENS["store-help"] = function (modal) {
  designAlert(modal, {
    icon: iconWarning(),
    title: "결제가 완료되지 않았습니다",
    desc: "카드는 정상이며 결제 금액이 빠져나가지 않았습니다",
    rows: [
      {
        label: "키오스크 번호",
        value: STORE.kioskNo + "번",
        className: "row__value--big",
      },
      {
        label: "매장 담당자",
        value: STORE.managerPhone,
        className: "row__value--big",
      },
    ],
    note: "“" + STORE.kioskNo + "번 키오스크에서 결제가 안 됐어요” 라고 말씀해 주세요",
    actions: actionRow([
      { label: "확인", variant: "primary", onClick: closeModal },
    ]),
  });
};

/* 06 완료 */
SCREENS["complete"] = function (modal, data) {
  const totals = data.totals;
  const earned = earnedPoint(totals.payable);
  setModal(modal, "modal--complete");
  modal.appendChild(el("div", "modal__icon", iconSuccess()));
  modalIntro(
    modal,
    "결제가 완료되었습니다",
    "카드와 구매하신 상품을 확인해주세요",
  );
  const rows = [
    {
      label: "최종 결제금액",
      value: won(totals.payable),
      className: "row__value--brand",
    },
  ];
  if (totals.couponDiscount > 0) {
    rows.push({
      label: "쿠폰 할인",
      value: "−" + won(totals.couponDiscount),
      className: "row__value--brand",
    });
  }
  if (totals.usedPoint > 0) {
    rows.push({ label: "포인트 사용", value: point(totals.usedPoint) });
  }
  if (earned !== null) {
    rows.push({
      label: "적립 포인트",
      value: "+" + point(earned),
      className: "row__value--success",
    });
  }
  modal.appendChild(infoRows(rows));
  if (!CONFIG.usePointEarn) {
    modal.appendChild(
      el("p", "modal__note text-center", "키오스크 결제는 적립 제외됩니다."),
    );
  }
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
  countdown.textContent = left + "초 후 처음 화면으로 돌아갑니다";
  state.countdownTimer = setInterval(function () {
    left -= 1;
    countdown.textContent = left + "초 후 처음 화면으로 돌아갑니다";
    if (left <= 0) {
      clearInterval(state.countdownTimer);
      resetKiosk();
    }
  }, 1000);
};

/* 상품 예외 */
SCREENS["item-soldout"] = function (modal, data) {
  designAlert(modal, {
    icon: iconWarning(),
    title: "품절된 상품입니다",
    desc: "이 상품은 담을 수 없습니다. 매대에 되돌려 주세요",
    rows: [{ label: "상품명", value: data.product.name }],
    actions: actionRow([{ label: "확인", variant: "primary", onClick: closeModal }]),
  });
};

SCREENS["item-unknown"] = function (modal, data) {
  designAlert(modal, {
    icon: iconWarning(),
    title: "미등록 상품입니다",
    desc: "관리자에게 문의해 주세요",
    rows: [{ label: "읽은 바코드", value: data.barcode }],
    actions: actionRow([{ label: "확인", variant: "primary", onClick: closeModal }]),
  });
};

SCREENS["item-age"] = function (modal, data) {
  designAlert(modal, {
    icon: iconWarning(),
    title: "미성년자 판매불가 상품입니다",
    desc: "연령 확인이 필요한 상품입니다. 매장 담당자에게 문의해 주세요",
    rows: [{ label: "상품명", value: data.product.name }],
    actions: actionRow([{ label: "확인", variant: "primary", onClick: closeModal }]),
  });
};

/* E-ITM-03A */
SCREENS["age-approval"] = function (modal, data) {
  designAlert(modal, {
    modalClass: "modal--age",
    title: "성인 확인이 필요한 상품입니다",
    desc:
      "신분증을 준비해 매장 담당자에게 보여주세요\n" +
      "담당자가 매니저앱 바코드를 스캐너에 찍으면 상품이 담깁니다\n" +
      "승인 전까지 다른 상품은 스캔되지 않습니다",
    rows: [{ label: "확인 대기 상품", value: data.product.name }],
    actions: actionRow([
      { label: "취소", variant: "ghost", onClick: closeModal },
      {
        label: "승인 대기 중",
        variant: "neutral",
        disabled: true,
      },
    ]),
  });
};

/* 취소 */
SCREENS["clear-cart"] = function (modal) {
  const totals = calcTotals();
  designAlert(modal, {
    icon: iconWarning(),
    title: "담은 상품을 모두 취소할까요?",
    desc: "장바구니의 상품이 전부 삭제되며 처음 화면으로 돌아갑니다",
    rows: [{ label: "담은 상품", value: totals.qty + "개" }],
    actions: actionRow([
      { label: "전체 취소", variant: "neutral", onClick: resetKiosk },
      { label: "계속 담기", variant: "primary", onClick: closeModal },
    ]),
  });
};

SCREENS["cancel-checkout"] = function (modal) {
  const totals = calcTotals();
  designAlert(modal, {
    icon: iconWarning(),
    title: "계산을 취소할까요?",
    desc: "담은 상품과 로그인·포인트 적용이 모두 취소됩니다",
    rows: [{ label: "담은 상품", value: totals.qty + "개" }],
    actions: actionRow([
      { label: "취소", variant: "neutral", onClick: resetKiosk },
      { label: "계속 결제", variant: "primary", onClick: openPointScreen },
    ]),
  });
};

/* E-TMO-01 */
SCREENS["timeout"] = function (modal) {
  designAlert(modal, {
    icon: iconWarning(),
    title: "10초 후 처음 화면으로 돌아갑니다",
    desc:
      "계속 이용하시려면 화면을 눌러 주세요\n" +
      "돌아가면 담은 상품과 로그인이 모두 초기화됩니다",
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
  state.countdownTimer = setInterval(function () {
    left -= 1;
    valueNode.textContent = left + "초";
    if (left <= 0) {
      clearInterval(state.countdownTimer);
      resetKiosk();
    }
  }, 1000);
};
