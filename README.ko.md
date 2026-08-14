# DeepSeek Harness

[English](README.md) | [中文](README.zh.md) | 한국어

DeepSeek Harness(`dsh`)는 [DeepSeek AI](https://deepseek.com)에서 개발한 오픈소스 AI 에이전트 하네스(Agent Harness) 프레임워크입니다.

모든 기능이 플러그인으로 구성되는 **Everything is a Plugin** 아키텍처를 채택하고 있으며, [Cordis](https://github.com/cordiverse/cordis) 마이크로커널을 기반으로 구동됩니다. 아키텍처 설계 배경은 논문 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)에 자세히 기술되어 있습니다.

## 🚀 주요 기능 및 한국어/OpenCodex 지원

- **전체 한국어 로컬라이제이션**: 웹 UI 및 플러그인 설정 전체 한국어(`ko`) 기본 지원
- **OpenCodex 프록시 원클릭 연동**: ChatGPT, Claude, Grok, Kimi 등 다양한 LLM 모델을 프록시를 통해 웹 UI(설정 > 플러그인)에서 원클릭으로 간편하게 연결
- **터미널 어디서든 간편 실행**: 글로벌 `dsh` 커맨드 지원

## ⚠️ 개발자 프리뷰 (Developer Preview)

DeepSeek Harness는 현재 *개발자 프리뷰* 단계이며 빠르게 발전하고 있습니다. 향후 버전 업데이트에 따라 호환성을 깨뜨리는 변경사항이 발생할 수 있습니다.

## 💻 실행 방법

### 1. 전역 `dsh` 명령어로 실행

```sh
# 웹 UI 바로 실행
dsh web

# CLI 환경 실행
dsh
```

웹 UI는 기본적으로 `http://127.0.0.1:3080` 포트로 실행됩니다.

### 2. 소스 코드에서 빌드 및 실행

```sh
git clone https://github.com/himomohi/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

## 🌐 커뮤니티 및 지원

- 피드백이나 버그 제보는 [GitHub Discussions](https://github.com/himomohi/deepseek-harness/discussions) 또는 이슈를 통해 남겨주세요.
- 플러그인 레포지토리에 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 토픽을 추가하면 검색에 쉽게 노출됩니다.
- <a href="https://discord.gg/Ycq5dCaS4">DeepSeek Harness Discord 커뮤니티</a>에 참여하세요.

## 🤝 기여하기

자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고해 주세요.

## 🛠️ 개발 가이드

- [개발 가이드(docs/development.md)](docs/development.md)
- [아키텍처 문서(docs/architecture.md)](docs/architecture.md)
- 에이전트 개발 규약: [AGENTS.md](AGENTS.md)

## 📝 변경 기록 (Changelog)

### [2026-08-14] - 0.1.0-rc.6 동기화 및 OpenCodex / 편의성 개선
- **`dsh update` 원터치 업데이트 기능 추가**:
  - 공식 upstream 원격 레포지토리 및 npm 최신 릴리스 버전(`0.1.0-rc.6`)을 자동 감지하고 병합·빌드하여, 커스텀 플러그인과 한국어 번역을 유지하면서도 공식 업데이트를 즉시 반영.
- **`dsh` 실행 시 브라우저 자동 오픈 및 터미널 다국어 안내**:
  - `dsh` 또는 `dsh web` 실행 시 기본 브라우저를 백그라운드에서 자동으로 실행하여 웹 UI 접속.
  - OS(Windows, macOS, Linux) 환경 및 사용자 Locale(`ko`, `zh`, `en`)을 감지하여 터미널에 가시적인 실행 안내 메시지 출력.
- **OpenCodex(`ocx`) 프록시 완벽 연동**:
  - 로컬 `ocx` 프록시(`http://127.0.0.1:10100/v1`) 실행 시 설정 화면에서 별도 API Key 입력 없이도 즉시 활성화(초록색 불) 상태로 인식되도록 개선.
  - `Model Discovery` 구현으로 "사용 가능한 모델 가져오기" 클릭 시 `ocx`가 서빙하는 실시간 모델 목록 동적 패칭 지원.
  - GPT-5.6 시리즈, DeepSeek V4 시리즈, Grok 4.5/4.6, MiniMax M3, GLM 5.2, CommandCode 등 `ocx`가 프록시로 서빙하는 **총 29개 모델**을 기본 카탈로그에 전면 수록.
- **출력 토큰 한도 자동 이어쓰기(Auto-Continue)**:
  - 모델의 응답 길이가 출력 토큰 한도(`max-tokens`)에 도달하여 중간에 끊기더라도 끊김 없이 자동으로 이어서 완벽하게 응답을 완성하도록 Agent Loop 개선.
- **프롬프트 캐시 및 KV 캐시 적중률(Cache Hit Rate) 최적화**:
  - `earendil-works/pi`의 캐시 보존 기법을 융합하여 멀티턴 대화 시 어시스턴트의 추론(`reasoning_content`) 토큰을 완벽하게 보존, DeepSeek/OpenCodex의 Prefix Caching KV 캐시 무효화를 방지하고 캐시 적중률 대폭 향상.
  - `llm-pi-ai` 어댑터의 프롬프트 캐시 지속성(`cacheRetention: 'short'`)을 기본 활성화하여 Anthropic 및 호환 프로바이더의 캐싱 효율 극대화.
- **크로스 플랫폼 호환성 확보**:
  - Windows, macOS(`darwin`), Linux 전반에서 브라우저 스폰(`open`, `start`, `xdg-open`) 및 언어 환경 감지 일관성 보장.
- **사용자 임시 프로필 자동 생성 지원**:
  - 프로필 미지정 상태에서도 불필요한 프롬프트 없이 임시 프로필로 즉시 세션이 생성되어 빠르고 유연하게 진입 가능.
- **전체 웹 UI 한국어(ko) 로컬라이제이션 완료**:
  - 사이드바, 대화창, 설정, 모델 관리, 플러그인 관리, 환영 안내 등 모든 UI 영역의 한국어화 적용.

## 📄 라이선스

[MIT](LICENSE)

외부 의존성 및 라이선스 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.
