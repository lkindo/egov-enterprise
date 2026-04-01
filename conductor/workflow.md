# Workflow

## TDD Policy

**Strictness Level:** Moderate

- 복잡한 비즈니스 로직: 테스트 선행 (Red-Green-Refactor)
- 간단한 수정/리팩토링: 테스트 추후 추가 가능
- E2E 테스트: 핵심 플로우 우선 작성

### TDD Cycle

1. **Red**: 실패하는 테스트 작성
2. **Green**: 테스트를 통과하는 최소한의 코드 작성
3. **Refactor**: 코드 정리 및 최적화

## Commit Strategy

**Conventional Commits** 준수

```
feat: 새로운 기능
fix: 버그 수정
refactor: 코드 리팩토링 (기능 변경 없음)
docs: 문서 변경
style: 코드 포맷팅 (기능 변경 없음)
test: 테스트 추가/수정
chore: 빌드/설정 관련
```

### Commit Message Format

```
<type>: <description>

- 구체적인 변경 사항 (선택)
- 관련 이슈 참조 (선택)
```

## Code Review Requirements

**Policy:** Required for non-trivial changes

- Phase 완료 시 반드시 리뷰
- 보안/성능 관련 변경은 필수 리뷰
- 간단한 수정은 self-review 가능

## Verification Checkpoints

**Policy:** After each phase completion

### Phase 완료 시 검증 항목

1. ✅ 타입 체크 (`tsc --noEmit`)
2. ✅ 빌드 성공 (`next build`, `./gradlew build`)
3. ✅ 단위 테스트 통과
4. ✅ E2E 테스트 통과 (해당 시)
5. ✅ ESLint/Prettier 검사

## Task Lifecycle

```
[ ] Pending → [~] In Progress → [x] Complete
```

### Task Completion Criteria

- 모든 acceptance criteria 충족
- 관련 테스트 통과
- 문서 업데이트 (필요 시)
- 코드 리뷰 완료
