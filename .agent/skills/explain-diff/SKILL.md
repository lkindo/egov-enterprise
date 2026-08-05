---
name: explain-diff
description: Use when explaining git diffs, PR code changes, complex refactorings, or reviewing code changes with structured background, intuition, walkthroughs, and verification quizzes.
---

# Explain Diff (코드 변경 분석 및 직관적 설명 스킬)

## Overview
`explain-diff` 스킬은 코드 변경 사항(git diff, 커밋 내용, PR 등)을 단순한 백분율/라인 삭제·추가가 아닌, **배경(Background)**, **직관적 이유(Intuition)**, **코드 워크스루(Code Walkthrough)**, 그리고 **이해도 검증 퀴즈(Comprehension Quiz)** 구조로 체계적으로 설명하여 리뷰어 및 개발자의 코드 이해도를 극대화하는 표준 스킬입니다.

---

## When to Use
- Git diff 또는 특정 커밋/PR의 변경 이유와 내역을 사용자가 설명해 달라고 요청했을 때
- 대규모 리팩토링이나 복잡한 모듈 수정 후 다른 개발자/사용자에게 변경 배경과 파급 효과를 전달해야 할 때
- 코드 리뷰 승인 전 개발자의 이해도를 검증(Comprehension Gate)하고자 할 때

---

## Analysis Procedure
1. **Diff 수집**: `git diff`, `git log -p`, 또는 대상 파일의 구체적 차이점을 수집한다.
2. **컨텍스트 파악**: 변경 전 상위 시스템/모듈의 동작 방식과 문제점을 먼저 분석한다.
3. **핵심 직관 요약**: "왜 이 구조로 변경했는가"에 대한 직관과 혜택을 도출한다.
4. **논리적 워크스루 설계**: 라인 단위 나열이 아닌, 기능/의미 단위로 그룹화하여 워크스루를 구성한다.
5. **퀴즈 생성**: 변경의 핵심 목적과 주의점을 검증하는 퀴즈를 작성한다.

---

## Output Template Structure

`explain-diff` 실행 시 아래 템플릿 구조를 따라 마크다운 또는 HTML 서식으로 결과를 생성합니다.

```markdown
# 🔍 Diff Explanation: [변경 헤드라인/작업명]

## 1. 📖 Background (배경 및 기존 상태)
- **기존 동작 방식**: [기존 로직 및 문제점 또는 제약 사항]
- **변경이 필요했던 이유**: [버그, 기술 부채, 신규 요건 등]

## 2. 💡 Intuition & Core Concept (직관과 핵심 개념)
- **핵심 아이디어**: [왜 이렇게 변경했는지 한 눈에 파악할 수 있는 직관적 설명]
- **비교 요약**:
  - *Before*: [변경 전 로직]
  - *After*: [변경 후 로직]

## 3. 🚶 Code Walkthrough (코드 워크스루)
> 라인 바이 라인이 아닌 기능적 단위로 그룹화하여 설명합니다.

### 3.1 [기능 그룹 A: 예) DTO 타입 안전성 강화]
- **관련 파일**: `[path/to/file](file:///path/to/file#L10-L20)`
- **변경 내용**:
  ```diff
  - old_code()
  + new_code()
  ```
- **설명**: [이 변경이 갖는 의미와 기술적 이점]

### 3.2 [기능 그룹 B: 예) 서비스 예외 처리 개편]
- **관련 파일**: `[path/to/file2](file:///path/to/file2#L50-L75)`
- **변경 내용**: ...

## 4. ⚠️ Side-Effect & Risks (부작용 및 위험 요소)
- **영향 범위**: [타 모듈/DB/인터페이스 영향]
- **주의 사항**: [테스트 시 확인해야 할 체크포인트]

## 5. 🧩 Comprehension Quiz (이해도 검증 퀴즈)
Reviewer 또는 작성자가 변경 사항을 확실히 이해했는지 검증하기 위한 퀴즈입니다.

**Q1. [변경 사항의 핵심 원인 또는 메커니즘에 관한 질문]**
- [ ] A) [오답 보기 1]
- [ ] B) [정답 보기 - 메커니즘 반영]
- [ ] C) [오답 보기 2]
- [ ] D) [오답 보기 3]

<details>
<summary>💡 퀴즈 정답 및 해설 보기</summary>

- **정답**: **B**
- **해설**: [해당 문제의 상세 해설]
</details>
```

---

## Best Practices
1. **절대 라인 수를 나열하지 말 것**: "15번째 줄을 고쳤습니다" 대신 "권한 검증 헬퍼 함수를 통합했습니다"와 같이 비즈니스/기술적 의미 위주로 서술한다.
2. **하이퍼링크 활용**: 관련 코드를 언급할 때는 항시 `[파일명](file:///path/to/file#L1-L10)` 형식을 준수한다.
3. **퀴즈의 유용성 확보**: 단순 기억력 테스트가 아닌 "왜 이 예외를 새로 추가했는지", "수정으로 인해 변경되는 반환값 타입은 무엇인지" 등 핵심 의도를 묻는다.
