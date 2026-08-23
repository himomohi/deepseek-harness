# 보관된 업스트림 workflow와 자동화 설정

[中文](README.zh.md)

이 디렉터리는 이 포크에서 비활성화한 업스트림 GitHub Actions와 Dependabot 설정 원본입니다. 원본 파일은 복구를 위해 보관하며, GitHub는 `.github/workflows/`만 workflow 디렉터리로 인식하므로 여기의 파일을 자동으로 실행하지 않습니다.

활성 경로의 같은 파일명은 설명용 `workflow_dispatch` 스텁으로 유지됩니다. 원본을 다시 연결하려면 먼저 [포크 자동화 정책](../fork-automation-policy.md)을 읽고, 필요한 파일만 의도적으로 복사한 뒤 `apps/cli/src/fork-automation-policy.ts`의 보호 정책도 함께 조정해야 합니다.
