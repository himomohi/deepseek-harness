# AGENTS.md — 이 포크의 GitHub 설정

이 포크의 GitHub Actions와 Dependabot은 자동 실행하지 않습니다. `.github/workflows/`의 파일은 복구 가능한 설명용 `workflow_dispatch` 스텁이고, `.github/dependabot.yml`은 업데이트 대상이 없습니다. 업스트림 원본은 [disabled-workflows](disabled-workflows/)에 보관합니다. 자세한 재연결 절차와 현재 GitHub 저장소 설정은 [fork-automation-policy.md](fork-automation-policy.md)를 따릅니다.

`dsh update`의 `apps/cli/src/fork-automation-policy.ts`가 머지 후 workflow를 다시 검사합니다. 새로운 업스트림 workflow를 자동으로 활성화하지 말고, 원본을 보관한 뒤 스텁으로 교체해야 합니다. 자동화 복구는 사용자의 명시적 요청과 secrets·권한·runner 검토가 끝난 뒤에만 진행합니다.
