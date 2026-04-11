(function () {
  "use strict";

  const PLACE_NAMES = [
    "일의 자리",
    "십의 자리",
    "백의 자리",
    "천의 자리",
    "만의 자리",
  ];

  function placeNameForIndex(strLen, charIndex) {
    const power = strLen - 1 - charIndex;
    return PLACE_NAMES[power] || `${Math.pow(10, power)}의 자리`;
  }

  function renderPlaceDemo() {
    const el = document.getElementById("placeDemo");
    if (!el) return;
    const sample = "528";
    el.innerHTML = sample
      .split("")
      .map((d, i) => {
        const name = placeNameForIndex(sample.length, i);
        return `<div class="place-cell"><div class="digit">${d}</div><div class="name">${name}</div></div>`;
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
      const prevRem = remainder;
      const working = remainder * 10 + parseInt(ch, 10);

      const qDigit = Math.floor(working / divisor);
      const product = qDigit * divisor;
      const newRem = working - product;

      let explanation;
      if (i === 0) {
        explanation = `맨 왼쪽부터 봐요. 숫자 <strong>${ch}</strong>는 <strong>${place}</strong>에 있어요. 아직 내려온 수가 없으니 지금 나누어 보는 수는 <strong>${working}</strong>이에요.`;
      } else {
        explanation = `앞 단계에서 남은 수는 <strong>${prevRem}</strong>이에요. 그 옆 자리 숫자 <strong>${ch}</strong>(<strong>${place}</strong>)를 <strong>내려서 붙이면</strong> 이번에 나누는 수는 <strong>${working}</strong>이에요.`;
      }

      const subExplain =
        qDigit === 0
          ? `<strong>${working}</strong>은 ${divisor}보다 작아요. 그러면 몫에는 <strong>0</strong>을 적고, 다음 자리 숫자를 내려 받아요. (빼기: ${working} − 0 = <strong>${newRem}</strong>)`
          : `<strong>${working}</strong> 안에 ${divisor}이 몇 번 들어가나요? → <strong>${qDigit}번</strong>. (${divisor} × ${qDigit} = ${product}, 빼면 <strong>${newRem}</strong>)`;

      steps.push({
        index: i,
        place,
        digit: ch,
        partial: working,
        quotientDigit: qDigit,
        product,
        remainder: newRem,
        explanation,
        subExplain,
        quotientSoFar: quotientDigits.join("") + String(qDigit),
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

  function renderLongDivision(state, activeStepIndex) {
    const container = document.getElementById("longDivision");
    if (!container || !state) return;

    const { dividendStr, divisor, steps } = state;
    const qRaw = state.quotientStr || String(state.quotient);
    const padQ = Math.max(dividendStr.length - qRaw.length, 0);
    const qDisplay = " ".repeat(padQ) + qRaw;

    const activeDigitIndex =
      activeStepIndex >= 0 && activeStepIndex < steps.length
        ? steps[activeStepIndex].index
        : -1;

    function digitSpans(str, highlightIndex) {
      return str
        .split("")
        .map((c, i) => {
          const cls = i === highlightIndex && c !== " " ? "ld-digit active" : "ld-digit";
          return `<span class="${cls}">${c === " " ? "\u00a0" : c}</span>`;
        })
        .join("");
    }

    const stNow = steps[activeStepIndex];
    const partialNote = stNow
      ? `<p class="ld-caption">이번 단계에서 나누는 수: <strong>${stNow.partial}</strong></p>`
      : "";

    let html = `<div class="ld-main"><div class="ld-bracket"></div><div class="ld-dividend-block">`;
    html += `<div class="ld-row ld-quotient"><span class="ld-label"></span><div class="ld-digits">${digitSpans(qDisplay, activeDigitIndex + padQ)}</div></div>`;
    html += `<div class="ld-row"><span class="ld-label"></span><div class="ld-digits">${digitSpans(dividendStr, activeDigitIndex)}</div></div>`;
    html += `</div></div>`;
    html = `<div class="ld-figure"><div style="display:flex;align-items:flex-start;gap:0.5em;"><span class="ld-divisor">${divisor}</span>${html}</div>${partialNote}</div>`;

    container.innerHTML = html;
  }

  let session = null;
  let stepIdx = 0;
  /** @type {{ dividend: number, divisor: number } | null} */
  let currentProblem = null;

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 피제수 100~99,999, 제수 2~99 (기존 단계별 풀이와 같은 범위)
   */
  function generateRandomProblem() {
    return {
      dividend: randomInt(100, 99999),
      divisor: randomInt(2, 99),
    };
  }

  function updateProblemPreview() {
    const el = document.getElementById("problemPreview");
    if (!el) return;
    el.textContent = currentProblem
      ? currentProblem.dividend + " ÷ " + currentProblem.divisor
      : "";
  }

  function clearResultView() {
    session = null;
    stepIdx = 0;
    const sec = document.getElementById("resultSection");
    if (sec) sec.classList.add("hidden");
  }

  function clearFormErrors() {
    document.querySelectorAll("#divForm .form-error").forEach(function (el) {
      el.remove();
    });
  }

  function newRandomProblem() {
    clearFormErrors();
    currentProblem = generateRandomProblem();
    updateProblemPreview();
    clearResultView();
  }

  function showStep() {
    const panel = document.getElementById("stepPanel");
    const counter = document.getElementById("stepCounter");
    const prev = document.getElementById("prevStep");
    const next = document.getElementById("nextStep");
    const answerLine = document.getElementById("answerLine");

    if (!session || !panel) return;

    const { steps, quotient, finalRemainder, dividend, divisor } = session;
    const st = steps[stepIdx];
    const n = steps.length;

    counter.textContent = `단계 ${stepIdx + 1} / ${n}`;
    prev.disabled = stepIdx === 0;
    next.disabled = stepIdx === n - 1;

    panel.innerHTML = `
      <p class="step-title">${st.place} — ${stepIdx + 1}번째 단계</p>
      <p class="step-text">${st.explanation}</p>
      <p class="step-text">${st.subExplain}</p>
      <p class="step-math">몫 자리까지: ${st.quotientSoFar}</p>
    `;

    if (stepIdx === n - 1) {
      answerLine.innerHTML =
        finalRemainder === 0
          ? `정답: <strong>${dividend} ÷ ${divisor} = ${quotient}</strong> (나머지 0)`
          : `정답: <strong>${dividend} ÷ ${divisor} = ${quotient}</strong> 나머지 <strong>${finalRemainder}</strong>`;
    } else {
      answerLine.textContent = "마지막 단계에서 전체 정답을 확인해요.";
    }

    renderLongDivision(session, stepIdx);
  }

  function runCalculation(dividend, divisor) {
    clearFormErrors();

    if (Number.isNaN(dividend) || Number.isNaN(divisor)) {
      return { error: "숫자를 모두 입력했는지 확인해요." };
    }
    if (!Number.isInteger(dividend) || dividend < 1 || dividend > 99999) {
      return { error: "피제수는 1 이상 99,999 이하인 정수로 입력해요." };
    }
    if (!Number.isInteger(divisor) || divisor < 1 || divisor > 99) {
      return { error: "제수는 1 이상 99 이하인 정수로 입력해요." };
    }

    const state = buildSteps(dividend, divisor);
    if (!state) return { error: "계산을 준비할 수 없어요." };

    session = state;
    stepIdx = 0;

    document.getElementById("resultSection").classList.remove("hidden");
    showStep();
    document.getElementById("resultSection").scrollIntoView({ behavior: "smooth", block: "start" });
    return { ok: true };
  }

  document.getElementById("btnGenerateProblem").addEventListener("click", function () {
    newRandomProblem();
  });

  document.getElementById("divForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!currentProblem) {
      clearFormErrors();
      const p = document.createElement("p");
      p.className = "error-msg form-error";
      p.textContent = "먼저 문제 생성을 눌러 주세요.";
      document.getElementById("divForm").appendChild(p);
      return;
    }

    const result = runCalculation(currentProblem.dividend, currentProblem.divisor);
    if (result.error) {
      const p = document.createElement("p");
      p.className = "error-msg form-error";
      p.textContent = result.error;
      document.getElementById("divForm").appendChild(p);
    }
  });

  document.getElementById("prevStep").addEventListener("click", function () {
    if (stepIdx > 0) {
      stepIdx--;
      showStep();
    }
  });

  document.getElementById("nextStep").addEventListener("click", function () {
    if (session && stepIdx < session.steps.length - 1) {
      stepIdx++;
      showStep();
    }
  });

  renderPlaceDemo();
  newRandomProblem();
})();
