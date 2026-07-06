# Lombok `@SuperBuilder` Shadowing Gotchas & Standards

Lombok의 `@SuperBuilder`는 상속 관계에 있는 엔티티나 DTO 객체에서 풍부한 빌더 패턴을 구현할 때 매우 유용한 도구입니다. 그러나 수동으로 빌더를 확장할 때 발생할 수 있는 **필드 섀도잉(Shadowing) 버그**는 빌드 성공 후 런타임에 값이 유실되는 대단히 까다로운 오작동을 유발합니다. 

이 문서는 이 버그의 메커니즘을 상세히 규명하고, 영구적인 예방을 위한 표준 코드 패턴을 정의합니다.

---

## 1. 섀도잉 결함의 개요 (The Shadowing Bug)

### 현상
클래스에 `@SuperBuilder`를 선언하고, 특정 편의 메서드(Convenience Methods)나 복잡한 초기화 로직을 주입하기 위해 **수동으로 커스텀 빌더 클래스를 확장**할 때 발생합니다. 

빌더 클래스 내부에 대상 엔티티/DTO 필드와 **동일한 이름 및 타입의 로컬 인스턴스 필드를 중복 정의**할 경우, 컴파일과 빌드는 정상 통과하지만 **런타임에 최종 객체 빌드 시 값이 `null` 혹은 기본값(Default value)으로 유실**되는 결함이 발생합니다.

### 근본 원인 (Root Cause)
Lombok `@SuperBuilder`는 내부적으로 부모-자식 관계의 빌더를 유기적으로 연결하기 위해 `SelfType`과 추상 빌더 구현체(`C`)를 자동 생성합니다. 
Lombok이 자동으로 생성하는 빌더 메서드(예: `readYn(String readYn)`)는 Lombok이 관리하는 내부 필드에 값을 저장합니다. 

그러나 아래처럼 수동 빌더 내부에 필드를 직접 정의하면:

```java
// [결함 코드 패턴]
public static class NotificationBuilder<C extends Notification, B extends NotificationBuilder<C, B>> 
        extends BaseNotificationBuilder<C, B> {
    
    private String readYn; // ❌ 섀도잉 발생 원인: Lombok 자동 생성 필드를 덮어씀

    public B read(boolean isRead) {
        this.readYn = isRead ? "Y" : "N"; // ❌ 수동 빌더의 로컬 필드에 대입됨
        return self();
    }
}
```

1. 개발자가 작성한 `read(boolean)` 메서드는 수동 빌더의 로컬 필드 `this.readYn`에 값을 할당합니다.
2. 하지만 Lombok의 최종 `.build()` 메서드는 Lombok이 생성한 자동 빌더 내부 필드(이 필드는 값이 대입되지 않아 `null` 상태)를 기준으로 실제 엔티티 생성자나 세터를 호출합니다.
3. 결과적으로 `this.readYn`에 보관된 값은 가려져(Shadowed) 최종 인스턴스에 적용되지 않고 증발합니다.

---

## 2. 해결 패턴: 위임 체이닝 (Delegation Chaining Pattern)

이 결함을 차단하는 유일하고 완벽한 **표준 해결 패턴**은 **"수동 빌더 클래스 내부에는 인스턴스 변수를 절대로 선언하지 않고, Lombok이 생성한 빌더 메서드로 위임 체이닝을 수행하는 것"**입니다.

### [Golden Pattern]
```java
public static class NotificationBuilder<C extends Notification, B extends NotificationBuilder<C, B>> 
        extends BaseNotificationBuilder<C, B> {
    
    // 1. 중복된 로컬 필드 선언을 완전히 제거한다 (No Fields allowed).

    // 2. 수동 편의 메서드는 오직 Lombok 빌더 메서드로 값을 위임(Delegation)한다.
    public B read(boolean isRead) {
        // super 혹은 상위 빌더가 노출하는 Lombok 자동 생성 메서드를 직접 호출
        return this.readYn(isRead ? "Y" : "N"); 
    }
}
```

이렇게 하면 `read` 메서드를 호출할 때 실제 Lombok의 바이트코드 생성 영역에 정확히 데이터가 전달되어 객체 생성 시 값이 완벽하게 유지됩니다.

---

## 3. 실무 개선 사례 (Case Study)

### 대상 파일
- [Notification.java](file:///d:/project/egov-enterprise/business-suite/src/main/java/nuri/business/domain/notification/Notification.java)

### 리팩토링 Diffs

```diff
 public abstract class Notification extends BaseEntity {
     
     // ... 필드 정의 ...
 
     public static class NotificationBuilder<C extends Notification, B extends NotificationBuilder<C, B>> 
             extends BaseNotificationBuilder<C, B> {
         
-        private String readYn;
-        private String sendYn;
-        private LocalDateTime readDt;
-        private LocalDateTime sendDt;
 
         public B read(boolean isRead) {
-            this.readYn = isRead ? "Y" : "N";
-            this.readDt = isRead ? LocalDateTime.now() : null;
-            return self();
+            return this.readYn(isRead ? "Y" : "N")
+                       .readDt(isRead ? LocalDateTime.now() : null);
         }
 
         public B send(boolean isSent) {
-            this.sendYn = isSent ? "Y" : "N";
-            this.sendDt = isSent ? LocalDateTime.now() : null;
-            return self();
+            return this.sendYn(isSent ? "Y" : "N")
+                       .sendDt(isSent ? LocalDateTime.now() : null);
         }
     }
 }
```

---

## 4. 에이전트 체크리스트 (Agent Checklist)

향후 `@SuperBuilder`를 상속 구조에 도입하거나, 기존 엔티티의 수동 빌더를 수정할 때 에이전트는 다음 사항을 반드시 자가 검증하십시오.

- [ ] 수동 빌더 클래스(예: `XxxBuilder`) 내부에 멤버 변수가 정의되어 있는가? (있다면 **즉시 제거**)
- [ ] 수동 편의 메서드가 `this.fieldName = value;` 형태로 값을 대입하고 있는가? (그렇다면 **`this.fieldName(value)` 형태의 빌더 위임 체이닝으로 수정**)
- [ ] `@SuperBuilder`가 적용된 모든 계층(부모 클래스, 자식 클래스)이 정상적으로 어노테이션을 상속받고 있는가?
- [ ] 수정 후 관련 단위/통합 테스트에서 필드 누락으로 인한 Assert 에러가 발생하지 않는가? (예: `NotificationServicePaginationTest.getUnreadCount()`)
