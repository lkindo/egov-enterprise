---
name: frontend-design
description: 기존 eGov 디자인 시스템과 접근성 계약을 보존하며 목적에 맞는 프런트엔드 화면과 컴포넌트를 설계한다.
---

# Frontend Design

## 사용 원칙

1. 사용 목적, 주요 작업, 정보 우선순위, 지원 viewport와 접근성 요구를 먼저 확인한다.
2. `frontend/src/app/globals.css`, 공용 UI 컴포넌트, 프런트 헌법과 디자인 토큰 가이드를 재사용한다.
3. 기존 제품 안에서는 새로운 미학을 일방적으로 덧씌우지 않고 주변 화면의 typography·spacing·interaction과 일관성을 유지한다.
4. 새 시각 방향이 요구된 경우에도 장식보다 가독성, 작업 효율, 상태 전달을 우선한다.
5. semantic HTML, keyboard, focus, screen reader name, contrast, reduced motion, responsive overflow를 함께 설계한다.

## 구현 경계

- 팔레트 리터럴 대신 의미 토큰을 사용한다.
- animation·gradient·glass·shadow는 정보 구조를 돕는 경우에만 사용하며 기본값으로 강제하지 않는다.
- 임의 font·외부 asset·새 UI dependency를 도입하기 전에 기존 자산과 CSP·성능 영향을 확인한다.
- desktop 한 화면만 맞추지 않고 최소 320/390px과 일반 desktop에서 검증한다.
- skeleton, empty, error, loading, disabled, permission-denied 상태를 빠뜨리지 않는다.

## 검증

정적 type/lint와 관련 테스트를 실행한 뒤, 실제 브라우저에서 light/dark, keyboard, reduced-motion, overflow와 console 오류를 확인한다. 정적 build 성공만으로 시각·접근성 완료를 선언하지 않는다.
