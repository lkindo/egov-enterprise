# Lombok `@SuperBuilder` shadowing 주의사항

수동 builder 확장 클래스가 Lombok이 생성하는 필드와 같은 이름의 instance field를 선언하면, 편의 메서드가 그 수동 필드만 갱신하고 최종 `build()`에는 값이 전달되지 않을 수 있다. 컴파일 성공만으로 안전하지 않다.

## 금지 패턴

```java
public static class ExampleBuilder<C extends Example, B extends ExampleBuilder<C, B>> {
    private String readYn;

    public B read(boolean value) {
        this.readYn = value ? "Y" : "N";
        return self();
    }
}
```

## 위임 패턴

수동 편의 메서드는 별도 상태를 만들지 않고 Lombok이 생성한 builder method로 위임한다.

```java
public B read(boolean value) {
    return this.readYn(value ? "Y" : "N");
}
```

## 이 저장소의 우선 규칙

백엔드 헌법은 JPA Entity의 class-level `@Builder`·`@SuperBuilder`를 금지한다. 따라서 새 Entity에서 이 패턴을 도입하지 말고 의도가 드러나는 정적 factory에 method-level `@Builder`를 적용한다. 이 문서의 shadowing 지침은 허용된 method-level `@Builder`의 수동 builder 확장, 비-Entity 상속 DTO 또는 기존 호환 코드에 적용하며 Entity의 class-level 빌더를 허용하는 근거가 아니다.

## 검증

- 수동 builder 안에 대상 객체 필드와 같은 이름의 instance field가 없는지 확인한다.
- 편의 메서드가 생성 builder method로 위임하는지 확인한다.
- 실제 `build()` 결과의 모든 관련 필드를 단위 테스트로 검증한다.
- Entity 변경이면 class-level Lombok 금지를 검사하는 `EntityLombokSourceLinterTest`와 non-public 기본 생성자를 검사하는 두 모듈의 `EntityConventionArchTest`를 함께 실행한다.

과거 사례·파일 경로·완료 이력은 이 규칙의 정본이 아니므로 문서에 복제하지 않는다.
