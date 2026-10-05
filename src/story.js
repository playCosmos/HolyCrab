((root, factory) => {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HolyCrabStory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PORTRAITS = {
    ramyani: "./assets/vn/ramyani.png",
    mom: "./assets/vn/mom.png",
    sister: "./assets/vn/sister.png"
  };

  const scene = (speaker, text, opts = {}) => ({
    speaker,
    text,
    portrait: opts.portrait || null,
    side: opts.side || "left",
    kicker: opts.kicker || "",
    summary: opts.summary || null,
    button: opts.button || "다음",
    tone: opts.tone || ""
  });

  function opening() {
    return [
      scene("라먀니", "엄마의 간장게장은 진짜 맛있다. 문제는 레시피를 물어볼 때마다 ‘그냥 감으로 하는 거야’라고만 한다는 것.", {
        portrait: "ramyani", side: "right", kicker: "작전 개시 전"
      }),
      scene("라먀니", "그렇다면 방법은 하나. 10일 동안 집, 전통시장, 단골 반찬가게를 따라다니면서 레시피 조각을 직접 모은다.", {
        portrait: "ramyani", side: "right"
      }),
      scene("라먀니", "이동은 WASD나 방향키. Shift를 누르면 조용히 걷고, E로 메모를 조사하거나 숨거나 아이템을 줍는다.", {
        portrait: "ramyani", side: "right",
        summary: [
          ["이동", "WASD / 방향키"],
          ["은신 이동", "Shift"],
          ["조사·줍기·숨기", "E"],
          ["기록 확인", "Tab"]
        ]
      }),
      scene("라먀니", "매일 맵 어딘가에 아이템이 하나 있다. 포장끈은 1번으로 가까운 엄마를 잠깐 묶고, 담배는 2번으로 잠깐 빨라진다. 둘 다 최대 2개까지 들 수 있고, 담배는 기침 소리가 나는 게 문제지만.", {
        portrait: "ramyani", side: "right",
        summary: [
          ["1 · 포장끈", "가까운 추적자 8초 제압"],
          ["2 · 담배", "7초간 이동 속도 +45%"],
          ["소지 한도", "포장끈 / 담배 각각 2개"],
          ["주의", "담배 사용 중 소음 발생"]
        ]
      }),
      scene("엄마", "라먀니야. 요즘 부엌을 왜 그렇게 자주 들여다보니?", {
        portrait: "mom", side: "left"
      }),
      scene("라먀니", "아무것도 아니야! …좋아. 엄마는 시야와 소리를 기억하고, 내가 사라진 곳 주변까지 다시 뒤진다. 숨었다고 끝이 아니라 수색자가 바로 옆까지 오면 들킬 수 있다. 주변 물건으로 소리를 내 동선을 빼고 움직이자.", {
        portrait: "ramyani", side: "right", button: "DAY 1 시작"
      })
    ];
  }

  function dayIntro(stage) {
    const lines = [
      scene("라먀니", stage.intro, {
        portrait: "ramyani",
        side: "right",
        kicker: `DAY ${stage.day} / ${stage.totalDays} · ${stage.name}`
      })
    ];

    if (stage.day === 5 && stage.sisterActive) {
      lines.push(scene("언니", "요즘 너 왜 이렇게 밖을 들락거려? 귀찮게 수상하네.", {
        portrait: "sister", side: "left", kicker: "새로운 추적자"
      }));
      lines.push(scene("라먀니", "하필 집순이 언니까지 감시를 시작했다. 오늘부터는 엄마와 언니 둘 다 피해야 한다.", {
        portrait: "ramyani", side: "right"
      }));
    } else if (stage.sisterActive) {
      lines.push(scene("라먀니", "오늘도 엄마와 언니 둘 다 있다. 한 명을 피했다고 바로 뛰면 반대쪽에서 걸릴 수 있어.", {
        portrait: "ramyani", side: "right"
      }));
    }

    lines.push(scene("라먀니", `오늘 목표는 ‘${stage.objective}’. 핵심 단서 ${stage.clues.length}개를 찾으면 출구로 빠져나갈 수 있다. 아이템도 하나 숨겨져 있다.`, {
      portrait: "ramyani",
      side: "right",
      summary: [
        ["장소", stage.name],
        ["현장 상태", stage.layoutName || "기본 배치"],
        ["핵심 단서", `${stage.clues.length}개`],
        ["아이템", "맵에 1개 배치"],
        ["가짜 메모", "진행과 무관"]
      ],
      button: "잠입 시작"
    }));

    return lines;
  }

  const CAUGHT_LINES = {
    mom: [
      "라먀니. 지금 부엌에서 뭐 하는 거니?",
      "또 뭔가 찾고 있었지? 손에 든 거 내려놔.",
      "발소리 다 들렸어. 그렇게 살금살금 걸으면 더 수상해."
    ],
    sister: [
      "또 몰래 돌아다니네. 이번엔 뭘 숨기려고?",
      "라먀니, 거기서 멈춰. 너무 티 나거든.",
      "엄마만 피하면 될 줄 알았어? 나도 집에 있거든."
    ]
  };

  function caught(role, totalCaught) {
    const key = role === "sister" ? "sister" : "mom";
    const watcherName = key === "sister" ? "언니" : "엄마";
    const line = CAUGHT_LINES[key][Math.max(0, totalCaught - 1) % CAUGHT_LINES[key].length];

    return [
      scene(watcherName, line, {
        portrait: key, side: "left", kicker: "발각", tone: "caught"
      }),
      scene("라먀니", key === "mom"
        ? "아니, 그게… 냉장고가 나를 불렀달까."
        : "그냥 산책 중이었어. 집 안에서. 아주 자연스럽게.", {
        portrait: "ramyani", side: "right", tone: "caught"
      }),
      scene("SYSTEM", "오늘의 안전한 재진입 지점으로 돌아간다. 이미 확보한 기록과 주운 아이템은 유지된다.", {
        summary: [
          ["누적 발각", `${totalCaught}회`],
          ["기록", "유지"],
          ["인벤토리", "유지"]
        ],
        button: "다시 잠입",
        tone: "caught"
      })
    ];
  }

  function daySummary(data) {
    return [
      scene("라먀니", data.dayCaught === 0
        ? "좋아. 오늘은 깔끔했다. 필요한 것만 챙기고 빠져나왔다."
        : `오늘은 ${data.dayCaught}번이나 걸렸네. 그래도 필요한 건 챙겼으니 됐어.`, {
        portrait: "ramyani", side: "right", kicker: `DAY ${data.day} 결산`, tone: "summary"
      }),
      scene("SYSTEM", "오늘의 잠입 기록", {
        summary: [
          ["장소", data.location],
          ["핵심 단서", `${data.cluesFound}/${data.clueTotal}`],
          ["쓸모없는 메모", `${data.decoysFound}개`],
          ["아이템", data.itemPicked ? `${data.itemName} 획득` : "놓침"],
          ["오늘 발각", `${data.dayCaught}회`]
        ],
        button: data.day >= 9 ? "최종일로" : "다음 날",
        tone: "summary"
      })
    ];
  }

  function ending(data) {
    const lines = [
      scene("라먀니", "찾았다. 이게 진짜 원본 레시피네. 이제 아무 일도 없었던 것처럼 나가면—", {
        portrait: "ramyani", side: "right", kicker: "DAY 10 · 최종 작전", tone: "ending"
      }),
      scene("엄마", "그걸 찾으려고 열흘이나 돌아다녔니?", {
        portrait: "mom", side: "left", tone: "ending"
      })
    ];

    if (data.sisterSeen) {
      lines.push(scene("언니", "그러니까 그냥 물어보라고 했잖아. …아니, 사실 안 물어봐서 좀 재밌긴 했어.", {
        portrait: "sister", side: "left", tone: "ending"
      }));
    }

    lines.push(scene("SYSTEM", "10일간의 레시피 탈취 작전 종료", {
      summary: [
        ["작전 등급", `${data.rank} · ${data.label}`],
        ["전체 시간", data.time],
        ["누적 발각", `${data.caught}회`],
        ["결과", "원본 레시피 확보"]
      ],
      button: "결과 보기",
      tone: "ending"
    }));
    return lines;
  }

  return { PORTRAITS, opening, dayIntro, caught, daySummary, ending };
});