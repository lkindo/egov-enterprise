package nuri.business.architecture;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaModifier;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.persistence.Entity;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;

/**
 * 영속 엔티티(@Entity) 생성자 규범 회귀 가드의 유일본 (백엔드 아키텍처 헌법 Phase 5.2 규칙 c).
 *
 * <p><b>중요:</b> 클래스 레벨 {@code @SuperBuilder}/{@code @Builder} 금지(규칙 a)는 ArchUnit 으로
 * 강제할 수 없다. Lombok 애노테이션은 {@code RetentionPolicy.SOURCE} 라 컴파일된 바이트코드에 흔적이
 * 남지 않으므로, 바이트코드 분석 기반의 ArchUnit 은 이를 탐지할 수 없기 때문이다.
 * 규칙(a) 의 회귀 차단은 {@code EntityLombokSourceLinterTest} 가 소스 레벨에서 담당한다.
 * 규칙(b) 의 수동 빌더 위임 의미는 현재 코드리뷰로 보완한다.
 *
 * <p>실행은 각 모듈의 {@code EntityConventionArchTest} 가 담당한다.
 * 자세한 이유는 {@link LayeredArchitectureRules} 참조.
 */
public final class EntityConventionRules {

    private EntityConventionRules() {
    }

    /**
     * 규칙(c): 엔티티 기본 생성자는 non-public 이어야 한다.
     * JPA 프록시 보장 및 무분별한 외부 인스턴스화 방지. (@NoArgsConstructor(access = PROTECTED) 등)
     */
    @ArchTest
    public static final ArchRule entityNoArgConstructorMustNotBePublic =
            classes().that().areAnnotatedWith(Entity.class)
                    .should(haveNonPublicNoArgConstructor())
                    .as("영속 엔티티의 기본 생성자는 public 이 아니어야 한다 (protected/package-private, JPA 프록시 보장).");

    private static ArchCondition<JavaClass> haveNonPublicNoArgConstructor() {
        return new ArchCondition<>("have a non-public no-arg constructor") {
            @Override
            public void check(JavaClass javaClass, ConditionEvents events) {
                boolean hasNoArg = javaClass.getConstructors().stream()
                        .anyMatch(c -> c.getRawParameterTypes().isEmpty());
                boolean hasPublicNoArg = javaClass.getConstructors().stream()
                        .filter(c -> c.getRawParameterTypes().isEmpty())
                        .anyMatch(c -> c.getModifiers().contains(JavaModifier.PUBLIC));
                boolean satisfied = hasNoArg && !hasPublicNoArg;
                String message = String.format("%s 의 기본 생성자가 %s",
                        javaClass.getName(), !hasNoArg ? "존재하지 않음" : "public 임");
                events.add(new SimpleConditionEvent(javaClass, satisfied, message));
            }
        };
    }
}
