(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HolyCrabStages = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const homeWalls = [
    { x: 430, y: 14, w: 18, h: 258 },
    { x: 430, y: 398, w: 18, h: 398 },
    { x: 960, y: 14, w: 18, h: 206 },
    { x: 960, y: 350, w: 18, h: 446 }
  ];

  const homeFurniture = [
    { x: 58, y: 92, w: 280, h: 132, kind: "bed", label: "침대" },
    { x: 62, y: 438, w: 136, h: 88, kind: "wardrobe", label: "옷장" },
    { x: 272, y: 520, w: 118, h: 70, kind: "desk", label: "책상" },
    { x: 560, y: 118, w: 250, h: 92, kind: "sofa", label: "소파" },
    { x: 640, y: 350, w: 190, h: 106, kind: "table", label: "테이블" },
    { x: 520, y: 540, w: 190, h: 54, kind: "tv", label: "TV" },
    { x: 1030, y: 52, w: 328, h: 66, kind: "counter", label: "조리대" },
    { x: 1080, y: 330, w: 240, h: 102, kind: "island", label: "아일랜드" },
    { x: 1340, y: 130, w: 64, h: 170, kind: "fridge", label: "냉장고" },
    { x: 1030, y: 548, w: 124, h: 92, kind: "pantry", label: "찬장" },
    { x: 1210, y: 564, w: 116, h: 62, kind: "drawer", label: "서랍장" }
  ];

  const homeZones = [
    { x: 20, y: 20, w: 410, h: 770, label: "라먀니의 방", tone: "#2b2531" },
    { x: 448, y: 20, w: 512, h: 770, label: "거실", tone: "#2d272d" },
    { x: 978, y: 20, w: 442, h: 770, label: "부엌", tone: "#302629" }
  ];

  const homePatrol = [
    { x: 600, y: 300, pause: .7, look: .65 },
    { x: 850, y: 300, pause: .35, look: -.55 },
    { x: 1040, y: 280, pause: .75, look: .8 },
    { x: 1240, y: 200, pause: .5, look: -.5 },
    { x: 1380, y: 260, pause: .35, look: .65 },
    { x: 1380, y: 480, pause: .45, look: -.7 },
    { x: 1240, y: 470, pause: .6, look: .65 },
    { x: 1035, y: 460, pause: .45, look: -.5 },
    { x: 1035, y: 300, pause: .55, look: .65 },
    { x: 900, y: 300, pause: .25, look: -.5 },
    { x: 900, y: 650, pause: .6, look: .6 },
    { x: 600, y: 650, pause: .35, look: -.45 },
    { x: 520, y: 480, pause: .35, look: .55 },
    { x: 520, y: 300, pause: .45, look: -.5 }
  ];

  const stages = [
    {
      id: "home-prelude",
      name: "우리 집 · 새벽",
      kicker: "STAGE 1 / 4",
      introTitle: "장보기 메모를 쫓아라",
      intro: "레시피 원본은 보이지 않는다. 대신 엄마가 내일 어디에서 재료를 사는지부터 알아내자. 거실과 부엌을 뒤져 장보기 단서를 찾고 현관으로 빠져나가면 된다.",
      objective: "장보기 단서 찾기",
      clearText: "엄마의 장보기 루트를 확보했다. 다음 목적지는 전통시장.",
      palette: { bg: "#17131b", grid: "rgba(255,255,255,.035)", wall: "#17131a", accent: "#f2ae73" },
      zones: homeZones,
      walls: homeWalls,
      furniture: homeFurniture,
      spawn: { x: 228, y: 340 },
      momSpawn: { x: 600, y: 300, angle: 0 },
      patrol: homePatrol,
      ai: { visionRange: 250, fov: 1.18, patrolSpeed: 80, investigateSpeed: 102, chaseSpeed: 128, hearing: 1.0 },
      clues: [
        { id: "shopping-route", x: 500, y: 82, title: "식탁 옆 장보기 메모", text: "전통시장 꽃게집 → 채소 좌판 → 장류 가게. 엄마의 내일 동선이 적혀 있다." },
        { id: "mom-phone", x: 856, y: 92, title: "엄마 휴대폰 알림", text: "‘꽃게는 아침 일찍. 그다음 반찬가게 사장님께 간장 배합 다시 물어보기.’" }
      ],
      hideSpots: [
        { id: "wardrobe-hide", x: 215, y: 484, label: "옷장에 숨기" },
        { id: "sofa-hide", x: 835, y: 170, label: "소파 뒤에 숨기" },
        { id: "island-hide", x: 1060, y: 382, label: "아일랜드 뒤에 숨기" }
      ],
      distractions: [
        { id: "tv-noise", x: 740, y: 570, label: "TV 리모컨으로 소리 내기", radius: 470 },
        { id: "microwave-noise", x: 1018, y: 150, label: "전자레인지 알림음 내기", radius: 430 }
      ],
      exit: { x: 730, y: 774, label: "현관으로 나가기" }
    },
    {
      id: "traditional-market",
      name: "전통시장 · 아침",
      kicker: "STAGE 2 / 4",
      introTitle: "엄마의 장바구니를 미행하라",
      intro: "엄마는 꽃게와 향채, 간장을 따로 고른다. 사람 많은 시장에서는 시야가 자주 끊기지만 소리는 더 잘 묻힌다. 엄마의 동선을 따라 세 가지 재료 단서를 확보하자.",
      objective: "시장 재료 단서 모으기",
      clearText: "재료 조합은 확보했다. 엄마가 향한 곳은 단골 반찬가게다.",
      palette: { bg: "#1c1714", grid: "rgba(255,242,211,.04)", wall: "#251b17", accent: "#e7b85f" },
      zones: [
        { x: 20, y: 20, w: 1400, h: 770, label: "새벽시장 골목", tone: "#35281f" }
      ],
      walls: [
        { x: 14, y: 14, w: 1412, h: 18 }, { x: 14, y: 778, w: 1412, h: 18 },
        { x: 14, y: 14, w: 18, h: 782 }, { x: 1408, y: 14, w: 18, h: 782 }
      ],
      furniture: [
        { x: 90, y: 80, w: 260, h: 140, kind: "stall-crab", label: "꽃게 좌판", color: "#6c5d56" },
        { x: 430, y: 74, w: 250, h: 130, kind: "stall-veg", label: "채소 좌판", color: "#5c6649" },
        { x: 790, y: 78, w: 240, h: 132, kind: "stall-soy", label: "장류 가게", color: "#72513d" },
        { x: 1130, y: 82, w: 210, h: 130, kind: "stall-fish", label: "생선 좌판", color: "#4f6269" },
        { x: 118, y: 560, w: 210, h: 120, kind: "stall-fruit", label: "과일 좌판", color: "#6e5d43" },
        { x: 428, y: 570, w: 220, h: 110, kind: "stall-snack", label: "분식", color: "#704b48" },
        { x: 790, y: 560, w: 260, h: 120, kind: "stall-dry", label: "건어물", color: "#75694d" },
        { x: 1160, y: 556, w: 170, h: 120, kind: "stall-box", label: "박스 더미", color: "#665343" }
      ],
      spawn: { x: 70, y: 405 },
      momSpawn: { x: 370, y: 390, angle: 0 },
      patrol: [
        { x: 375, y: 390, pause: .5, look: -.4 },
        { x: 218, y: 286, pause: 1.15, look: -.8 },
        { x: 540, y: 290, pause: .9, look: .7 },
        { x: 900, y: 290, pause: 1.1, look: -.65 },
        { x: 1230, y: 295, pause: .65, look: .55 },
        { x: 1315, y: 405, pause: .4, look: -.6 },
        { x: 1215, y: 490, pause: .3, look: .55 },
        { x: 910, y: 480, pause: .7, look: -.55 },
        { x: 550, y: 480, pause: .55, look: .6 },
        { x: 250, y: 475, pause: .45, look: -.55 }
      ],
      ai: { visionRange: 235, fov: 1.08, patrolSpeed: 88, investigateSpeed: 112, chaseSpeed: 136, hearing: .8 },
      clues: [
        { id: "market-crab", x: 365, y: 185, title: "꽃게집 포장지", text: "간장게장용은 선도가 우선. 살이 단단하고 상태 좋은 꽃게를 고른다." },
        { id: "market-aromatics", x: 690, y: 236, title: "채소 상인의 묶음", text: "양파 · 대파 · 마늘 · 생강. 엄마가 늘 같은 향채 묶음을 산다." },
        { id: "market-soy", x: 1034, y: 184, title: "장류 가게 메모", text: "엄마 주문: 진간장과 물은 같은 양에서 시작하고, 맛은 향채와 단맛으로 조정." }
      ],
      hideSpots: [
        { id: "crate-west", x: 64, y: 640, label: "박스 뒤에 숨기" },
        { id: "stall-center", x: 720, y: 110, label: "좌판 천막 뒤에 숨기" },
        { id: "crate-east", x: 1368, y: 620, label: "상자 더미에 숨기" }
      ],
      distractions: [
        { id: "market-bell", x: 720, y: 400, label: "가게 종 울리기", radius: 520 },
        { id: "rolling-can", x: 1080, y: 470, label: "빈 통 굴리기", radius: 420 },
        { id: "speaker", x: 390, y: 500, label: "시장 방송 버튼 건드리기", radius: 560 }
      ],
      exit: { x: 1374, y: 405, label: "시장 출구로 빠져나가기" }
    },
    {
      id: "banchan-shop",
      name: "단골 반찬가게 · 오후",
      kicker: "STAGE 3 / 4",
      introTitle: "비법의 조리 순서를 훔쳐보자",
      intro: "엄마가 오래 아는 반찬가게 사장님과 배합 이야기를 나눈다. 좁은 가게라 엄마의 시야가 자주 겹친다. 진열대와 뒷주방을 오가며 숙성과 간장물 처리법을 기록하자.",
      objective: "조리법 단서 모으기",
      clearText: "이제 조리 순서까지 맞춰졌다. 원본 레시피만 확인하면 된다. 밤에 다시 집으로.",
      palette: { bg: "#171516", grid: "rgba(255,255,255,.035)", wall: "#211b1c", accent: "#eaa26d" },
      zones: [
        { x: 20, y: 20, w: 900, h: 770, label: "판매대", tone: "#362d2b" },
        { x: 938, y: 20, w: 482, h: 770, label: "뒷주방", tone: "#2c3030" }
      ],
      walls: [
        { x: 920, y: 14, w: 18, h: 300 },
        { x: 920, y: 430, w: 18, h: 366 }
      ],
      furniture: [
        { x: 70, y: 82, w: 320, h: 115, kind: "display", label: "반찬 냉장 진열대", color: "#57656a" },
        { x: 500, y: 80, w: 300, h: 112, kind: "display", label: "반찬 진열대", color: "#5d6264" },
        { x: 120, y: 360, w: 250, h: 100, kind: "counter", label: "계산대", color: "#654b40" },
        { x: 500, y: 340, w: 250, h: 120, kind: "shelf", label: "포장 선반", color: "#5b4841" },
        { x: 990, y: 70, w: 340, h: 80, kind: "prep", label: "조리대", color: "#5f6464" },
        { x: 1010, y: 315, w: 180, h: 100, kind: "pot", label: "간장 솥", color: "#574b49" },
        { x: 1240, y: 300, w: 130, h: 120, kind: "fridge", label: "숙성 냉장고", color: "#62686d" },
        { x: 1010, y: 590, w: 220, h: 80, kind: "shelf", label: "양념 선반", color: "#665048" }
      ],
      spawn: { x: 90, y: 700 },
      momSpawn: { x: 450, y: 640, angle: -1.2 },
      patrol: [
        { x: 450, y: 640, pause: .4, look: .55 },
        { x: 270, y: 545, pause: .55, look: -.75 },
        { x: 440, y: 270, pause: .9, look: .65 },
        { x: 820, y: 255, pause: .5, look: -.55 },
        { x: 970, y: 370, pause: .35, look: .6 },
        { x: 1190, y: 230, pause: 1.0, look: -.75 },
        { x: 1360, y: 500, pause: .45, look: .55 },
        { x: 1120, y: 520, pause: 1.15, look: -.65 },
        { x: 970, y: 410, pause: .4, look: .5 },
        { x: 800, y: 550, pause: .45, look: -.5 }
      ],
      ai: { visionRange: 270, fov: 1.22, patrolSpeed: 84, investigateSpeed: 110, chaseSpeed: 138, hearing: 1.12 },
      clues: [
        { id: "shop-sweet", x: 825, y: 108, title: "시식표 뒤 메모", text: "설탕만 세게 쓰지 않고 매실청을 섞어 단맛을 둥글게 잡는다." },
        { id: "shop-cool", x: 1110, y: 170, title: "뒷주방 작업표", text: "간장물과 향채를 끓여 우린 다음, 게에 붓기 전 반드시 완전히 식힌다." },
        { id: "shop-aging", x: 1380, y: 355, title: "숙성 냉장고 라벨", text: "1차 숙성 기준 24시간. 이후 게와 간장물을 분리한다." }
      ],
      hideSpots: [
        { id: "display-hide", x: 414, y: 120, label: "진열대 끝에 몸 숨기기" },
        { id: "counter-hide", x: 390, y: 410, label: "계산대 뒤에 숨기" },
        { id: "kitchen-hide", x: 1365, y: 650, label: "박스 뒤에 숨기" }
      ],
      distractions: [
        { id: "door-chime", x: 80, y: 250, label: "출입문 차임 울리기", radius: 460 },
        { id: "timer", x: 965, y: 190, label: "주방 타이머 울리기", radius: 520 },
        { id: "tray", x: 820, y: 625, label: "빈 쟁반 건드리기", radius: 450 }
      ],
      exit: { x: 75, y: 760, label: "가게에서 빠져나가기" }
    },
    {
      id: "home-finale",
      name: "우리 집 · 최종 작전",
      kicker: "STAGE 4 / 4",
      introTitle: "원본 레시피를 훔쳐라",
      intro: "시장과 반찬가게에서 모은 정보는 거의 완성됐다. 마지막으로 엄마가 감춰 둔 원본 메모를 찾아 비밀 레시피 상자를 해독하고 현관으로 탈출하자. 엄마도 이제 라먀니를 꽤 의심하고 있다.",
      objective: "최종 레시피 단서 찾기",
      clearText: "레시피 확보 완료. 현관까지 가면 작전 성공.",
      palette: { bg: "#141118", grid: "rgba(255,255,255,.03)", wall: "#151218", accent: "#f18d72" },
      zones: homeZones,
      walls: homeWalls,
      furniture: homeFurniture,
      spawn: { x: 228, y: 340 },
      momSpawn: { x: 860, y: 640, angle: -1.4 },
      patrol: homePatrol.slice().reverse(),
      ai: { visionRange: 285, fov: 1.3, patrolSpeed: 92, investigateSpeed: 120, chaseSpeed: 148, hearing: 1.2 },
      clues: [
        { id: "final-calendar", x: 500, y: 82, title: "달력 뒤 진짜 메모", text: "기본 간장물은 진간장 : 물 = 1 : 1에서 시작." },
        { id: "final-fridge", x: 1314, y: 318, title: "냉장고 자석 메모", text: "매실청은 단맛과 향을 둥글게 만드는 보조. 간장물은 반드시 식혀서 사용." },
        { id: "final-pantry", x: 1185, y: 676, title: "찬장 안쪽 낙서", text: "양파 · 대파 · 마늘 · 생강을 간장물과 함께 끓여 향을 충분히 우린다." },
        { id: "final-drawer", x: 1360, y: 600, title: "비밀 서랍의 마지막 쪽지", text: "1차 24시간 뒤 게를 건지고 간장물을 다시 끓인다. 완전히 식힌 뒤 다시 부어 2차 숙성." }
      ],
      hideSpots: [
        { id: "wardrobe-hide-final", x: 215, y: 484, label: "옷장에 숨기" },
        { id: "sofa-hide-final", x: 835, y: 170, label: "소파 뒤에 숨기" },
        { id: "island-hide-final", x: 1060, y: 382, label: "아일랜드 뒤에 숨기" }
      ],
      distractions: [
        { id: "tv-noise-final", x: 740, y: 570, label: "TV 소리 내기", radius: 455 },
        { id: "phone-noise-final", x: 856, y: 92, label: "휴대폰 진동 울리기", radius: 390 },
        { id: "microwave-noise-final", x: 1018, y: 150, label: "전자레인지 알림음 내기", radius: 430 }
      ],
      safe: { x: 1392, y: 690, label: "비밀 레시피 상자 열기" },
      exit: { x: 730, y: 774, label: "레시피를 들고 탈출" }
    }
  ];

  const finalPuzzle = [
    {
      q: "1. 엄마가 시장에서 고른 간장물의 시작 비율은?",
      options: ["간장 1 : 물 1", "간장 2 : 물 1", "간장 1 : 물 2", "물 없이 간장만"],
      answer: 0
    },
    {
      q: "2. 간장물을 게에 붓기 전에 해야 하는 일은?",
      options: ["뜨거울 때 바로 붓기", "완전히 식히기", "얼리기", "기름 섞기"],
      answer: 1
    },
    {
      q: "3. 1차 숙성의 기준 시간은?",
      options: ["6시간", "12시간", "24시간", "72시간"],
      answer: 2
    },
    {
      q: "4. 1차 숙성 뒤 원본 메모의 순서는?",
      options: [
        "그대로 계속 둔다",
        "게를 건지고 간장물을 다시 끓여 식힌 뒤 2차 숙성",
        "게만 씻어서 다시 넣는다",
        "물을 더 붓고 즉시 먹는다"
      ],
      answer: 1
    }
  ];

  function validateStage(stage) {
    const required = ["id", "name", "spawn", "momSpawn", "patrol", "clues", "exit"];
    for (const key of required) {
      if (stage[key] == null) return { ok: false, reason: `missing ${key}` };
    }
    if (!Array.isArray(stage.patrol) || stage.patrol.length < 2) return { ok: false, reason: "patrol too short" };
    if (!Array.isArray(stage.clues) || stage.clues.length < 1) return { ok: false, reason: "no clues" };
    return { ok: true };
  }

  return { stages, finalPuzzle, validateStage };
});
