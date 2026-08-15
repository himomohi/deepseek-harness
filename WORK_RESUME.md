# DeepSeek Harness 작업 재개 안내

이 문서는 포크에서 유지하는 기능과 검증 경로를 빠르게 찾기 위한 현재 상태 안내서다. 완료 여부와 최신 변경은 `CHANGELOG.md`, 구현 근거와 설계 결정은 `.agents/notes/implemented/`를 기준으로 확인한다.

## 저장소

- 포크: `https://github.com/himomohi/deepseek-harness.git`
- 공식 업스트림: `https://github.com/deepseek-ai/deepseek-harness.git`
- 기본 브랜치: `master`
- 패키지 버전: `0.1.0-rc.6`

포크의 Git 계보는 공식 업스트림과 이어져 있다. 깊이가 제한된 clone에서는 `dsh update`가 먼저 원격 이력을 확장한 뒤 업스트림 비교와 병합을 수행한다. 이 과정은 현재 브랜치나 커밋을 재작성하지 않는다.

## 포크에서 유지하는 기능

- `packages/client/locale-ko/`: 웹 클라이언트 한국어 언어팩
- `packages/llm/llm-opencodex/`: OpenCodex 프록시 제공자, 설정, 자격 증명, 모델 탐색
- `packages/llm/llm-deepseek/src/direct-provider.ts`: DeepSeek와 OpenCodex가 공유하는 직접 Chat Completions 실행 경로
- `apps/cli/src/update.ts`: 공식 업스트림 비교, 얕은 이력 복구, 확인 후 병합과 빌드
- 스트리밍 큐 최적화: 큰 미읽음·대기 백로그에서도 선형 재탐색을 피하는 Host, 브라우저, SDK 경로

OpenCodex와 DeepSeek의 직접 전송은 요청 직렬화, SSE 해석, 청크 변환, 유휴 시간 제한, 오류 정규화, 재시도 메타데이터를 공유한다. OpenCodex는 현재 텍스트 입력만 선언한다. 모델이 `max-tokens`로 종료하면 추가 유료 요청을 자동 생성하지 않으며, 일반 대화 턴의 비공개 추론을 다음 요청에 다시 보내지 않는다.

## 안전 기준

- 설정 변경, 자격 증명 변경, 모델 탐색 RPC는 loopback 연결에서만 허용한다.
- `trustedHosts`는 원격 호출자를 인증하는 수단으로 사용하지 않는다.
- 웹 서버 시작 시 브라우저 프로세스를 자동으로 분리 실행하지 않는다. 터미널에 표시된 URL을 사용자가 연다.
- 이미지 입력은 검증된 바이트 전송 구현이 생기기 전까지 텍스트 전용 모델에서 명확히 거절한다.
- 자격 증명은 저장소에 커밋하지 않는다.

## 재개 절차

```sh
git status --short
git fetch origin --prune
git fetch upstream --prune
git merge-base HEAD upstream/master
pnpm install
```

변경 전에는 `docs/architecture.md`, `docs/defensive-patterns.md`, 해당 디렉터리의 `AGENTS.md`를 읽는다. 비사소한 변경에는 같은 커밋에 Agent Note와 관련 README/JSDoc를 포함한다.

변경 범위에 맞는 검사를 먼저 실행하고, push 전에는 `.agents/skills/dsh-pre-push-checks/SKILL.md`의 절차를 따른다. 일반적인 최종 확인은 다음과 같다.

```sh
pnpm run typecheck
pnpm run lint
pnpm run duplication
pnpm run build
pnpm run hygiene
pnpm run doc-sync
```

실제 제공자 동작을 바꾼 경우 `pnpm run test:e2e`를 추가한다. API 키가 없으면 해당 검사는 명시적으로 건너뛰며, 그 결과를 실 API 증거로 간주하지 않는다.
