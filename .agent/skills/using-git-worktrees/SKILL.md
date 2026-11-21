---
name: using-git-worktrees
description: Use when work in this repository needs a git worktree — points to each tool's fixed worktree, the idle check before reuse, and the approval rule for temporary worktrees (SOP §6.6)
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# 작업 트리 쓰기

이 저장소의 변경 작업은 **도구별 고정 작업 트리 + 작업별 브랜치**로 한다. 새 작업 트리를 만드는 것은 예외다. 상류 스킬의 디렉터리 선택·생성 절차는 걷었다 — 정본은 [프로토콜 §6.6](../../../docs/03-guides/orchestration-protocol.md#66-작업-트리)이다.

**상위 권위:** [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope), [AGENTS.md 공유 워킹트리와 Git](../../../AGENTS.md#공유-워킹트리와-git), [오케스트레이션 프로토콜](../../../docs/03-guides/orchestration-protocol.md)(§6.3 무거운 검증, §6.6 작업 트리). 이 스킬과 어긋나면 그쪽을 따르고 어긋난 점을 보고한다.

## 순서

1. **자기 고정 트리를 본다.** 경로 배정은 프로토콜 §6.6 의 표다. 원본 checkout 에서 시작했더라도 수정 전에 그곳으로 간다.
2. **유휴인지 확인한다.** `git worktree list --porcelain`, 그 트리의 `git status --short --untracked-files=all`, 브랜치, 실행 중인 서버·검증 프로세스. 유휴 후보는 detached HEAD 이면서 깨끗한 트리뿐이다. 깨끗하다는 것만으로 유휴라고 보지 않는다.
3. **가드가 사는지 본다.** 대상 트리에서 `echo AGENT_GUARD_CANARY` 가 막혀야 한다.
4. **작업 브랜치로 시작한다.** `git fetch origin` 뒤, 브랜치를 만들기 직전에 detached HEAD·깨끗한 트리·미사용 상태를 다시 확인한다 — 그 사이 달라졌으면 멈추고 임시 트리로 분리한다. 그대로면 `git switch --no-track -c <고유 작업 브랜치> origin/main`.
5. **의존성.** 없거나 lockfile 이 바뀌었을 때만 루트 `npm ci`, 프런트 `pnpm -C frontend install --frozen-lockfile`. `frontend/node_modules` 를 링크로 빌려 쓰면 빌드와 격리 E2E 가 실패한다.
6. **끝나면 대기 상태로.** PR 병합과 그 변경이 main 에 들어갔는지 확인하고, 병합된 PR HEAD 와 로컬·원격 작업 브랜치 HEAD 가 같은지(병합 뒤 더해진 커밋이 없는지), 미커밋·미추적 작업물이 없는지 본다. 그런 뒤 `git fetch --no-prune origin`, `git switch --detach origin/main`, 자기 작업 브랜치만 로컬 먼저·원격 나중으로 정리한다 — 순서와 확인은 [finishing-a-development-branch](../finishing-a-development-branch/SKILL.md)가 정본이다. 디렉터리·의존성·캐시는 남긴다.

## 임시 작업 트리

- 고정 트리가 다른 세션에 쓰이거나 사용 여부가 불명확할 때, 또는 실행 중인 검증의 입력을 지켜야 할 때만 만든다.
- **만들기 전에 이유를 알리고 사용자 승인을 받는다.** 실행 전 가드가 모든 `git worktree add` 를 묻는다(고정 트리를 처음 만들 때도).
- 임시 트리는 병합으로 끝나지 않는다. 그 트리를 쓰는 실행기·셸·경로 참조가 없어졌을 때 완료 보고에서 삭제를 묻는다.
- 같은 세션의 새 작업은 임시 트리에서 또 트리를 만들지 않고 자기 고정 트리부터 본다.

## 하지 않는 것

- 재사용하려고 자동 stash·강제 reset·`git clean -fdx` 를 하지 않는다.
- 다른 오퍼레이터의 작업 트리·브랜치를 전환·정리하지 않는다. 직접 만들지 않은 트리는 조사해 보고하고 지우기 전에 묻는다.
- 작업 트리 디렉터리와 그 안의 미추적 산출물은 사용자가 그 삭제를 승인했을 때만 지운다. 지울 때는 링크를 먼저 끊고 절대 경로로 확인한다.
- `.gitignore` 를 고쳐 작업 트리를 저장소 안에 두지 않는다 — 원본 checkout 밖의 짧은 경로에 둔다.
- `core.hooksPath` 를 절대 경로로 바꾸지 않는다(상대 경로 `.githooks`).
