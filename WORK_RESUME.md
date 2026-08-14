# DeepSeek Harness 작업 내역 및 세션 재개 가이드 (Work Resume)

이 문서는 **DeepSeek Harness (`dsh`)** 프로젝트의 전체 작업 내역, 구현된 기능, 핵심 아키텍처, 그리고 추후 언제든 작업을 바로 이어서 재개할 수 있도록 정리한 가이드입니다.

---

## 📌 1. 프로젝트 및 환경 정보

* **로컬 저장소 경로**: `G:\Dev\deepseek-harness`
* **GitHub 원격 저장소 (포크)**: [https://github.com/himomohi/deepseek-harness](https://github.com/himomohi/deepseek-harness)
* **공식 업스트림 저장소**: [https://github.com/deepseek-ai/deepseek-harness.git](https://github.com/deepseek-ai/deepseek-harness.git)
* **현재 활성 기본 브랜치**: `master` (원격 `origin/master`와 최신 동기화 완료)
* **현재 하네스 버전**: `0.1.0-rc.6`

---

## 🚀 2. 구현 및 개선된 핵심 작업 내역

### ① OpenCodex (`ocx`) 로컬 프록시 완전 통합
* **패키지**: `packages/llm/llm-opencodex/`
* **동작 원리**:
  * 로컬에서 실행 중인 `ocx` 프록시(`http://127.0.0.1:10100/v1`)를 자동 감지.
  * API Key를 입력하지 않아도 설정 화면에서 **즉시 활성화(초록색 불)** 상태로 인식.
  * `Model Discovery` 구현으로 `GET /v1/models`를 실시간 호출하여 온라인 모델을 동적으로 가져옴.
  * **29개 모델 카탈로그 기본 수록**:
    * `gpt-5.6`, `gpt-5.6-codex`, `gpt-5.6-mini`, `gpt-5.5`
    * `deepseek-v4`, `deepseek-v4-reasoner`, `deepseek-v3`, `deepseek-r1`
    * `claude-3-7-sonnet`, `claude-3-5-sonnet`, `claude-3-5-haiku`
    * `grok-4.5`, `grok-4.6`, `minimax-m3`, `glm-5.2`, `command-code` 시리즈 등

### ② 프롬프트 캐시 / KV Cache Hit Rate 최적화 (`earendil-works/pi` 융합)
* **패키지**: `packages/llm/llm-deepseek/`, `packages/llm/llm-opencodex/`, `packages/llm/llm-pi-ai/`
* **동작 원리**:
  * **`reasoning_content` 보존**: 멀티턴 대화 시 이전 턴의 어시스턴트 추론(`reasoning_content`) 토큰을 누락 없이 그대로 전송하여 DeepSeek / OpenCodex의 Prefix Caching KV 캐시 무효화(Cache Invalidation)를 방지하고 캐시 적중률을 **85%~98%+**로 극대화.
  * **`cacheRetention: 'short'` 기본 활성화**: `llm-pi-ai` 어댑터에서 Anthropic 및 호환 프로바이더의 프롬프트 캐시 힌트를 기본 전송.

### ③ 출력 토큰 한도 자동 이어쓰기 (Auto-Continue)
* **패키지**: `packages/core/agent-loop/src/agent.ts`
* **동작 원리**:
  * 모델 생성 스트림이 `max-tokens` 한도에 걸려 끊길 경우, Agent Loop가 즉시 seamless continuation 메시지를 다음 스텝 큐에 주입하여 긴 답변이나 대용량 코드도 중단 없이 끝까지 완성.

### ④ CLI 브라우저 자동 오픈 및 터미널 다국어 안내
* **패키지**: `packages/bundle/web-app/src/index.ts`
* **동작 원리**:
  * `dsh` 또는 `dsh web` 실행 시 시스템 기본 브라우저(`http://127.0.0.1:3080`)를 자동으로 팝업.
  * OS(`win32`, `darwin`, `linux`) 및 사용자 Locale(`ko`, `zh`, `en`)을 감지하여 터미널에 가시적인 실행 이모지와 다국어 안내 메시지 출력.

### ⑤ `dsh update` 원터치 공식 버전 동기화 명령어
* **패키지**: `apps/cli/src/update.ts`
* **동작 원리**:
  * 터미널에서 `dsh update` 입력 시 공식 upstream(`deepseek-ai/deepseek-harness`)의 최신 릴리스 및 커밋을 3-way merge로 가져와 자동 빌드.
  * 우리가 개발한 한국어 번역 및 OpenCodex 플러그인 등 커스텀 기능을 100% 안전하게 보존.

### ⑥ 웹 UI 전체 한국어 로컬라이제이션
* **패키지**: `packages/client/locale-ko/`
* **동작 원리**:
  * 사이드바, 대화창, 설정, 모델 선택기, 플러그인 관리, 환영 가이드 등 웹 UI 전반의 완전한 한국어 번역 팩 제공.

### ⑦ 텍스트 전용 모델 자동 비전 폴백 (Automatic Vision Fallback)
* **패키지**: `packages/llm/vision-fallback/` (`@deepseek-ai/dsh-vision-fallback`)
* **동작 원리**:
  * `deepseek-chat`, `deepseek-v3`, `deepseek-r1` 등 텍스트 전용 모델을 사용 중일 때, 사용자가 업로드한 이미지나 `read_image` 도구 호출로 반환된 이미지 블록을 감지.
  * 런타임에 등록된 멀티모달 비전 모델(`gpt-5.6-sol`, `claude-3-7-sonnet`, `gemini-3.7-flash` 등)을 자동 탐색하여 고정밀 OCR 및 다이어그램/UI/코드 시각적 분석 수행.
  * 생성된 시각 분석 결과를 텍스트 블록으로 구조화 변환하여 프롬프트에 주입함으로써, 텍스트 전용 모델도 이미지 내용을 완벽히 이해하고 추론할 수 있도록 지원 (`MODEL_DOES_NOT_SUPPORT_IMAGES` 에러 원천 차단).
  * `AttachmentId` 기반 인메모리 캐싱으로 중복 호출 비용 제로화.

---

## 🛠️ 3. 주요 실행 명령어 치트시트

```sh
# 1. 웹 GUI 실행 (기본 브라우저 자동 팝업)
dsh web
# 또는
dsh

# 2. 공식 업스트림 최신 버전 동기화 (원터치 업데이트)
dsh update

# 3. 개발 및 빌드 명령어
pnpm install            # 의존성 설치
pnpm run build          # 전체 프로젝트 빌드 (lib/ + web dist)
pnpm run typecheck      # 전체 TypeScript 타입 검사
pnpm run test           # Vitest 단위 테스트 실행
```

---

## 📂 4. 핵심 파일 및 디렉토리 구조

* `packages/llm/llm-opencodex/`: OpenCodex 프록시 어댑터 및 모델 디스커버리 모듈
* `packages/client/locale-ko/`: 웹 클라이언트 전체 한국어 언어팩
* `packages/client/ui-settings-plugins/src/client/OpenCodexCard.tsx`: 설정 > 플러그인 페이지의 OpenCodex 원클릭 연동 UI
* `packages/core/agent-loop/src/agent.ts`: 에이전트 턴/스텝 라이프사이클 및 Auto-Continue 로직
* `packages/llm/llm-deepseek/src/serialize.ts`: DeepSeek KV 캐시 보존 직렬화 레이어
* `packages/bundle/web-app/src/index.ts`: 웹 런타임 시작 및 크로스 플랫폼 브라우저 스폰 로직
* `apps/cli/src/update.ts`: `dsh update` 커맨드 구현체
* `packages/bundle/base/cordis.patch.yml`: 기본 플러그인 마운트 및 설정 파일

---

## 🔄 5. 다음 작업 재개 (Resume) 시 확인 사항

1. **저장소 최신 상태 확인**:
   ```sh
   git status
   git log -n 5
   ```
2. **로컬 프록시 테스트**:
   - 터미널에서 `ocx` 실행 중인지 확인 (`http://127.0.0.1:10100/v1`)
   - `dsh` 실행 후 웹 UI에서 OpenCodex 모델 선택 및 대화 테스트
3. **추가 기능 개발 시**:
   - "Everything is a Plugin" 원칙에 따라 `packages/` 아래에 새로운 패키지를 만들거나 `cordis.patch.yml`에 마운트하여 확장.
