(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HolyCrabVN = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ASSETS = {
    ramyani: "./assets/vn/ramyani.png",
    mom: "./assets/vn/mom.png",
    sister: "./assets/vn/sister.png"
  };

  const line = (speaker, text, portrait = "ramyani", side = "left", mood = "normal") => ({
    speaker, text, portrait, side, mood
  });

  function opening() {
    return [
      line("라먀니", "목표는 하나. 엄마가 절대 안 알려주는 간장게장 레시피를 10일 안에 완성하는 거야."),
      line("라먀니", "집은 세 번, 시장과 반찬가게는 합쳐 일곱 번. 매일 핵심 단서를 챙기고 출구까지 빠져나오면 돼."),
      line("라먀니", "WASD나 방향키로 이동, Shift로 살금살금, E로 조사하거나 숨고 아이템을 줍는다."),
      line("라먀니", "매일 아이템은 딱 하나. 포장끈은 1번으로 가까운 엄마나 언니를 잠깐 묶고, 담배는 2번으로 잠깐 빨라져. 대신 기침 소리가 나."),
      line("라먀니", "민트초코, 담뱃재, 치약 같은 게 적힌 레시피는 그냥 누가 봐도 장난이야. 그런 종이에 시간 뺏기지 말자."),
      line("엄마", "라먀니. 부엌에서 또 뭐 찾고 있니?", "mom", "right", "watch"),
      line("라먀니", "……일단 들키지만 않으면 된다. 가자.", "ramyani", "left", "determined")
    ];
  }

  function dayIntro(stage) {
    const lines = [
      line("라먀니", `DAY ${stage.day}. 오늘은 ${stage.name}. 목표는 ‘${stage.objective}’.`),
      line("라먀니", "오늘도 아이템 하나가 어딘가에 있다. 필요하면 챙기고, 핵심 단서를 다 찾으면 바로 빠져나가자.")
    ];
    if (stage.day === 5) {
      lines.push(line("언니", "요즘 너 왜 이렇게 밖을 들락거려? 귀찮게 수상하네.", "sister", "right", "suspicious"));
      lines.push(line("라먀니", "하필 집순이 언니까지 감시를 시작했다. 오늘부터는 둘 다 피해야 한다.", "ramyani", "left", "worried"));
    } else if (stage.sisterActive) {
      lines.push(line("라먀니", "엄마뿐 아니라 언니 동선도 같이 본다. 한 명을 피했다고 바로 뛰지 말 것.", "ramyani", "left", "careful"));
    }
    return lines;
  }

  function caught(role, caughtCount, day) {
    const byMom = role === "mom";
    const watcher = byMom ? "엄마" : "언니";
    const portrait = byMom ? "mom" : "sister";
    const watcherLines = byMom
      ? [
          "라먀니, 지금 거기서 뭐 하고 있어?",
          "그 종이는 왜 들고 있는데?",
          "발소리부터 수상하다 했어."
        ]
      : [
          "잡았다. 너 또 뭔가 훔쳐보는 중이지?",
          "방에만 있으려 했는데 네가 너무 수상해서 나왔잖아.",
          "엄마한테 말하기 전에 설명해 봐."
        ];
    const text = watcherLines[(caughtCount + day) % watcherLines.length];
    return [
      line(watcher, text, portrait, "right", "caught"),
      line("라먀니", `……DAY ${day} 시작점으로 후퇴. 모은 기록은 그대로니까 다시 움직이면 된다.`, "ramyani", "left", "embarrassed")
    ];
  }

  function daySummary(stage, stats) {
    const item = stats.item
      ? `${stats.item === "binding" ? "포장끈" : "담배"} 획득`
      : "아이템은 놓침";
    return [
      line("라먀니", `DAY ${stage.day} 결산. 핵심 단서 ${stats.clues}개, 쓸모없는 메모 ${stats.decoys}개를 확인했다.`),
      line("라먀니", `${item}. 오늘 발각은 ${stats.caught}회. 남은 아이템은 포장끈 ${stats.binding}개, 담배 ${stats.cigarette}개.`),
      line("라먀니", "오늘은 여기까지. 다음 동선으로 넘어가자.", "ramyani", "left", "relieved")
    ];
  }

  function ending(caughtCount, rank) {
    const lines = [
      line("라먀니", "됐다. 원본 레시피까지 확보했어. 이제 이건 완전히 내 노트다.", "ramyani", "left", "happy")
    ];
    if (caughtCount === 0) {
      lines.push(line("엄마", "끝까지 안 들킬 줄은 몰랐네. 다음엔 그냥 물어봐.", "mom", "right", "smile"));
    } else {
      lines.push(line("엄마", "훔쳐봤으면 설거지는 네가 해.", "mom", "right", "smile"));
      lines.push(line("언니", "나는 처음부터 알고 있었거든. 귀찮아서 보고만 있었지.", "sister", "right", "dry"));
    }
    lines.push(line("라먀니", `작전 등급은 ${rank.rank}. 간장게장 확보 완료.`, "ramyani", "left", "happy"));
    return lines;
  }

  return { ASSETS, opening, dayIntro, caught, daySummary, ending };
});
