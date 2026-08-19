# 정체성 모델 사용 규약 가이드 (Identity Model Convention Guide)

> **목적**: 시스템 전반에서 사용되는 두 가지 사용자 식별자(esntlId / loginId)의 **용도·경계·사용 규칙**을 성문화하여 정체성 축 혼동을 방지한다. 규범 원본은 [백엔드 헌법 제8조](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md)이며, 이 문서는 적용 예를 제공한다.

---

## 1. 두 식별자의 정의

| 식별자 | 필드명 | 출처 | 의미 |
|--------|--------|------|------|
| **esntlId** | `CustomUserDetails.esntlId` | User 엔티티 PK (`tb_user_info.esntl_id`) | 시스템 내부 고유 식별자. UUID 기반의 불투명 값. |
| **loginId** | `CustomUserDetails.userId` | User 엔티티 (`tb_user_info.user_id`) | 사용자가 로그인 시 입력하는 ID. 사람이 읽을 수 있는 값. |

### Spring Security 계약상 특이사항

```
CustomUserDetails.getUsername()  →  esntlId  (⚠ 로그인 ID가 아님!)
CustomUserDetails.getUserId()   →  loginId
CustomUserDetails.getLoginId()  →  loginId  (getUserId의 가독성 별칭)
```

> **⚠ 핵심 함정**: `getUsername()`이라는 이름과 달리 **esntlId**를 반환한다.
> 이는 Spring Security가 `getUsername()`을 인증 주체의 유일 식별자로 사용하기 때문이며,
> 우리 시스템에서는 그 역할을 esntlId가 담당한다.

---

## 2. 상황별 사용 기준

### ✅ loginId를 사용하는 경우 (대부분의 비즈니스 로직)

| 상황 | 이유 | 코드 참조 |
|------|------|----------|
| **감사 컬럼** (`frstRgtrId` / `lastMdfrId`) | `LoginUserAuditorAware`가 `getUserId()`(=loginId)를 반환 | `LoginUserAuditorAware.getCurrentAuditor()` |
| **소유권(IDOR) 비교** | `frstRgtrId`에 저장된 값이 loginId이므로 동일 축으로 비교해야 함 | `SecurityUtil.assertOwnerOrAdmin()` |
| **투표/설문 중복 참여 검증** | `frstRgtrId` 기반 유니크 제약과 정합해야 함 | `OnlinePollService.vote()` |
| **UI 표시용 사용자 식별** | 사람이 읽을 수 있는 값 | DTO 내 `userId` 필드 |

### ✅ esntlId를 사용하는 경우 (제한적)

| 상황 | 이유 | 코드 참조 |
|------|------|----------|
| **Spring Security 내부** | `Authentication.getName()` 등 프레임워크 내부 계약 | `SecurityContextHolder` |
| **User 엔티티 PK 조회** | DB에서 User를 PK로 조회할 때 | `UserRepository.findByEsntlId()` |
| **JWT 토큰 subject** | 토큰의 `sub` claim에 불투명 식별자 사용 | JWT 발급/검증 로직 |
| **esntlId 소유권 도메인의 소유자 비교** | 해당 도메인이 소유자 식별자 컬럼을 **esntlId로 저장**하므로 동일 축(esntlId)으로 비교해야 함 | `InformalSanctionServiceImpl`(aplcntId/aprvrId), `BoardService`(userId), `BoardMasterApiController` |

> **⚠ 소유권 축은 도메인마다 다르다 (§6 체크리스트 적용 전 반드시 확인):**
> - **loginId 축**(감사컬럼 `frstRgtrId` 기반, 표준): AddressBook·Comment·MemoReport·WorkReport·Schedule·Scrap 등 → `assertOwnerOrAdmin(entity.getFrstRgtrId())`.
> - **esntlId 축**(도메인 고유 소유자 컬럼): `InformalSanction`(aplcntId=esntlId), `Board`(userId=esntlId, 컨트롤러가 `getUsername()`=esntlId를 저자로 고정) 등 → `getCurrentEsntlId()`로 비교. 이 도메인에 `frstRgtrId`(loginId) 기반 비교를 강제하면 **소유자 판정이 깨진다.**
> - 신규 소유권 로직 추가 시, 비교 대상 컬럼이 loginId를 담는지 esntlId를 담는지를 **채움 지점(create)에서 먼저 확인**하고 동일 축의 `getCurrentLoginId()`/`getCurrentEsntlId()`를 선택한다.

---

## 3. SecurityUtil 메서드 매핑 표

| 메서드 | 반환값 | 용도 | 비고 |
|--------|--------|------|------|
| `getCurrentEsntlId()` | `Optional<String>` — esntlId | Spring Security 내부, User PK 조회, **esntlId-축 도메인 소유권 비교**(§2.4) | **감사 컬럼·표준(frstRgtrId) 소유권에 사용 금지** |
| `getCurrentLoginId()` | `Optional<String>` — loginId | 감사 컬럼 비교, 소유권 검증, 투표 식별 | **비즈니스 로직 기본값** |
| ~~`getCurrentUserId()`~~ | ~~esntlId~~ | ~~사용 금지~~ | `@Deprecated` — 하위 호환 시그니처일 뿐이며 신규 호출은 `IdentityAxisLinterTest`가 차단한다. 의도를 드러내는 두 메서드 중 하나를 선택한다. |
| `assertOwnerOrAdmin(ownerLoginId)` | void (예외 발생) | IDOR 방어 가드 | `getCurrentLoginId()` 기반 비교 |

