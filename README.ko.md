<p align="center">
  <img src="website/public/wordmark.svg" width="220" alt="DeepSeek Harness">
</p>

<p align="center"><strong>조합 가능한 에이전트 인프라를 실용적인 한국어 중심 포크로 유지합니다.</strong></p>

<p align="center">
  <img alt="개발자 프리뷰" src="https://img.shields.io/badge/status-developer_preview-f59e0b">
  <img alt="유지 관리 포크" src="https://img.shields.io/badge/fork-himomohi-0ea5e9">
  <img alt="Node.js" src="https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933">
  <img alt="플러그인 아키텍처" src="https://img.shields.io/badge/architecture-everything_is_a_plugin-7c3aed">
  <img alt="MIT 라이선스" src="https://img.shields.io/badge/license-MIT-111827">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">中文</a> · <a href="README.ko.md">한국어</a>
</p>

[English](README.md) | [中文](README.zh.md) | 한국어

DeepSeek Harness(`dsh`)는 [DeepSeek AI](https://deepseek.com)가 개발한 오픈소스 에이전트 하네스입니다. [Cordis](https://github.com/cordiverse/cordis)를 기반으로 하며 **모든 것이 플러그인**이라는 하나의 아키텍처 원칙을 따릅니다.

이 저장소는 [`himomohi/deepseek-harness`](https://github.com/himomohi/deepseek-harness) 포크입니다. 공식 플러그인 아키텍처를 유지하면서 한국어 Web UI, OpenCodex 연동, 모바일 폭 레이아웃, 더 안전한 업데이트와 종료 명령, 순서를 보존하는 대용량 스트리밍, 제공자별 출력 한도, 백그라운드 작업 취소, 선택형 브라우저 알림을 관리합니다.

> **개발자 프리뷰:** 첫 태그 릴리스 전까지 호환성을 깨는 변경이 발생할 수 있습니다.

## 원하는 빌드 선택

| 목표 | 진입점 | 실행되는 빌드 |
| --- | --- | --- |
| 공식 업스트림 패키지 체험 | `npx @deepseek-ai/dsh web` | DeepSeek AI가 배포한 패키지 |
| 이 유지 관리 포크 실행 | 저장소를 복제한 뒤 `pnpm dsh` | 아래에 설명된 포크 기능 |

npm 명령은 이 포크를 설치하지 않습니다. 한국어 UI, OpenCodex 제공자, 업데이트 도구, 모바일 수정, 전송 계층 변경이 필요하면 `himomohi/deepseek-harness`를 복제해야 합니다.

## 이 포크를 사용하는 이유

| 기능 | 현재 동작 |
| --- | --- |
| 한국어 Web UI | `@deepseek-ai/dsh-client-locale-ko` 클라이언트 플러그인이 한국어 사전을 로드합니다. |
| OpenCodex 모델 | OpenCodex 제공자가 `GET /models`의 실시간 결과로 안내용 모델 카탈로그를 교체할 수 있습니다. |
| 한 명령 Web 수명 주기 | 인자 없는 `dsh`는 Web 프로필을 선택하고 정규 URL을 출력하며 `--no-open`이 없으면 브라우저를 엽니다. `dsh stop`은 유지 관리되는 실행 경로를 찾습니다. |
| 모바일 폭 레이아웃 | 탐색, 설정 시작, 설정, 채팅 화면을 모바일 뷰포트 폭에서도 사용할 수 있습니다. |
| 순서 보존 스트리밍 | Host API, 브라우저 WebSocket, TypeScript SDK 큐가 반복적인 배열 이동 대신 커서 기반 FIFO 처리를 사용합니다. |
| 제공자별 출력 한도 | 명시적인 호출 설정, 정확히 일치하는 검색 모델 한도, 명시적으로 설정된 경로 한도 순으로 적용하며 나머지는 `max_tokens`를 생략합니다. |
| 더 안전한 업스트림 업데이트 | `dsh update`가 공식 커밋을 미리 보여 주고 필요하면 얕은 Git 이력을 복구하며 병합 확인, 재빌드, 포크 소유 마커 검증을 수행합니다. |
| 백그라운드 작업 중지 | 세션 헤더 작업 목록에서 Host `job.cancel` 명령으로 실행 중인 작업을 취소할 수 있습니다. |
| 브라우저 알림 | 일반 설정의 선택 항목이 페이지에 포커스가 없을 때 질문과 완료된 응답을 알립니다. |

OpenCodex는 현재 공유 텍스트 전용 chat-completions 어댑터를 사용합니다. 이미지 픽셀이 비전 모델까지 전달되지 않는 상태에서 이미지 입력을 허용하지 않고 기능으로 명시된 경우에만 활성화합니다.

## 실행

### 소스에서 실행

필수 조건은 Git, `Node.js ^22.19.0 || >=24.0.0`, Corepack 또는 pnpm입니다.

```sh
git clone https://github.com/himomohi/deepseek-harness.git
cd deepseek-harness
corepack enable
pnpm install
pnpm run build
pnpm dsh
```

기본 Web UI 주소는 `http://127.0.0.1:3080`입니다. 대화형 터미널에서는 기본 브라우저로 이 주소를 엽니다.

## 자주 쓰는 명령

| 명령 | 용도 |
| --- | --- |
| `pnpm dsh` | 기본 Web 프로필을 시작합니다. |
| `pnpm dsh web --no-open` | 브라우저를 열지 않고 Web UI를 시작합니다. |
| `pnpm dsh stop` | 유지 관리되는 Web 실행을 종료합니다. |
| `pnpm dsh update --dry-run` | 업스트림 커밋과 업데이트 작업을 미리 확인합니다. |
| `pnpm dsh update` | 공식 기본 브랜치를 대화형으로 병합하고 재빌드한 뒤 포크 마커를 검증합니다. |

충돌, 빌드 실패, 마커 누락이 있으면 업데이트를 중단하고 복구 안내를 제공합니다. 부분 업데이트를 성공으로 보고하지 않습니다.

## 아키텍처 한눈에 보기

```text
Preset
  |
  +-- Service Definition
  +-- Service Provider
  +-- Consumer
  |
  +--> Cordis plugin graph --> session log --> model/tool loop
```

기능은 에이전트 루프를 직접 수정하지 않고 플러그인으로 조합합니다. 모델에 보이는 입력은 내구성 세션 로그에서 재구성할 수 있어야 합니다. 자세한 내용은 [아키텍처 문서](docs/architecture.md)와 [Cordis 논문](https://github.com/cordiverse/paper)을 참고하세요.

## 안전성과 현재 한계

- `trustedHosts`는 DNS 리바인딩 방어 수단이며 인증 기능이 아닙니다. 설정, 자격 증명, 네이티브 대화상자, Host 측 모델 검색은 루프백에서만 허용합니다.
- 제공자가 이미지 전송을 공개하고 검증하기 전까지 OpenCodex 전송 어댑터는 텍스트 전용입니다.
- 제공자 측 측정 없이 캐시 적중률, 첫 토큰 시간, 지연 시간, 비용 개선을 주장하지 않습니다.
- 이 포크는 변경 중인 업스트림 개발자 프리뷰를 따라가므로 공식 변경을 병합하기 전에 `dsh update --dry-run`을 실행하세요.

## 프로젝트 안내

- [변경 기록](CHANGELOG.md) — 유지 관리 포크의 릴리스 이력.
- [Web UI 가이드](docs/user/guide/index.md) — 시작과 브라우저 사용법.
- [아키텍처](docs/architecture.md) — 플러그인 조합과 런타임 소유권.
- [개발 가이드](docs/development.md) — 워크스페이스, 빌드, 검증 절차.
- [기여 안내](CONTRIBUTING.md) — 기여 요구 사항.
- [에이전트 지침](AGENTS.md) — 코딩 에이전트용 저장소 규칙.

## 커뮤니티

- 업스트림 피드백은 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)에 제출하세요.
- 플러그인 저장소에 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 토픽을 추가하세요.
- [DeepSeek Harness Discord 커뮤니티](https://discord.gg/Ycq5dCaS4)에 참여하세요.

## 라이선스

[MIT](LICENSE). 서드파티 의존성과 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 정리되어 있습니다.
