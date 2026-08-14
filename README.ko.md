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

## 📄 라이선스

[MIT](LICENSE)

외부 의존성 및 라이선스 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.
