# DeepSeek Harness

[English](README.md) | [中文](README.zh.md) | 한국어

DeepSeek Harness(`dsh`)는 [DeepSeek AI](https://deepseek.com)가 개발한 오픈소스 에이전트 하네스입니다.

**모든 것이 플러그인**인 아키텍처를 사용하며, [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)에 설계가 설명된 [Cordis](https://github.com/cordiverse/cordis)를 기반으로 합니다.

이 포크는 한국어 Web UI 언어팩, OpenCodex 프록시 제공자, 모바일 폭 레이아웃 수정, 대화형 업스트림 업데이트, 대규모 스트리밍 backlog용 커서 FIFO 큐를 추가합니다. 제공자 측 측정 없이 캐시 적중률이나 첫 토큰 지연 개선을 주장하지 않습니다.

## 개발자 프리뷰

DeepSeek Harness는 현재 _개발자 프리뷰_ 단계이며 빠르게 변경되고 있습니다. **호환성을 깨는 변경이 발생할 수 있습니다.**

## 실행

### `npm`에서 실행

`Node.js`를 설치한 뒤 실행합니다.

```sh
npx @deepseek-ai/dsh web
```

명령은 기본적으로 `http://127.0.0.1:3080`에서 Web UI를 제공합니다. 대화형 터미널에서는 기본 브라우저로 이 주소를 열며, `--no-open`을 전달하면 서버만 실행합니다. 자세한 내용은 [Web UI 가이드](docs/user/guide/index.md)를 참고하세요.

### 소스에서 실행

이 포크를 저장소 checkout에서 실행하려면 다음 명령을 사용합니다.

```sh
git clone https://github.com/himomohi/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh
```

명시적인 profile 없이 `pnpm dsh`를 실행하면 Web profile을 선택하며, `pnpm dsh web`은 같은 동작을 명시적으로 요청합니다.

## 포크 기능

- **한국어 언어팩**: `@deepseek-ai/dsh-client-locale-ko`가 일반 클라이언트 플러그인으로 Web UI 한국어 사전을 제공합니다.
- **OpenCodex 제공자**: `@deepseek-ai/dsh-llm-opencodex`가 OpenAI 호환 OpenCodex 프록시에 연결하고 `GET /models` 결과로 안내용 모델 카탈로그를 교체할 수 있습니다.
- **한 번에 Web 시작**: `dsh`만 실행해도 Web profile을 선택하고 URL을 출력하며, 대화형 터미널에서는 `--no-open`이 없을 때 기본 브라우저를 엽니다.
- **선형 스트리밍 큐**: Host API Proxy, 브라우저 WebSocket 클라이언트, TypeScript SDK가 커서 기반 FIFO로 누적 프레임을 순서대로 배출합니다.
- **업스트림 업데이트**: `dsh update`가 공식 커밋을 미리 보여 주고 확인 후 병합하며, 필요하면 shallow clone을 확장한 뒤 다시 빌드하고 유지 중인 모든 포크 마커를 검사합니다.
- **원격 안전성**: `trustedHosts`는 DNS 재바인딩 방어 수단이지 인증이 아닙니다. 설정, 자격증명, 네이티브 대화상자, Host 측 모델 탐색은 loopback에서만 허용합니다.

OpenCodex는 현재 공용 텍스트 전용 chat-completions wire 어댑터를 사용합니다. 이미지 픽셀이 실제 비전 모델에 전달되지 않는 상태에서 입력을 조용히 변환하거나 허용하지 않고, 모델 기능 검사에서 명확히 거부합니다.

## 이 포크 업데이트

```sh
dsh update --dry-run
dsh update
dsh update --yes
```

업데이터는 공식 저장소를 가져오고 checkout이 shallow 상태면 숨겨진 Git 부모 이력을 복구한 뒤 공식 기본 브랜치를 병합합니다. 이어서 의존성을 설치하고 빌드하며 포크 소유 패키지 마커를 검사합니다. 병합 충돌이나 마커 검사 실패는 복사 가능한 복구 프롬프트와 함께 중단되고, 부분 업데이트를 성공으로 보고하지 않습니다.

## 커뮤니티와 지원

- 피드백과 버그는 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)에 남길 수 있습니다.
- 플러그인 저장소에 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 토픽을 추가하면 검색하기 쉬워집니다.
- <a href="https://discord.gg/Ycq5dCaS4">DeepSeek Harness Discord 커뮤니티</a>에 참여할 수 있습니다.

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 개발

[개발 가이드](docs/development.md)와 [아키텍처 문서](docs/architecture.md)부터 읽으세요.

에이전트는 [AGENTS.md](AGENTS.md)를 따라야 합니다.

## 라이선스

[MIT](LICENSE)

외부 의존성과 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 공개되어 있습니다.
