# 이 포크의 GitHub 자동화 정책

이 저장소는 `himomohi/deepseek-harness` 개인 포크입니다. 업스트림의 GitHub Actions, Dependabot 예약 업데이트, 외부 API 테스트, self-hosted runner 대기 작업, 릴리스·배포 작업, 이슈 자동화는 이 포크에서 자동으로 실행하지 않습니다.

현재 `.github/workflows/`의 파일명은 링크와 나중의 재연결을 위해 유지하지만, 모든 파일은 `workflow_dispatch`만 허용하는 설명용 no-op 스텁입니다. `.github/dependabot.yml`은 업데이트 대상이 없는 설명용 설정입니다. 원래 업스트림 파일은 삭제하지 않고 [disabled-workflows](disabled-workflows/)에 같은 파일명으로 보관했습니다. 이후 업스트림에 새 workflow나 Dependabot 설정이 추가되거나 기존 파일이 바뀌면 `dsh update`가 먼저 원본을 보관한 뒤 비활성화된 설명으로 교체합니다.

## 다시 연결할 때

재연결은 별도 승인 후 의도적으로 진행해야 합니다.

1. GitHub 저장소 Actions 설정을 다시 활성화합니다.
2. 필요한 원본만 [disabled-workflows](disabled-workflows/)에서 `.github/workflows/` 또는 `.github/dependabot.yml`로 복사합니다.
3. 해당 workflow의 trigger, secrets, 권한, runner를 이 포크에 맞게 검토합니다.
4. `apps/cli/src/fork-automation-policy.ts`의 정책을 먼저 수정합니다. 그렇지 않으면 다음 `dsh update`가 다시 파일을 보관하고 비활성화합니다.
5. 수동 실행과 결과를 확인한 뒤에만 필요한 자동 trigger를 추가합니다.

현재 정책은 실행 기록을 삭제하지 않으며, 저장소의 Actions 설정을 꺼서 수동 dispatch도 실행되지 않도록 합니다. Dependabot 예약 대상도 비워 둡니다. 비밀값이나 runner를 이 포크에 새로 만들지 않습니다.
