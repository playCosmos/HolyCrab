# HolyCrab

**엄마의 간장게장 레시피를 훔쳐라.**

라먀니가 한밤중 집을 돌아다니며 엄마의 시야와 소리를 피해 레시피 단서 4개를 모으고, 부엌의 비밀 상자를 해독한 뒤 현관으로 탈출하는 짧은 1인용 스텔스 코미디 게임입니다.

## 바로 플레이

Windows에서 저장소를 내려받은 뒤:

1. `START_HOLYCRAB.bat`을 더블클릭합니다.
2. 기본 브라우저에서 게임이 열립니다.
3. **작전 시작**을 누릅니다.

별도 설치나 빌드가 필요 없습니다.

## 조작

- **WASD / 방향키** — 이동
- **Shift** — 살금살금 이동
- **E** — 조사 / 상호작용 / 숨기 / 나오기
- **Tab** — 단서 노트
- **Esc** — 퍼즐 닫기

## 게임 흐름

- 거실과 부엌에서 레시피 단서 4개 수집
- 엄마의 시야와 발소리 감지 회피
- 옷장/소파/아일랜드에 숨기
- TV·휴대폰·전자레인지로 소리 유인
- 비밀 레시피 상자 3문제 해독
- 레시피를 들고 현관 탈출
- 시간과 들킨 횟수로 S/A/B/C 결과 확인

들켜도 모은 단서는 사라지지 않으며 라먀니의 방에서 바로 재개됩니다.

## 개발

런타임 의존성은 없습니다. 테스트만 실행하려면 Node.js 18+에서:

```bash
npm test
```

GitHub Actions에서도 Windows 환경으로 같은 테스트를 실행합니다.

## 구조

```text
HolyCrab/
├─ index.html
├─ style.css
├─ START_HOLYCRAB.bat
├─ assets/
│  └─ ramyani.svg
├─ src/
│  ├─ core.js
│  └─ game.js
├─ tests/
│  └─ core.test.js
└─ docs/
   └─ GAME_DESIGN.md
```

게임 설계와 규칙, AI 상태, v1 완료 기준은 [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)에 정리되어 있습니다.

## Target

- Windows 10/11
- 최신 Microsoft Edge / Chrome / Firefox
- 16:9 권장
- 오프라인 실행 가능
