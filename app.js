(function () {
  "use strict";

  const PLACE_NAMES = ["일의 자리", "십의 자리", "백의 자리", "천의 자리", "만의 자리"];

  function placeNameForIndex(strLen, charIndex) {
    const power = strLen - 1 - charIndex;
    return PLACE_NAMES[power] || Math.pow(10, power) + "의 자리";
  }

  function placePower(strLen, charIndex) {
    return strLen - 1 - charIndex;
  }

  /** 일=0(파랑), 십=1(초록), 백=2(주황), 그 위는 주기 */
  function placeToneIndex(strLen, charIndex) {
    return Math.min(placePower(strLen, charIndex), 2);
  }

  const PL_SHORT = ["일", "십", "백", "천", "만"];

  function shortPlaceLabel(strLen, colIdx) {
    const p = placePower(strLen, colIdx);
    return PL_SHORT[p] || String(Math.pow(10, p));
  }

  /** 고정 열 너비: 몫 줄·세로셈 줄이 따로 중앙 정렬되며 어긋나지 않게 함 */
  function gridTemplateColumnsCss(n, divisor) {
    const ds = String(divisor).length;
    const leaderRem = Math.max(5.35, 2.85 + ds * 0.62) + "rem";
    const col = "3.5rem";
    const hint = "13rem";
    return leaderRem + " repeat(" + n + ", " + col + ") " + hint;
  }

  function applyPracticeGridColumns(n, divisor) {
    const shell = document.getElementById("practiceAlign");
    if (shell) {
      shell.style.setProperty("--practice-grid-cols", gridTemplateColumnsCss(n, divisor));
    }
  }

  function renderPlaceDemo() {
    const el = document.getElementById("placeDemo");
    if (!el) return;
    const sample = "528";
    el.innerHTML = sample
      .split("")
      .map(function (d, i) {
        const name = placeNameForIndex(sample.length, i);
        const t = placeToneIndex(sample.length, i);
        return (
          '<div class="place-cell place-tone-' +
          t +
          '"><div class="digit">' +
          d +
          '</div><div class="name">' +
          name +
          "</div></div>"
        );
      })
      .join("");
  }

  function buildSteps(dividend, divisor) {
    const dStr = String(Math.abs(Math.floor(dividend)));
    if (dStr === "0" || dStr.length > 5) return null;

    const steps = [];
    let quotientDigits = [];
    let remainder = 0;

    for (let i = 0; i < dStr.length; i++) {
      const ch = dStr[i];
      const place = placeNameForIndex(dStr.length, i);
      const working = remainder * 10 + parseInt(ch, 10);
      const qDigit = Math.floor(working / divisor);
      const product = qDigit * divisor;
      const newRem = working - product;

      steps.push({
        index: i,
        place,
        digit: ch,
        partial: working,
        quotientDigit: qDigit,
        product,
        remainder: newRem,
      });

      quotientDigits.push(String(qDigit));
      remainder = newRem;
    }

    const dividendNum = parseInt(dStr, 10);
    return {
      dividend: dividendNum,
      divisor,
      quotient: Math.floor(dividendNum / divisor),
      quotientStr: quotientDigits.join(""),
      finalRemainder: dividendNum % divisor,
      steps,
      dividendStr: dStr,
    };
  }

  /** 자릿값 곱 (예: 몫 1×나누는 수 3×100 → 300) — 세로셈에 3·0·0으로 표시 */
  function visualPlaceProduct(step, divisor, n) {
    const unit = Math.pow(10, placePower(n, step.index));
    return step.quotientDigit * divisor * unit;
  }

  /**
   * 방금 단계까지 뺀 뒤 남은 수(run)에서, 이번에 볼 부분 피제수(step.partial)에 해당하는 칸들.
   * (예: 319에서 십 자리 몫 입력 시 3·1 칸)
   */
  function afterSubBlinkColumns(state, revealedMaxStep, currentStep) {
    const n = state.dividendStr.length;
    if (currentStep < 1 || currentStep >= state.steps.length) return null;
    let run = parseInt(state.dividendStr, 10);
    const last = Math.min(revealedMaxStep, state.steps.length - 1);
    for (let s = 0; s <= last; s++) {
      run -= visualPlaceProduct(state.steps[s], state.divisor, n);
    }
    const runStr = String(run);
    const rStart = n - runStr.length;
    const partial = state.steps[currentStep].partial;
    const ps = String(partial);
    const cols = [];
    for (let j = 0; j < ps.length && j < runStr.length; j++) {
      cols.push(rStart + j);
    }
    return cols.length ? cols : null;
  }

  /** 앞 자리 몫이 0일 때만: 숫자를 이어 붙여 본다는 안내 (초등 표현) */
  function afterSubMergeNote(state, currentStep) {
    if (currentStep < 1) return "";
    const prev = state.steps[currentStep - 1];
    if (prev.quotientDigit !== 0) return "";
    const n = state.dividendStr.length;
    const partial = state.steps[currentStep].partial;
    const div = state.divisor;
    const prevLabel = shortPlaceLabel(n, currentStep - 1);
    const curLabel = shortPlaceLabel(n, currentStep);
    const scale = Math.pow(10, placePower(n, currentStep));
    const big = partial * scale;

    let h =
      '<span class="vd-merge-tip">' +
      prevLabel +
      " 자리만 보면 나누는 수(" +
      div +
      ")보다 작아서 몫에 0을 적었어요. " +
      curLabel +
      " 자리 숫자까지 옆으로 이어 붙이면 <strong>" +
      partial +
      "</strong>이에요.";
    if (scale >= 10 && big !== partial) {
      h += " (한꺼번에 보면 <strong>" + big + "</strong> 크기로도 볼 수 있어요.)";
    }
    h += " 이제 " + div + "이 몇 번 들어갈지 생각해 봐요.</span>";
    return h;
  }

  function renderWorkOnly(state, revealedMaxStep, blinkCol) {
    const container = document.getElementById("longDivision");
    if (!container || !state) return;

    const { dividendStr, divisor, steps } = state;
    const n = dividendStr.length;
    const lastStep = steps.length - 1;

    applyPracticeGridColumns(n, divisor);

    function classicLeader(isBlank) {
      const inv = isBlank ? " vd-g-leader-blank" : "";
      return (
        '<div class="vd-g-leader vd-g-classic-lead' +
        inv +
        '" ' +
        (isBlank ? 'aria-hidden="true"' : "") +
        ">" +
        '<span class="vd-cl-div">' +
        divisor +
        "</span>" +
        '<span class="vd-cl-paren">)</span></div>'
      );
    }

    function leaderBlank() {
      return classicLeader(true);
    }

    function cellBlinks(c, blinkSpec) {
      if (Array.isArray(blinkSpec)) return blinkSpec.indexOf(c) >= 0;
      return typeof blinkSpec === "number" && blinkSpec >= 0 && c === blinkSpec;
    }

    function digitCells(segment, startCol, endCol, cellClass, blinkSpec) {
      let inner = "";
      for (let c = 0; c < n; c++) {
        let ch;
        if (c < startCol || c > endCol) ch = "\u00a0";
        else ch = segment[c - startCol];
        const tone = "vd-g-tone-" + placeToneIndex(n, c);
        const blink = cellBlinks(c, blinkSpec) ? " vd-g-blink" : "";
        inner +=
          '<div class="vd-g-digit ' +
          cellClass +
          " " +
          tone +
          blink +
          '">' +
          (ch === " " ? "\u00a0" : ch) +
          "</div>";
      }
      return inner;
    }

    function rowDigits(leaderHtml, segment, startCol, endCol, cellClass, hintHtml, blinkSpec, hintExtraClass) {
      const hintCls =
        "vd-g-hint vd-g-hint-side" + (hintExtraClass ? " " + hintExtraClass : "");
      return (
        '<div class="vd-grid-row">' +
        leaderHtml +
        digitCells(segment, startCol, endCol, cellClass, blinkSpec) +
        '<div class="' +
        hintCls +
        '" style="grid-column: ' +
        (n + 2) +
        '">' +
        (hintHtml || "") +
        "</div></div>"
      );
    }

    let html = '<div class="vd-grid-root" style="--vd-n:' + n + '">';

    html += '<div class="vd-grid-row vd-grid-header">';
    html += '<div class="vd-g-leader vd-g-leader-head"></div>';
    for (let i = 0; i < n; i++) {
      const tone = placeToneIndex(n, i);
      html +=
        '<div class="vd-g-head vd-g-tone-' +
        tone +
        '">' +
        shortPlaceLabel(n, i) +
        "</div>";
    }
    html += '<div class="vd-g-hint" style="grid-column: ' + (n + 2) + '"></div></div>';

    html += '<div class="vd-grid-row vd-dividend-classic">';
    html += classicLeader(false);
    html += digitCells(dividendStr, 0, n - 1, "vd-g-dividend", blinkCol);
    html += '<div class="vd-g-hint" style="grid-column: ' + (n + 2) + '"></div></div>';

    const maxS = Math.min(revealedMaxStep, lastStep);
    let run = parseInt(dividendStr, 10);

    const afterBlinkCols =
      typeof blinkCol === "number" && blinkCol >= 1 && blinkCol < n
        ? afterSubBlinkColumns(state, maxS, blinkCol)
        : null;
    const mergeHintHtml =
      typeof blinkCol === "number" && blinkCol >= 1 ? afterSubMergeNote(state, blinkCol) : "";

    for (let s = 0; s <= maxS; s++) {
      const st = steps[s];
      const contrib = visualPlaceProduct(st, divisor, n);
      const prodSeg = String(contrib).padStart(n, "0");
      const hintText = multHintText(divisor, st.quotientDigit, n, st.index);

      html += rowDigits(leaderBlank(), prodSeg, 0, n - 1, "vd-g-product", hintText, -1);

      html += '<div class="vd-grid-row vd-rule-row">';
      html += leaderBlank();
      html +=
        '<div class="vd-g-merge-rule" style="grid-column: 2 / span ' +
        n +
        ';"><div class="vd-rule-line"></div></div>';
      html += '<div class="vd-g-hint" style="grid-column: ' + (n + 2) + '"></div></div>';

      run -= contrib;
      const runStr = String(run);
      const rStart = n - runStr.length;
      const isLastAfter = s === maxS;
      const subBlink =
        isLastAfter && afterBlinkCols && afterBlinkCols.length ? afterBlinkCols : -1;
      const subHint = isLastAfter && mergeHintHtml ? mergeHintHtml : "";
      const subHintCls = isLastAfter && mergeHintHtml ? "vd-g-hint-merge" : "";
      html += rowDigits(
        leaderBlank(),
        runStr,
        rStart,
        n - 1,
        "vd-g-after-sub",
        subHint,
        subBlink,
        subHintCls
      );
    }

    html += "</div>";
    container.innerHTML = html;
  }

  function multHintText(divisor, digit, strLen, charIndex) {
    const unit = Math.pow(10, placePower(strLen, charIndex));
    const left = digit * unit;
    const right = divisor * digit * unit;
    return divisor + " × " + left + " = " + right;
  }

  let difficulty = "easy";
  let currentProblem = null;
  /** @type {ReturnType<typeof buildSteps>|null} */
  let session = null;
  /** @type {(number|null)[]} */
  let userQuotient = [];
  let currentInputIndex = 0;
  let remainderSolved = false;

  const DIFF_TEXT = {
    easy: "나누어지는 수 2자리 ÷ 나누는 수 1자리 · 나누어떨어지는 문제가 많아요.",
    normal: "나누어지는 수 3자리 ÷ 나누는 수 1자리 · 나머지가 있을 수 있어요.",
    hard: "나누어지는 수 3자리 ÷ 나누는 수 2자리 · 몫에 0이 나올 수 있어요.",
  };

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function generateProblemForDifficulty(d) {
    if (d === "easy") {
      for (let t = 0; t < 80; t++) {
        const divd = randomInt(10, 99);
        const divr = randomInt(2, 9);
        if (divd % divr === 0) return { dividend: divd, divisor: divr };
      }
      const divr = randomInt(2, 9);
      const q = randomInt(2, 11);
      return { dividend: divr * q, divisor: divr };
    }
    if (d === "normal") {
      return { dividend: randomInt(100, 999), divisor: randomInt(2, 9) };
    }
    return { dividend: randomInt(100, 999), divisor: randomInt(10, 99) };
  }

  function updateProblemPreview() {
    const el = document.getElementById("problemPreview");
    if (!el || !currentProblem) return;
    el.textContent =
      "나누어지는 수 " +
      currentProblem.dividend +
      " ÷ 나누는 수 " +
      currentProblem.divisor;
  }

  function clearFormErrors() {
    document.querySelectorAll("#divForm .form-error").forEach(function (x) {
      x.remove();
    });
  }

  function newRandomProblem() {
    clearFormErrors();
    currentProblem = generateProblemForDifficulty(difficulty);
    updateProblemPreview();
    hidePractice();
  }

  var WS_COUNT = 12;

  function generateUniqueProblems(d, count) {
    var seen = Object.create(null);
    var out = [];
    var guard = 0;
    while (out.length < count && guard < 600) {
      guard++;
      var p = generateProblemForDifficulty(d);
      var key = p.dividend + ":" + p.divisor;
      if (seen[key]) continue;
      seen[key] = true;
      out.push(p);
    }
    return out;
  }

  var WS_ASSET = {
    logo: "assets/ws-logo.png",
    ruler: "assets/ws-ruler.png",
    mascot: "assets/ws-mascot.png",
  };

  function worksheetLdHtml(dividend, divisor) {
    var st = buildSteps(dividend, divisor);
    if (!st) return "";
    var dStr = st.dividendStr;
    var divStr = String(divisor);
    var n = dStr.length;
    var colCount = Math.max(6, divStr.length + 1 + n);
    var rowCount = Math.max(6, 2 + st.steps.length * 2);

    var dividendStart = colCount - n + 1;
    var parenCol = dividendStart - 1;
    var divisorStart = Math.max(1, parenCol - divStr.length);

    var cellHtml = "";
    for (var r = 1; r <= rowCount; r++) {
      for (var c = 1; c <= colCount; c++) {
        var topCls = r === 1 ? " is-top" : "";
        var leftCls = c === 1 ? " is-left" : "";
        cellHtml += '<span class="ws-grid-cell' + topCls + leftCls + '"></span>';
      }
    }

    function placeDigits(text, row, startCol, cls) {
      var h = "";
      for (var i = 0; i < text.length; i++) {
        h +=
          '<span class="ws-digit ' +
          cls +
          '" style="grid-row:' +
          row +
          ";grid-column:" +
          (startCol + i) +
          ';">' +
          text[i] +
          "</span>";
      }
      return h;
    }

    var html = "";
    var qSlotHtml = "";
    for (var q = 0; q < n; q++) {
      qSlotHtml +=
        '<span class="ws-slot" style="grid-row:1;grid-column:' + (dividendStart + q) + ';"></span>';
    }
    html += qSlotHtml;
    html += placeDigits(divStr, 2, divisorStart, "ws-digit-black");
    html += placeDigits(dStr, 2, dividendStart, "ws-digit-black");
    html +=
      '<span class="ws-paren-char" style="grid-row:2;grid-column:' + parenCol + ';">)</span>';
    html +=
      '<span class="ws-topline" style="grid-row:2;grid-column:' +
      dividendStart +
      " / span " +
      n +
      ';"></span>';

    for (var s = 0; s < st.steps.length; s++) {
      var pRow = 3 + s * 2;
      if (pRow > rowCount) break;
      html +=
        '<span class="ws-subline" style="grid-row:' +
        pRow +
        ";grid-column:" +
        dividendStart +
        " / span " +
        n +
        ';"></span>';
    }

    return (
      '<div class="ws-problem-grid" style="--ws-cols:' +
      colCount +
      ";--ws-rows:" +
      rowCount +
      ';">' +
      cellHtml +
      html +
      "</div>"
    );
  }

  function buildWorksheetAnswerPayload(problems) {
    var a = problems.map(function (p) {
      return [
        p.dividend,
        p.divisor,
        Math.floor(p.dividend / p.divisor),
        p.dividend % p.divisor,
      ];
    });
    return JSON.stringify({ v: 1, a: a });
  }

  function fillWorksheetSheet(problems) {
    var sheet = document.getElementById("worksheetSheet");
    if (!sheet) return;
    var diffLabel =
      difficulty === "easy" ? "쉬움" : difficulty === "normal" ? "보통" : "어려움";
    var grid = "";
    for (var i = 0; i < problems.length; i++) {
      var p = problems[i];
      grid +=
        '<div class="ws-cell">' +
        '<p class="ws-bullet">· ' +
        p.dividend +
        " ÷ " +
        p.divisor +
        "</p>" +
        '<div class="ws-grid-bg">' +
        worksheetLdHtml(p.dividend, p.divisor) +
        "</div>" +
        "</div>";
    }

    sheet.innerHTML =
      '<div class="ws-a4">' +
      '<div class="ws-page-frame">' +
      '<header class="ws-head">' +
      '<div class="ws-head-left">' +
      '<div class="ws-logo-wrap" aria-hidden="true">' +
      '<img class="ws-logo-img" src="' +
      WS_ASSET.logo +
      '" alt="" />' +
      "</div>" +
      '<h1 class="ws-unit-title" id="wsTitle">1. 자릿수와 함께하는 나눗셈</h1>' +
      '<p class="ws-diff-line">난이도 : ' +
      diffLabel +
      "</p>" +
      "</div>" +
      '<div class="ws-head-right">' +
      '<div class="ws-url-line">www.easymath.kr</div>' +
      '<div class="ws-student-fields">' +
      "<div>______초등학교 _____학년</div>" +
      "<div>_____번 이름: ___________</div>" +
      "</div>" +
      "</div>" +
      "</header>" +
      '<div class="ws-body">' +
      '<div class="ws-ruler-col">' +
      '<img class="ws-ruler-img" src="' +
      WS_ASSET.ruler +
      '" alt="" />' +
      "</div>" +
      '<div class="ws-problems-wrap">' +
      '<div class="ws-problems">' +
      grid +
      "</div>" +
      "</div>" +
      "</div>" +
      '<footer class="ws-page-foot">' +
      '<p class="ws-foot-copy">Copyright ⓒ hweewoong. All Rights Reserved.</p>' +
      '<div class="ws-foot-qr">' +
      '<span class="ws-qr-label">정답 QR</span>' +
      '<div id="wsQr"></div>' +
      "</div>" +
      '<div class="ws-foot-mascot">' +
      '<img class="ws-mascot-img" src="' +
      WS_ASSET.mascot +
      '" alt="" />' +
      "</div>" +
      "</footer>" +
      "</div>" +
      "</div>";

    var payload = buildWorksheetAnswerPayload(problems);
    var hash = "";
    try {
      hash = "d=" + encodeURIComponent(btoa(payload));
    } catch (e) {
      hash = "";
    }
    var base = new URL("worksheet-answers.html", window.location.href).href;
    var fullUrl = base + "#" + hash;

    var qrMount = document.getElementById("wsQr");
    if (qrMount) {
      qrMount.innerHTML = "";
      if (typeof QRCode !== "undefined" && QRCode.toDataURL) {
        QRCode.toDataURL(
          fullUrl,
          { width: 92, margin: 1, color: { dark: "#1a1a1a", light: "#ffffff" } },
          function (err, url) {
            if (err || !qrMount) return;
            qrMount.innerHTML =
              '<img src="' + url + '" width="92" height="92" alt="정답 QR 코드" />';
          }
        );
      } else {
        qrMount.innerHTML =
          '<p class="ws-qr-fallback"><a href="' +
          fullUrl +
          '" target="_blank" rel="noopener">정답 페이지</a></p>';
      }
    }
  }

  function openWorksheet() {
    var problems = generateUniqueProblems(difficulty, WS_COUNT);
    fillWorksheetSheet(problems);
    var ov = document.getElementById("worksheetOverlay");
    if (ov) {
      ov.classList.remove("hidden");
      ov.setAttribute("aria-hidden", "false");
      document.body.classList.add("worksheet-open");
    }
    var c = document.getElementById("wsClose");
    if (c) c.focus();
  }

  function closeWorksheet() {
    var ov = document.getElementById("worksheetOverlay");
    if (ov) {
      ov.classList.add("hidden");
      ov.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("worksheet-open");
  }

  function hidePractice() {
    session = null;
    userQuotient = [];
    currentInputIndex = 0;
    remainderSolved = false;
    const card = document.getElementById("practiceCard");
    if (card) card.classList.add("hidden");
    const rb = document.getElementById("remainderBlock");
    if (rb) rb.classList.add("hidden");
    const tip = document.getElementById("remainderTip");
    if (tip) tip.hidden = true;
    const fi = document.getElementById("practiceFeedback");
    if (fi) fi.innerHTML = "";
    const longDiv = document.getElementById("longDivision");
    if (longDiv) longDiv.innerHTML = "";
  }

  function setDifficulty(d) {
    difficulty = d;
    document.querySelectorAll(".chip-diff").forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-diff") === d);
    });
    const desc = document.getElementById("diffDesc");
    if (desc) desc.textContent = DIFF_TEXT[d] || "";
  }

  function renderStepDots(n) {
    const el = document.getElementById("stepDots");
    if (!el || !session) return;
    const hasRem = session.finalRemainder > 0;
    const total = n + (hasRem ? 1 : 0);
    let ph = currentInputIndex;
    if (currentInputIndex >= n) {
      if (hasRem && !remainderSolved) ph = n;
      else ph = total;
    }
    let h = "";
    for (let i = 0; i < total; i++) {
      let cls = "step-dot";
      if (ph > i) cls += " done";
      else if (ph === i) cls += " current";
      h += '<span class="' + cls + '">' + (i < n ? "몫" : "나머지") + "</span>";
    }
    el.innerHTML = h;
  }

  function phaseMessage() {
    if (!session) return "";
    const n = session.steps.length;
    if (currentInputIndex < n) {
      const nm = placeNameForIndex(n, currentInputIndex);
      const circ = ["①", "②", "③", "④", "⑤"][currentInputIndex] || "·";
      return circ + " " + nm + " 몫을 적어 보세요. (깜빡이는 나누어지는 수 숫자와 짝이에요)";
    }
    if (session.finalRemainder > 0 && !remainderSolved) {
      const circ = ["①", "②", "③", "④", "⑤"][n] || "④";
      return circ + " 나머지를 적어 보세요.";
    }
    return "모든 단계를 완료했어요!";
  }

  function updatePhaseUi() {
    const pl = document.getElementById("phaseLabel");
    if (pl) pl.textContent = phaseMessage();
    const n = session ? session.steps.length : 0;
    renderStepDots(n);
  }

  function updateRemainderTip() {
    const tip = document.getElementById("remainderTip");
    if (!tip || !session) return;
    tip.hidden = session.finalRemainder <= 0;
  }

  function renderQuotientInputs() {
    const mount = document.getElementById("quotientMount");
    if (!mount || !session) return;
    const n = session.steps.length;
    const dv = session.divisor;
    applyPracticeGridColumns(n, dv);

    let html =
      '<div class="quotient-grid" role="group" aria-label="몫 입력">' +
      '<div class="vd-g-leader vd-g-leader-blank vd-g-classic-lead" aria-hidden="true">' +
      '<span class="vd-cl-div">' +
      dv +
      '</span><span class="vd-cl-paren">)</span></div>';
    for (let i = 0; i < n; i++) {
      const tone = placeToneIndex(n, i);
      const nm = placeNameForIndex(n, i);
      const val = userQuotient[i];
      const dis = i !== currentInputIndex ? "disabled" : "";
      const filled = val !== null && val !== undefined ? String(val) : "";
      const blink = i === currentInputIndex ? " is-blinking" : "";
      html += '<div class="vd-q-cell vd-g-tone-' + tone + '">';
      html +=
        '<div class="quotient-bundle place-tone-' +
        tone +
        blink +
        '">' +
        '<label class="quotient-label"><span class="sr-only">' +
        nm +
        ' 몫</span>' +
        '<input type="text" class="quotient-inp touch-lg place-tone-' +
        tone +
        '" data-i="' +
        i +
        '" maxlength="1" inputmode="numeric" autocomplete="off" ' +
        dis +
        ' aria-label="' +
        nm +
        ' 몫" value="' +
        filled +
        '" />' +
        "</label></div></div>";
    }
    html +=
      '<div class="vd-g-hint vd-g-hint-topnote" style="grid-column: ' +
      (n + 2) +
      '"></div></div>';
    mount.innerHTML = html;
    updateRemainderTip();

    mount.querySelectorAll(".quotient-inp").forEach(function (inp) {
      inp.addEventListener("input", onQuotientInput);
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter") e.preventDefault();
      });
    });

    const cur = mount.querySelector('.quotient-inp[data-i="' + currentInputIndex + '"]');
    if (cur && !cur.disabled) {
      cur.focus();
      cur.select();
    }
  }

  function refreshWorkArea() {
    if (!session) return;
    const revealed = currentInputIndex - 1;
    const blink = currentInputIndex < session.steps.length ? currentInputIndex : -1;
    renderWorkOnly(session, revealed, blink);
    updatePhaseUi();
  }

  function onQuotientInput(e) {
    const inp = e.target;
    const i = parseInt(inp.getAttribute("data-i"), 10);
    if (i !== currentInputIndex) return;

    const raw = inp.value.replace(/\D/g, "");
    if (raw.length === 0) {
      inp.classList.remove("input-error");
      return;
    }
    const digit = parseInt(raw[0], 10);
    inp.value = String(digit);

    const ok = digit === session.steps[i].quotientDigit;
    if (!ok) {
      wrongFeedback(i, digit);
      inp.value = "";
      return;
    }

    userQuotient[i] = digit;
    inp.disabled = true;

    currentInputIndex = i + 1;
    document.getElementById("practiceFeedback").innerHTML = "";

    if (currentInputIndex >= session.steps.length) {
      if (session.finalRemainder === 0) {
        successAll();
      } else {
        document.getElementById("remainderBlock").classList.remove("hidden");
        const ri = document.getElementById("remainderInput");
        if (ri) {
          ri.value = "";
          ri.focus();
        }
        renderQuotientInputs();
        refreshWorkArea();
      }
    } else {
      renderQuotientInputs();
      refreshWorkArea();
    }
  }

  function wrongFeedback(placeIndex, tried) {
    const page = document.getElementById("pageRoot");
    if (page) {
      page.classList.remove("shake-anim");
      void page.offsetWidth;
      page.classList.add("shake-anim");
      setTimeout(function () {
        page.classList.remove("shake-anim");
      }, 500);
    }
    const nm = placeNameForIndex(session.dividendStr.length, placeIndex);
    const fb = document.getElementById("practiceFeedback");
    if (fb) {
      fb.innerHTML =
        '<span class="fb-wrong">❌ <strong>' +
        nm +
        "</strong> 몫이 아니에요. (적은 숫자: " +
        tried +
        ") 다시 생각해 보세요.</span>";
    }
    const inp = document.querySelector('.quotient-inp[data-i="' + placeIndex + '"]');
    if (inp) {
      inp.classList.add("input-error");
      setTimeout(function () {
        inp.classList.remove("input-error");
      }, 1200);
    }
  }

  function checkRemainderInput() {
    const ri = document.getElementById("remainderInput");
    if (!ri || !session) return;
    if (!ri.value.trim()) return;
    const v = parseInt(ri.value.replace(/\D/g, ""), 10);
    if (Number.isNaN(v)) {
      ri.classList.add("input-error");
      setTimeout(function () {
        ri.classList.remove("input-error");
      }, 800);
      return;
    }
    if (v !== session.finalRemainder) {
      const page = document.getElementById("pageRoot");
      if (page) {
        page.classList.remove("shake-anim");
        void page.offsetWidth;
        page.classList.add("shake-anim");
      }
      document.getElementById("practiceFeedback").innerHTML =
        '<span class="fb-wrong">❌ 나머지가 아니에요. 정답은 <strong>' +
        session.finalRemainder +
        "</strong>이에요.</span>";
      ri.classList.add("input-error");
      setTimeout(function () {
        ri.classList.remove("input-error");
      }, 1200);
      return;
    }
    remainderSolved = true;
    ri.disabled = true;
    successAll();
  }

  function successAll() {
    remainderSolved = true;
    currentInputIndex = session.steps.length;
    renderQuotientInputs();
    refreshWorkArea();
    document.getElementById("remainderBlock").classList.add("hidden");
    const fb = document.getElementById("practiceFeedback");
    if (fb) {
      fb.innerHTML = '<span class="fb-ok">⭕ 정답이에요! 잘했어요!</span>';
    }
    updatePhaseUi();
    launchConfetti();
  }

  function launchConfetti() {
    const canvas = document.createElement("canvas");
    canvas.className = "fx-confetti";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const colors = ["#f6a623", "#7bc96f", "#5b9cf5", "#e85d75", "#ffd93d", "#9b7edc"];
    const pieces = [];
    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: Math.random() * w,
        y: Math.random() * -h * 0.3,
        w: 6 + Math.random() * 8,
        h: 6 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 5,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.2,
        c: colors[(Math.random() * colors.length) | 0],
      });
    }
    let frame = 0;
    function tick() {
      frame++;
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      pieces.forEach(function (p) {
        if (p.y > h + 20) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (frame < 140 && alive) requestAnimationFrame(tick);
      else canvas.remove();
    }
    tick();
  }

  function checkAllQuotient() {
    if (!session) return;
    const n = session.steps.length;
    const wrong = [];
    for (let i = 0; i < n; i++) {
      const inp = document.querySelector('.quotient-inp[data-i="' + i + '"]');
      const raw = inp ? inp.value.replace(/\D/g, "") : "";
      const digit = raw.length ? parseInt(raw[0], 10) : NaN;
      if (digit !== session.steps[i].quotientDigit) wrong.push(i);
    }
    if (wrong.length > 0) {
      const page = document.getElementById("pageRoot");
      if (page) {
        page.classList.remove("shake-anim");
        void page.offsetWidth;
        page.classList.add("shake-anim");
      }
      wrong.forEach(function (i) {
        const inp = document.querySelector('.quotient-inp[data-i="' + i + '"]');
        if (inp) inp.classList.add("input-error");
      });
      const names = wrong
        .map(function (i) {
          return placeNameForIndex(session.dividendStr.length, i);
        })
        .join(", ");
      document.getElementById("practiceFeedback").innerHTML =
        '<span class="fb-wrong">❌ 틀린 자리: <strong>' + names + "</strong></span>";
      setTimeout(function () {
        document.querySelectorAll(".quotient-inp.input-error").forEach(function (x) {
          x.classList.remove("input-error");
        });
      }, 2000);
      return;
    }
    if (session.finalRemainder > 0) {
      const ri = document.getElementById("remainderInput");
      const v = ri ? parseInt(ri.value.replace(/\D/g, ""), 10) : NaN;
      if (Number.isNaN(v) || v !== session.finalRemainder) {
        const page = document.getElementById("pageRoot");
        if (page) {
          page.classList.remove("shake-anim");
          void page.offsetWidth;
          page.classList.add("shake-anim");
        }
        if (ri) ri.classList.add("input-error");
        document.getElementById("practiceFeedback").innerHTML =
          '<span class="fb-wrong">❌ 몫은 맞아요. <strong>나머지</strong>를 확인해 보세요.</span>';
        return;
      }
    }
    userQuotient = session.steps.map(function (s) {
      return s.quotientDigit;
    });
    currentInputIndex = n;
    remainderSolved = true;
    renderQuotientInputs();
    refreshWorkArea();
    successAll();
  }

  function startPractice() {
    clearFormErrors();
    if (!currentProblem) {
      const p = document.createElement("p");
      p.className = "error-msg form-error";
      p.textContent = "먼저 문제 생성을 눌러 주세요.";
      document.getElementById("divForm").appendChild(p);
      return;
    }
    const st = buildSteps(currentProblem.dividend, currentProblem.divisor);
    if (!st) return;
    session = st;
    userQuotient = session.steps.map(function () {
      return null;
    });
    currentInputIndex = 0;
    remainderSolved = false;

    document.getElementById("practiceCard").classList.remove("hidden");
    applyPracticeGridColumns(st.steps.length, st.divisor);
    updateRemainderTip();
    document.getElementById("remainderBlock").classList.add("hidden");
    document.getElementById("remainderInput").disabled = false;
    document.getElementById("remainderInput").value = "";
    document.getElementById("practiceFeedback").innerHTML = "";

    renderQuotientInputs();
    refreshWorkArea();
    document.getElementById("practiceCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.querySelectorAll(".chip-diff").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setDifficulty(btn.getAttribute("data-diff"));
    });
  });

  document.getElementById("btnGenerateProblem").addEventListener("click", newRandomProblem);

  var btnWorksheet = document.getElementById("btnWorksheet");
  if (btnWorksheet) btnWorksheet.addEventListener("click", openWorksheet);
  var wsClose = document.getElementById("wsClose");
  if (wsClose) wsClose.addEventListener("click", closeWorksheet);
  var wsRefresh = document.getElementById("wsRefresh");
  if (wsRefresh)
    wsRefresh.addEventListener("click", function () {
      var problems = generateUniqueProblems(difficulty, WS_COUNT);
      fillWorksheetSheet(problems);
    });
  var wsPrint = document.getElementById("wsPrint");
  if (wsPrint)
    wsPrint.addEventListener("click", function () {
      window.print();
    });

  var wsOv = document.getElementById("worksheetOverlay");
  if (wsOv)
    wsOv.addEventListener("click", function (e) {
      if (e.target === wsOv) closeWorksheet();
    });
  document.getElementById("divForm").addEventListener("submit", function (e) {
    e.preventDefault();
    startPractice();
  });
  document.getElementById("btnCheckAll").addEventListener("click", checkAllQuotient);
  document.getElementById("btnNewFromPractice").addEventListener("click", function () {
    newRandomProblem();
    document.querySelector(".input-section")?.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("remainderInput").addEventListener("change", checkRemainderInput);
  document.getElementById("remainderInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      checkRemainderInput();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var ov = document.getElementById("worksheetOverlay");
    if (ov && !ov.classList.contains("hidden")) closeWorksheet();
  });

  setDifficulty("easy");
  renderPlaceDemo();
  newRandomProblem();
})();
