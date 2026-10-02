(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HolyCrabStages = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const clone = value => JSON.parse(JSON.stringify(value));

  function hashSeed(value) {
    let h = 2166136261 >>> 0;
    const s = String(value);
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  const HOME_WALLS = [
    { x: 430, y: 14, w: 18, h: 258 },
    { x: 430, y: 398, w: 18, h: 398 },
    { x: 960, y: 14, w: 18, h: 206 },
    { x: 960, y: 350, w: 18, h: 446 }
  ];

  const HOME_FURNITURE = [
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

  const HOME_PATROL = [
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

  const DECOY_POOLS = {
    home: [
      { id: "home-v0-fake-ratio", visit: 0, x: 366, y: 350, title: "찢어진 조리 메모", text: "간장 2 : 물 1. 진하게 해야 맛있다?", resolvesWith: ["market-soy-ratio", "final-ratio"] },
      { id: "home-v0-grocery-noise", visit: 0, x: 760, y: 255, title: "냉장고 옆 장보기 쪽지", text: "우유, 계란, 휴지, 고양이 간식. 레시피와는 관계가 없어 보이지만 일단 적어 둔다.", flavor: true },
      { id: "home-v0-old-print", visit: 0, x: 1006, y: 510, title: "인터넷 레시피 출력물", text: "탄산음료를 조금 넣으면 감칠맛이 난다는 낡은 출력물. 엄마가 실제로 쓰는지는 알 수 없다.", flavor: true },
      { id: "home-v0-sister-note", visit: 0, x: 390, y: 650, title: "언니의 야식 메모", text: "‘내 푸딩 먹지 마.’ 중요한 암호처럼 보였지만 그냥 푸딩 얘기다.", flavor: true },

      { id: "home-v1-fake-aging", visit: 1, x: 365, y: 332, title: "낡은 타이머 메모", text: "‘6시간이면 충분.’ 무엇을 재는 시간인지는 적혀 있지 않다.", resolvesWith: ["home-first-rest", "shop-aging", "final-rest"] },
      { id: "home-v1-fake-aroma", visit: 1, x: 905, y: 520, title: "재료 수정 흔적", text: "생강 X, 마늘만 많이? 연필로 여러 번 지웠다 쓴 흔적이 있다.", resolvesWith: ["home-aromatics", "market-aromatics"] },
      { id: "home-v1-delivery", visit: 1, x: 1010, y: 280, title: "택배 도착 메모", text: "수건 4장, 세제 리필 2개. 부엌에 붙어 있어서 괜히 수상해 보인다.", flavor: true },
      { id: "home-v1-sticky", visit: 1, x: 735, y: 650, title: "정체불명 포스트잇", text: "‘다음에는 3번 먼저.’ 무엇의 3번인지는 아무도 적지 않았다.", flavor: true },

      { id: "home-v2-fake-reboil", visit: 2, x: 980, y: 515, title: "버린 조리 초안", text: "1차 뒤에는 끓이지 말 것. 그대로 다시 붓기. 옆에 크게 X 표시가 그어져 있다.", resolvesWith: ["home-reboil", "shop-reboil", "final-rest"] },
      { id: "home-v2-fake-sweet", visit: 2, x: 785, y: 255, title: "설탕 비율 메모", text: "‘설탕만 두 배.’ 필체가 엄마 것과 조금 다르다.", resolvesWith: ["home-sweetener", "shop-sweet"] },
      { id: "home-v2-calendar-noise", visit: 2, x: 350, y: 650, title: "달력 낙서", text: "치과 4시, 분리수거 목요일, 드라마 마지막 회. 매우 자세하지만 게장은 없다.", flavor: true },
      { id: "home-v2-code-noise", visit: 2, x: 1040, y: 255, title: "숫자만 적힌 쪽지", text: "7-2-9-4. 비밀번호 같지만 어디에도 맞지 않는다.", flavor: true }
    ],

    market: [
      { id: "market-v0-fake-ratio", visit: 0, x: 390, y: 405, title: "장류 가게 홍보 전단", text: "업소용 초간단 비율: 간장 3 : 물 1. 엄마가 이 전단을 보고 산 건지는 불명.", resolvesWith: ["market-soy-ratio", "final-ratio"] },
      { id: "market-v0-fake-crab", visit: 0, x: 720, y: 520, title: "옆 가게 홍보 문구", text: "‘아무 꽃게나 양념만 세면 된다!’ 너무 자신만만한 문구다.", resolvesWith: ["market-crab"] },
      { id: "market-v0-parking", visit: 0, x: 1080, y: 420, title: "주차 확인증", text: "2시간 무료 주차. 뒷면까지 확인했지만 아무것도 없다.", flavor: true },
      { id: "market-v0-lottery", visit: 0, x: 1340, y: 340, title: "시장 경품권", text: "도장 8개를 모으면 장바구니 증정. 레시피 조각은 아니다.", flavor: true },

      { id: "market-v1-fake-aroma", visit: 1, x: 380, y: 405, title: "채소가게 추천표", text: "게장에는 생강 대신 고수? 사장님의 실험 메뉴 추천인 듯하다.", resolvesWith: ["market-aromatics", "home-aromatics"] },
      { id: "market-v1-fake-sweet", visit: 1, x: 710, y: 515, title: "시럽 판촉 카드", text: "‘설탕만 쓰면 충분!’ 특정 상품 광고 문구라 신뢰하기 어렵다.", resolvesWith: ["market-maesil", "home-sweetener", "shop-sweet"] },
      { id: "market-v1-delivery", visit: 1, x: 1080, y: 420, title: "상인 배송 목록", text: "멸치 3박스, 김 5묶음, 종이컵 2줄. 엄마 주문은 아니다.", flavor: true },
      { id: "market-v1-phone", visit: 1, x: 1338, y: 340, title: "분실물 연락처", text: "‘빨간 우산 주인 010-XXXX…’. 수상해 보였지만 정말 분실물 메모다.", flavor: true },

      { id: "market-v2-fake-salt", visit: 2, x: 390, y: 405, title: "소금가게 메모", text: "소금을 한 줌 넣으면 간장이 덜 짜진다? 무슨 뜻인지 앞뒤가 맞지 않는다.", resolvesWith: ["market-balance", "final-ratio"] },
      { id: "market-v2-fake-fruit", visit: 2, x: 720, y: 520, title: "과일청 홍보 카드", text: "사과청만 넣으면 다른 단맛 재료는 필요 없다는 광고 문구.", resolvesWith: ["market-maesil", "shop-sweet"] },
      { id: "market-v2-receipt", visit: 2, x: 1080, y: 420, title: "남의 영수증", text: "두부, 파, 꽁치, 고무장갑. 엄마 장바구니와 상관없는 영수증이다.", flavor: true },
      { id: "market-v2-event", visit: 2, x: 1340, y: 340, title: "시장 노래자랑 안내", text: "예선 접수 오후 3시. 레시피 암호처럼 보이는 숫자는 참가 번호였다.", flavor: true },

      { id: "market-v3-fake-crab", visit: 3, x: 390, y: 405, title: "냉동 꽃게 특가표", text: "게장은 무조건 냉동 꽃게가 낫다는 과장된 특가 문구.", resolvesWith: ["market-crab", "market-freshness"] },
      { id: "market-v3-fake-ratio", visit: 3, x: 720, y: 520, title: "옆집 간장소스 비율", text: "간장 1 : 물 3. 게장이 아니라 불고기 소스 비율인 것 같다.", resolvesWith: ["market-soy-ratio", "final-ratio"] },
      { id: "market-v3-number", visit: 3, x: 1080, y: 420, title: "상자에 적힌 숫자", text: "24 / 12 / 8. 숙성 시간처럼 보였지만 박스 수량 표시다.", flavor: true },
      { id: "market-v3-coupon", visit: 3, x: 1340, y: 340, title: "단골 쿠폰", text: "열 번 사면 한 번 할인. 엄마가 오래 다닌 가게라는 것만 알 수 있다.", flavor: true }
    ],

    banchan: [
      { id: "shop-v0-fake-cool", visit: 0, x: 430, y: 250, title: "오래된 교육용 메모", text: "간장물은 뜨거울 때 바로 부으면 잘 밴다? 날짜가 몇 년 전이다.", resolvesWith: ["shop-cool", "final-cool"] },
      { id: "shop-v0-fake-sweet", visit: 0, x: 820, y: 500, title: "직원용 단맛 메모", text: "설탕만 사용. 매실청 금지. 옆에 ‘폐기 레시피’라는 글자가 반쯤 찢겨 있다.", resolvesWith: ["shop-sweet", "home-sweetener"] },
      { id: "shop-v0-order", visit: 0, x: 960, y: 500, title: "반찬 주문표", text: "멸치볶음 2, 진미채 1, 계란말이 2. 게장 주문은 없다.", flavor: true },
      { id: "shop-v0-cleaning", visit: 0, x: 1320, y: 210, title: "마감 청소 순서", text: "바닥 → 냉장고 손잡이 → 계산대. 조리 순서처럼 보여 잠깐 헷갈린다.", flavor: true },

      { id: "shop-v1-fake-aging", visit: 1, x: 430, y: 250, title: "구형 숙성 라벨", text: "12시간 / 테스트 배치. 지금도 쓰는 기준인지는 알 수 없다.", resolvesWith: ["shop-aging", "home-first-rest", "final-rest"] },
      { id: "shop-v1-fake-reboil", visit: 1, x: 820, y: 500, title: "실험 배치 체크표", text: "간장 재가열 생략. 결과 칸에는 ‘별로’라고 적혀 있다.", resolvesWith: ["shop-reboil", "home-reboil", "final-rest"] },
      { id: "shop-v1-staff", visit: 1, x: 960, y: 500, title: "직원 교대표", text: "화요일 오후: 민지, 수요일 오전: 사장님. 레시피 암호는 아니었다.", flavor: true },
      { id: "shop-v1-price", visit: 1, x: 1320, y: 210, title: "가격 수정표", text: "오징어젓 +500원, 깻잎무침 +300원. 숫자가 많아 괜히 중요한 문서처럼 보인다.", flavor: true },

      { id: "shop-v2-fake-rest", visit: 2, x: 430, y: 250, title: "다른 절임반찬 작업표", text: "숙성 8시간. 간장게장 표가 아니라 장아찌 작업표였다.", resolvesWith: ["shop-aging", "final-rest"] },
      { id: "shop-v2-fake-cool", visit: 2, x: 820, y: 500, title: "급속 작업 메모", text: "끓인 소스를 바로 사용. 옆 칸 품목은 닭강정이다.", resolvesWith: ["shop-cool", "final-cool"] },
      { id: "shop-v2-supply", visit: 2, x: 960, y: 500, title: "포장용기 발주서", text: "대 100개, 중 200개, 소 100개. 중요한 비율처럼 보이는 숫자뿐이다.", flavor: true },
      { id: "shop-v2-lunch", visit: 2, x: 1320, y: 210, title: "직원 점심 메모", text: "오늘은 김치찌개. 사장님은 계란 추가.", flavor: true },

      { id: "shop-v3-fake-reboil", visit: 3, x: 430, y: 250, title: "폐기된 실험표", text: "재가열 세 번. 결과 칸에는 ‘향 다 날아감’이라고 적혀 있다.", resolvesWith: ["shop-reboil", "final-rest"] },
      { id: "shop-v3-fake-sweet", visit: 3, x: 820, y: 500, title: "신메뉴 테스트표", text: "꿀만 사용. 간장게장이 아니라 연근조림 테스트표다.", resolvesWith: ["shop-sweet", "home-sweetener"] },
      { id: "shop-v3-temp", visit: 3, x: 960, y: 500, title: "냉장고 점검표", text: "3℃, 4℃, 3℃, 4℃. 레시피 숫자가 아니라 기기 점검 기록이다.", flavor: true },
      { id: "shop-v3-call", visit: 3, x: 1320, y: 210, title: "전화 받을 사람", text: "세탁소, 거래처, 언니. 마지막 이름 때문에 괜히 신경 쓰인다.", flavor: true }
    ]
  };

  const FINAL_DECOYS = [
    { id: "final-decoy-ratio", x: 365, y: 340, title: "엄마 필체를 흉내 낸 쪽지", text: "간장 2 : 물 1. 아래쪽 필압이 평소와 다르다.", resolvesWith: ["final-ratio"] },
    { id: "final-decoy-aging", x: 780, y: 260, title: "오래된 게장 실험표", text: "12시간 숙성. 우측 상단에 ‘실패’ 도장이 희미하게 남아 있다.", resolvesWith: ["final-rest"] },
    { id: "final-decoy-cool", x: 1010, y: 500, title: "찢어진 조리 메모", text: "끓인 뒤 바로 붓기. 뒷면에는 다른 사람의 필기가 이어진다.", resolvesWith: ["final-cool"] },
    { id: "final-decoy-nonsense", x: 760, y: 650, title: "엄마의 진짜 비밀 메모?", text: "‘라먀니가 또 뒤지면 김치통부터 확인할 것.’ 레시피 대신 라먀니 얘기다.", flavor: true }
  ];

  function pickDecoys(locationKey, visitIndex, day, rng) {
    const pool = (DECOY_POOLS[locationKey] || []).filter(x => x.visit === visitIndex);
    const count = Math.min(pool.length, day >= 5 ? 3 : 2);
    return shuffle(pool, rng).slice(0, count).map(x => {
      const out = clone(x);
      delete out.visit;
      return out;
    });
  }

  const ITEM_SLOTS = {
    home: [
      { x: 250, y: 340 }, { x: 720, y: 270 }, { x: 860, y: 650 }, { x: 1260, y: 500 }
    ],
    market: [
      { x: 390, y: 400 }, { x: 720, y: 400 }, { x: 1080, y: 400 }, { x: 1350, y: 400 }
    ],
    banchan: [
      { x: 430, y: 250 }, { x: 820, y: 520 }, { x: 970, y: 220 }, { x: 1320, y: 520 }
    ]
  };

  function makeItems(locationKey, day, rng, final = false) {
    const slots = shuffle(ITEM_SLOTS[locationKey] || [], rng);
    const type = day % 2 === 1 ? "binding" : "cigarette";
    const slot = slots[0] || { x: 720, y: 400 };

    return [{
      id: `daily-item-${day}-${locationKey}-${type}`,
      type,
      x: slot.x,
      y: slot.y,
      title: type === "binding" ? "포장끈" : "담배",
      text: type === "binding"
        ? "오늘 지급품. 가까운 엄마나 언니 한 명을 잠시 묶어 움직이지 못하게 한다."
        : "오늘 지급품. 잠시 이동 속도가 크게 오른다. 대신 피울 때 기침 소리가 난다."
    }];
  }

  const LOCATIONS = {
    home: {
      key: "home",
      name: "우리 집",
      timeNames: ["새벽", "저녁", "깊은 밤"],
      palette: { bg: "#17131b", grid: "rgba(255,255,255,.035)", wall: "#17131a", accent: "#f2ae73" },
      zones: [
        { x: 20, y: 20, w: 410, h: 770, label: "라먀니의 방", tone: "#2b2531" },
        { x: 448, y: 20, w: 512, h: 770, label: "거실", tone: "#2d272d" },
        { x: 978, y: 20, w: 442, h: 770, label: "부엌", tone: "#302629" }
      ],
      walls: HOME_WALLS,
      furniture: HOME_FURNITURE,
      spawn: { x: 228, y: 340 },
      momSpawn: { x: 600, y: 300, angle: 0 },
      sisterSpawn: { x: 1040, y: 650, angle: -1.2 },
      patrolMom: HOME_PATROL,
      patrolSister: HOME_PATROL.slice().reverse(),
      hideSpots: [
        { id: "home-wardrobe", x: 215, y: 484, label: "옷장에 숨기" },
        { id: "home-sofa", x: 835, y: 170, label: "소파 뒤에 숨기" },
        { id: "home-island", x: 1060, y: 382, label: "아일랜드 뒤에 숨기" }
      ],
      distractions: [
        { id: "home-tv", x: 740, y: 570, label: "TV 소리 내기", radius: 470 },
        { id: "home-phone", x: 856, y: 92, label: "휴대폰 진동 울리기", radius: 385 },
        { id: "home-microwave", x: 1018, y: 150, label: "전자레인지 알림음 내기", radius: 430 }
      ],
      exit: { x: 730, y: 774, label: "현관으로 나가기" },
      visits: [
        {
          title: "장보기 흔적부터 찾아라",
          intro: "첫날은 레시피보다 엄마의 동선을 훔친다. 내일 어디로 가는지 알아내면 다음 조각을 따라갈 수 있다.",
          objective: "엄마의 장보기 동선 찾기",
          clues: [
            { id: "home-route-note", x: 500, y: 82, title: "장보기 메모", text: "전통시장 꽃게집 → 채소 좌판 → 장류 가게. 엄마의 익숙한 순서가 적혀 있다." },
            { id: "home-banchan-call", x: 856, y: 92, title: "통화 기록 메모", text: "‘반찬가게 사장님께 숙성 순서 다시 물어볼 것.’ 단골 반찬가게가 있다." }
          ]
        },
        {
          title: "집에 돌아온 재료를 확인하라",
          intro: "며칠 뒤 다시 집. 엄마가 시장에서 사 온 재료가 부엌에 정리돼 있다. 실제 재료 구성을 확인하자.",
          objective: "부엌의 재료 흔적 확인",
          clues: [
            { id: "home-aromatics", x: 1185, y: 676, title: "찬장 속 향채 묶음", text: "양파 · 대파 · 마늘 · 생강. 시장에서 본 묶음과 정확히 일치한다." },
            { id: "home-sweetener", x: 1314, y: 318, title: "냉장고의 매실청", text: "설탕 옆에 늘 같이 놓인 매실청. 단맛을 한 가지로만 내지 않는다." }
          ]
        },
        {
          title: "엄마가 감춘 중간 메모를 찾아라",
          intro: "계속 뒤를 밟자 엄마도 눈치가 빨라졌다. 이번 메모는 부엌 안쪽에 숨겨져 있다.",
          objective: "숙성 중간 단계 확인",
          clues: [
            { id: "home-first-rest", x: 1360, y: 600, title: "서랍 속 날짜표", text: "첫 번째 표시가 정확히 24시간 뒤에 찍혀 있다." },
            { id: "home-reboil", x: 1040, y: 185, title: "냄비 옆 작은 메모", text: "게를 건진 뒤 간장물만 다시 끓인다는 순서 표시가 있다." }
          ]
        }
      ]
    },

    market: {
      key: "market",
      name: "전통시장",
      timeNames: ["이른 아침", "장날 오전"],
      palette: { bg: "#1c1714", grid: "rgba(255,242,211,.04)", wall: "#251b17", accent: "#e7b85f" },
      zones: [{ x: 20, y: 20, w: 1400, h: 770, label: "시장 골목", tone: "#35281f" }],
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
      sisterSpawn: { x: 1290, y: 470, angle: Math.PI },
      patrolMom: [
        { x: 375, y: 390, pause: .5, look: -.4 }, { x: 218, y: 286, pause: 1.15, look: -.8 },
        { x: 540, y: 290, pause: .9, look: .7 }, { x: 900, y: 290, pause: 1.1, look: -.65 },
        { x: 1230, y: 295, pause: .65, look: .55 }, { x: 1315, y: 405, pause: .4, look: -.6 },
        { x: 1215, y: 490, pause: .3, look: .55 }, { x: 910, y: 480, pause: .7, look: -.55 },
        { x: 550, y: 480, pause: .55, look: .6 }, { x: 250, y: 475, pause: .45, look: -.55 }
      ],
      patrolSister: [
        { x: 1210, y: 470, pause: .25, look: -.6 }, { x: 1020, y: 390, pause: .35, look: .5 },
        { x: 740, y: 480, pause: .3, look: -.55 }, { x: 450, y: 400, pause: .3, look: .5 },
        { x: 210, y: 290, pause: .4, look: -.45 }, { x: 520, y: 300, pause: .25, look: .55 },
        { x: 820, y: 295, pause: .3, look: -.55 }, { x: 1120, y: 300, pause: .35, look: .5 }
      ],
      hideSpots: [
        { id: "market-west-crate", x: 64, y: 640, label: "박스 뒤에 숨기" },
        { id: "market-center-awning", x: 720, y: 110, label: "좌판 천막 뒤에 숨기" },
        { id: "market-east-crate", x: 1368, y: 620, label: "상자 더미에 숨기" }
      ],
      distractions: [
        { id: "market-bell", x: 720, y: 400, label: "가게 종 울리기", radius: 520 },
        { id: "market-can", x: 1080, y: 470, label: "빈 통 굴리기", radius: 420 },
        { id: "market-speaker", x: 390, y: 500, label: "시장 방송 버튼 건드리기", radius: 560 }
      ],
      exit: { x: 1374, y: 405, label: "시장 골목 빠져나가기" },
      visits: [
        {
          title: "엄마의 장바구니를 미행하라",
          intro: "엄마의 첫 시장 방문. 사람 사이에서 시야를 끊으며 꽃게와 간장의 선택 기준을 적어 둔다.",
          objective: "꽃게와 간장 선택 기준 확인",
          clues: [
            { id: "market-crab", x: 365, y: 185, title: "꽃게집 포장지", text: "간장게장용은 선도와 살 상태를 우선해서 고른다." },
            { id: "market-soy-ratio", x: 1034, y: 184, title: "장류 가게 주문 메모", text: "엄마 주문: 진간장과 물은 같은 양에서 시작." }
          ]
        },
        {
          title: "같은 시장, 다른 장바구니",
          intro: "다른 날의 장보기는 품목이 달라졌다. 향채와 단맛 재료를 확인하면 레시피 조각이 이어진다.",
          objective: "향채와 단맛 재료 확인",
          clues: [
            { id: "market-aromatics", x: 690, y: 236, title: "향채 묶음", text: "양파 · 대파 · 마늘 · 생강을 한 묶음으로 챙긴다." },
            { id: "market-maesil", x: 326, y: 545, title: "매실청 영수증", text: "설탕과 별도로 매실청을 구입했다." }
          ]
        }
      ]
    },

    banchan: {
      key: "banchan",
      name: "단골 반찬가게",
      timeNames: ["오후", "마감 전"],
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
      sisterSpawn: { x: 1300, y: 520, angle: Math.PI },
      patrolMom: [
        { x: 450, y: 640, pause: .4, look: .55 }, { x: 270, y: 545, pause: .55, look: -.75 },
        { x: 440, y: 270, pause: .9, look: .65 }, { x: 820, y: 255, pause: .5, look: -.55 },
        { x: 970, y: 370, pause: .35, look: .6 }, { x: 1190, y: 230, pause: 1.0, look: -.75 },
        { x: 1360, y: 500, pause: .45, look: .55 }, { x: 1120, y: 520, pause: 1.15, look: -.65 },
        { x: 970, y: 410, pause: .4, look: .5 }, { x: 800, y: 550, pause: .45, look: -.5 }
      ],
      patrolSister: [
        { x: 1260, y: 520, pause: .35, look: -.65 }, { x: 1100, y: 250, pause: .35, look: .6 },
        { x: 960, y: 380, pause: .25, look: -.6 }, { x: 760, y: 620, pause: .3, look: .5 },
        { x: 410, y: 545, pause: .35, look: -.55 }, { x: 520, y: 255, pause: .25, look: .6 },
        { x: 840, y: 280, pause: .3, look: -.55 }
      ],
      hideSpots: [
        { id: "shop-display", x: 414, y: 120, label: "진열대 끝에 몸 숨기기" },
        { id: "shop-counter", x: 390, y: 410, label: "계산대 뒤에 숨기" },
        { id: "shop-kitchen", x: 1365, y: 650, label: "박스 뒤에 숨기" }
      ],
      distractions: [
        { id: "shop-chime", x: 80, y: 250, label: "출입문 차임 울리기", radius: 460 },
        { id: "shop-timer", x: 965, y: 190, label: "주방 타이머 울리기", radius: 520 },
        { id: "shop-tray", x: 820, y: 625, label: "빈 쟁반 건드리기", radius: 450 }
      ],
      exit: { x: 75, y: 760, label: "가게에서 빠져나가기" },
      visits: [
        {
          title: "조리 순서를 엿들어라",
          intro: "엄마와 사장님의 대화는 짧다. 진열대로 시야를 끊고 간장물을 게에 붓기 전 처리법을 확인하자.",
          objective: "간장물 처리 순서 확인",
          clues: [
            { id: "shop-cool", x: 1110, y: 170, title: "뒷주방 작업표", text: "간장물과 향채를 끓여 우린 다음, 게에 붓기 전 반드시 완전히 식힌다." },
            { id: "shop-sweet", x: 825, y: 108, title: "시식표 뒤 메모", text: "설탕만 세게 쓰지 않고 매실청을 섞어 단맛을 둥글게 잡는다." }
          ]
        },
        {
          title: "숙성 냉장고의 날짜를 훔쳐봐라",
          intro: "며칠 뒤 같은 가게. 이번에는 숙성 날짜와 재가열 순서를 확인하면 시간축이 맞춰진다.",
          objective: "숙성 시간과 재가열 순서 확인",
          clues: [
            { id: "shop-aging", x: 1380, y: 355, title: "숙성 냉장고 라벨", text: "1차 숙성 기준은 24시간." },
            { id: "shop-reboil", x: 1120, y: 470, title: "간장 솥 체크표", text: "1차 뒤 게를 건지고 간장물만 다시 끓여 식힌 다음 다시 붓는다." }
          ]
        }
      ]
    }
  };

  LOCATIONS.market.visits.push(
    {
      title: "시장 상인들의 기억을 맞춰라",
      intro: "몇 번이나 같은 시장을 돌다 보니 상인마다 엄마에 대해 조금씩 다른 말을 한다. 실제 구매 흔적과 대화를 대조해 보자.",
      objective: "구매 습관 교차 확인",
      clues: [
        { id: "market-balance", x: 365, y: 185, title: "장류 가게 단골 기록", text: "진간장과 물을 같은 양에서 시작한 뒤 향채와 단맛으로 조정한다는 주문 습관이 반복된다." },
        { id: "market-freshness", x: 1034, y: 184, title: "꽃게집 단골 표시", text: "엄마는 냉동 특가보다 당일 상태가 좋은 꽃게를 우선해서 고른다." }
      ]
    },
    {
      title: "마지막 장보기 흔적을 확인하라",
      intro: "이제 시장에서 찾는 건 새로운 비법보다 기존 조각의 재확인이다. 가짜 메모에 속지 않고 반복되는 패턴을 골라내자.",
      objective: "시장 단서 최종 검증",
      clues: [
        { id: "market-repeat-ratio", x: 690, y: 236, title: "반복 주문 기록", text: "서로 다른 날짜의 주문표에도 간장과 물을 같은 양으로 시작한다는 기록이 남아 있다." },
        { id: "market-repeat-aroma", x: 326, y: 545, title: "향채 재구매 영수증", text: "양파 · 대파 · 마늘 · 생강 묶음을 다시 샀다. 일회성 조합이 아니었다." }
      ]
    }
  );

  LOCATIONS.banchan.visits.push(
    {
      title: "사장님의 수정 흔적을 추적하라",
      intro: "반찬가게에는 실패한 시험표가 너무 많다. 최종적으로 살아남은 조리 순서가 무엇인지 수정 이력을 따라간다.",
      objective: "폐기안과 현재 작업법 구분",
      clues: [
        { id: "shop-current-cool", x: 1110, y: 170, title: "현재 작업표 재확인", text: "현재 사용하는 간장게장 작업표에는 ‘완전히 식힌 뒤 붓기’가 굵게 표시돼 있다." },
        { id: "shop-current-rest", x: 1380, y: 355, title: "최근 숙성 라벨", text: "최근 날짜의 배치들도 1차 24시간 기준으로 반복된다." }
      ]
    },
    {
      title: "마지막 조리 흔적을 확인하라",
      intro: "최종 작전 전 마지막 방문. 재가열과 2차 숙성이 실제 반복 공정인지 확인한다.",
      objective: "재가열·2차 숙성 최종 검증",
      clues: [
        { id: "shop-repeat-reboil", x: 1120, y: 470, title: "연속 배치 체크표", text: "여러 배치 모두 1차 뒤 게를 건지고 간장물만 다시 끓이는 순서를 따른다." },
        { id: "shop-second-rest", x: 825, y: 108, title: "2차 숙성 라벨", text: "재가열한 간장물을 완전히 식혀 다시 부은 뒤 2차 숙성으로 넘어간다." }
      ]
    }
  );

  const FINAL_CLUES = [
    { id: "final-ratio", x: 500, y: 82, title: "원본 · 배합", text: "진간장 : 물 = 1 : 1에서 시작하고 향채와 단맛 재료로 균형을 맞춘다." },
    { id: "final-cool", x: 1314, y: 318, title: "원본 · 냉각", text: "끓인 간장물은 게에 붓기 전 완전히 식힌다." },
    { id: "final-rest", x: 1185, y: 676, title: "원본 · 숙성", text: "1차 24시간 뒤 게를 건지고 간장물을 다시 끓여 식힌 다음 다시 부어 2차 숙성." }
  ];

  function makeVisit(locationKey, visitIndex, day, totalDays, sisterActive, rng) {
    const base = LOCATIONS[locationKey];
    const visit = base.visits[Math.min(visitIndex, base.visits.length - 1)];
    const dayFactor = (day - 1) / Math.max(1, totalDays - 1);
    const stage = clone(base);

    stage.id = `day-${day}-${locationKey}-visit-${visitIndex + 1}`;
    stage.day = day;
    stage.totalDays = totalDays;
    stage.visitIndex = visitIndex;
    stage.locationKey = locationKey;
    stage.name = `${base.name} · ${base.timeNames[visitIndex % base.timeNames.length]}`;
    stage.kicker = `DAY ${day} / ${totalDays}`;
    stage.introTitle = visit.title;
    stage.intro = visit.intro;
    stage.objective = visit.objective;
    stage.clues = clone(visit.clues);
    stage.decoys = pickDecoys(locationKey, visitIndex, day, rng);
    stage.entries = shuffle([...stage.clues, ...stage.decoys], rng);
    stage.items = makeItems(locationKey, day, rng, false);
    stage.sisterActive = !!sisterActive;
    stage.safe = null;
    stage.ai = {
      visionRange: 238 + dayFactor * 48,
      fov: 1.08 + dayFactor * .18,
      patrolSpeed: 78 + dayFactor * 16,
      investigateSpeed: 102 + dayFactor * 18,
      chaseSpeed: 126 + dayFactor * 24,
      hearing: .92 + dayFactor * .28
    };
    stage.sisterAI = {
      visionRange: 220 + dayFactor * 44,
      fov: 1.2 + dayFactor * .16,
      patrolSpeed: 94 + dayFactor * 15,
      investigateSpeed: 118 + dayFactor * 18,
      chaseSpeed: 145 + dayFactor * 24,
      hearing: 1.04 + dayFactor * .24
    };
    return stage;
  }

  function makeFinal(day, totalDays, rng) {
    const base = LOCATIONS.home;
    const stage = clone(base);
    stage.id = "home-finale";
    stage.day = day;
    stage.totalDays = totalDays;
    stage.visitIndex = 2;
    stage.locationKey = "home";
    stage.name = "우리 집 · 최종 작전";
    stage.kicker = `DAY ${day} / ${totalDays} · FINAL`;
    stage.introTitle = "원본 레시피를 훔쳐라";
    stage.intro = "며칠 동안 집, 시장, 반찬가게를 오가며 조각을 모았다. 이제 엄마가 감춘 원본만 챙기면 된다. 문제는 언니도 라먀니의 수상한 움직임을 완전히 눈치챘다는 것.";
    stage.objective = "원본 레시피 확보";
    stage.clues = clone(FINAL_CLUES);
    stage.decoys = shuffle(FINAL_DECOYS, rng).slice(0, 3).map(clone);
    stage.entries = shuffle([...stage.clues, ...stage.decoys], rng);
    stage.items = makeItems("home", day, rng, true);
    stage.sisterActive = true;
    stage.safe = { x: 1392, y: 690, label: "원본 레시피 꺼내기" };
    stage.ai = { visionRange: 292, fov: 1.34, patrolSpeed: 94, investigateSpeed: 124, chaseSpeed: 154, hearing: 1.24 };
    stage.sisterAI = { visionRange: 266, fov: 1.42, patrolSpeed: 108, investigateSpeed: 136, chaseSpeed: 172, hearing: 1.3 };
    stage.patrolSister = clone(HOME_PATROL).reverse();
    return stage;
  }

  function routePenalty(route) {
    let score = 0;
    for (let i = 1; i < route.length; i += 1) {
      if (route[i] === route[i - 1]) score += 6;
    }
    // Keep the single mid-campaign home visit away from the opening/finale boundaries when possible.
    const midHome = route.slice(1, -1).indexOf("home") + 1;
    if (midHome > 0 && (midHome < 3 || midHome > route.length - 4)) score += 2;
    return score;
  }

  function generateCampaign(seedValue) {
    const seed = hashSeed(seedValue == null ? Date.now() : seedValue);
    const rng = mulberry32(seed);

    // Total 10 days:
    // - home exactly 3 times: opening, one shuffled mid-campaign revisit, finale
    // - market + banchan exactly 7 times, split 4/3 in a seeded random direction
    const marketCount = rng() < .5 ? 4 : 3;
    const banchanCount = 7 - marketCount;
    const middleBase = [
      "home",
      ...Array(marketCount).fill("market"),
      ...Array(banchanCount).fill("banchan")
    ];

    let best = middleBase.slice();
    let bestScore = Infinity;
    for (let i = 0; i < 160; i += 1) {
      const candidate = shuffle(middleBase, rng);
      const full = ["home", ...candidate, "home"];
      const score = routePenalty(full);
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
        if (score === 0) break;
      }
    }

    if (bestScore > 0) {
      best = marketCount === 4
        ? ["market", "banchan", "market", "banchan", "home", "market", "banchan", "market"]
        : ["banchan", "market", "banchan", "market", "home", "banchan", "market", "banchan"];
    }

    const route = ["home", ...best];
    const totalDays = 10;
    const counts = { home: 0, market: 0, banchan: 0 };
    const stages = [];

    route.forEach((locationKey, i) => {
      const day = i + 1;
      const visitIndex = counts[locationKey]++;
      stages.push(makeVisit(locationKey, visitIndex, day, totalDays, day >= 5, rng));
    });

    stages.push(makeFinal(totalDays, totalDays, rng));
    return { seed, route: stages.map(stage => stage.locationKey), stages };
  }

  function validateStage(stage) {
    const required = ["id", "name", "spawn", "momSpawn", "patrolMom", "clues", "exit"];
    for (const key of required) {
      if (stage[key] == null) return { ok: false, reason: `missing ${key}` };
    }
    if (!Array.isArray(stage.patrolMom) || stage.patrolMom.length < 2) return { ok: false, reason: "mom patrol too short" };
    if (stage.sisterActive && (!Array.isArray(stage.patrolSister) || stage.patrolSister.length < 2)) {
      return { ok: false, reason: "sister patrol too short" };
    }
    if (!Array.isArray(stage.clues) || stage.clues.length < 1) return { ok: false, reason: "no clues" };
    if (!Array.isArray(stage.decoys)) return { ok: false, reason: "decoys missing" };
    if (!Array.isArray(stage.items)) return { ok: false, reason: "items missing" };
    if (!Array.isArray(stage.entries) || stage.entries.length !== stage.clues.length + stage.decoys.length) {
      return { ok: false, reason: "evidence entries invalid" };
    }
    return { ok: true };
  }

  return { LOCATIONS, generateCampaign, validateStage };
});