---

## 4. 데이터 흐름도

```
사용자 로그인
    │
    ├─ CustomUserDetailsService 가 User 엔티티 조회
    │   ├─ userId (loginId) ─────────┐
    │   └─ esntlId (시스템 PK) ──┐   │
    │                            │   │
    ▼                            ▼   ▼
 CustomUserDetails           getUsername()=esntlId
    │                        getUserId()=loginId
    │                        getLoginId()=loginId
    │
    ├─ SecurityContextHolder 에 Authentication 으로 저장
    │
    ├─ LoginUserAuditorAware.getCurrentAuditor()
    │   └─ getUserId() → loginId → frstRgtrId / lastMdfrId 감사 컬럼에 기록
    │
    ├─ SecurityUtil.getCurrentEsntlId()
    │   └─ getUsername() → esntlId (Spring Security 내부용)
    │
    └─ SecurityUtil.getCurrentLoginId()
        └─ getLoginId() → loginId (비즈니스 로직, 소유권 비교용)
```

---

## 5. 안티패턴 (하지 말 것)

### ❌ 안티패턴 1: 감사 컬럼을 esntlId로 비교

```java
// ❌ 절대 금지 — frstRgtrId에는 loginId가 저장되므로 항상 불일치
String esntlId = SecurityUtil.getCurrentEsntlId().orElseThrow();
if (!esntlId.equals(entity.getFrstRgtrId())) {
    throw new AccessDeniedException("not owner");
}
```

```java
// ✅ 올바른 방법
SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());
// 또는
String loginId = SecurityUtil.getCurrentLoginId().orElseThrow();
if (!loginId.equals(entity.getFrstRgtrId())) { ... }
```

### ❌ 안티패턴 2: getCurrentUserId() 사용 (Deprecated)

```java
// ❌ 이름과 달리 esntlId를 반환하는 함정 메서드
String userId = SecurityUtil.getCurrentUserId().orElseThrow();
```

```java
// ✅ 의도가 명확한 메서드 사용
String esntlId = SecurityUtil.getCurrentEsntlId().orElseThrow(); // 시스템 PK가 필요할 때
String loginId = SecurityUtil.getCurrentLoginId().orElseThrow();  // 비즈니스 식별이 필요할 때
```

### ❌ 안티패턴 3: authentication.getName()을 loginId로 오인

```java
// ❌ getName() = getUsername() = esntlId — loginId가 아님!
String name = SecurityContextHolder.getContext().getAuthentication().getName();
entity.setSomeOwnerId(name); // esntlId가 저장됨
```

---

## 6. 신규 도메인 추가 시 체크리스트

새로운 비즈니스 도메인을 추가할 때 아래 항목을 확인한다:

- [ ] 소유자 컬럼의 채움 지점을 확인해 해당 값이 loginId인지 esntlId인지 판정했는가?
- [ ] 감사컬럼(`frstRgtrId`/`lastMdfrId`) 기반 소유권은 `SecurityUtil.assertOwnerOrAdmin(...)` 또는 `getCurrentLoginId()`로 비교하는가?
- [ ] esntlId를 저장하는 도메인 고유 소유자 컬럼은 `getCurrentEsntlId()`로 같은 축을 비교하는가?
- [ ] DTO에 노출하는 사용자 식별자가 제품 요구와 개인정보 경계에 맞는가?
- [ ] `getCurrentUserId()`(Deprecated)를 호출하고 있지는 않은가?

---

## 7. 관련 코드 참조

| 파일 | 역할 |
|------|------|
| [`CustomUserDetails.java`](../../foundation/src/main/java/nuri/foundation/security/service/CustomUserDetails.java) | 두 식별자를 보유하는 인증 주체 |
| [`SecurityUtil.java`](../../business-core/src/main/java/nuri/business/security/util/SecurityUtil.java) | 식별자 접근 유틸리티 + IDOR 가드 |
| [`LoginUserAuditorAware.java`](../../business-core/src/main/java/nuri/business/security/audit/LoginUserAuditorAware.java) | JPA Auditing — loginId를 감사 컬럼에 기록 |
| [`BaseEntity.java`](../../foundation/src/main/java/nuri/foundation/domain/common/BaseEntity.java) | 감사 컬럼(`frstRgtrId`/`lastMdfrId`) 정의 |

---

**1줄 요약**: 감사 컬럼은 **loginId**를 사용하고, 도메인 소유권은 저장된 컬럼과 같은 축을 비교하며, Spring Security 내부·User PK 조회에는 **esntlId**를 사용한다.

*Last reviewed against current sources: 2026-08-19.*
