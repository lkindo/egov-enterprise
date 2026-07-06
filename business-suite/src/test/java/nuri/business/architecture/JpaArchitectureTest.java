package nuri.business.architecture;

import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields;

/**
 * JPA 연관관계 N+1 방어 아키텍처 규칙.
 *
 * <p><b>강제 범위(현재):</b> 모든 JPA 연관관계(@ManyToOne/@OneToOne/@OneToMany/@ManyToMany)의
 * fetch 전략이 {@link FetchType#LAZY} 인지 바이트코드로 검증한다. EAGER 는 즉시 로딩 폭증(N+1,
 * 컬렉션 카테시안)을 유발하므로 빌드 타임에 차단한다. (컬렉션은 기본 LAZY 이지만, 실수로
 * EAGER 를 명시하는 회귀를 막기 위해 명시적으로 강제한다.)
 *
 * <p><b>강제 불가 범위(유보):</b> "조회 메서드에서 fetchJoin()/@EntityGraph/DTO 프로젝션 누락"의
 * 정적 검증(감사 보고서 방안2 본체)은 여기서 강제하지 않는다. ArchUnit 은 바이트코드만 보므로
 * JPQL/QueryDSL 문자열의 join fetch 여부나 프로젝션 형태를 신뢰성 있게 판별할 수 없고, 현재
 * 리포지토리는 @EntityGraph 사용 0건이라 하드 룰을 걸면 대량 오탐/빌드 붕괴가 발생한다.
 * 이 갭은 리포지토리 관례(컬렉션 페치가 필요한 메서드는 @EntityGraph 또는 DTO 프로젝션 사용)를
 * 선행 도입한 뒤 핵심 테이블 대상으로 좁게 게이트화하는 것을 권장한다.
 */
@AnalyzeClasses(packages = "nuri.business.domain", importOptions = ImportOption.DoNotIncludeTests.class)
public class JpaArchitectureTest {

    @ArchTest
    public static final ArchRule associationsMustBeLazy =
            fields().that().areAnnotatedWith(ManyToOne.class).or().areAnnotatedWith(OneToOne.class)
                    .or().areAnnotatedWith(OneToMany.class).or().areAnnotatedWith(ManyToMany.class)
                    .should(beLazyFetched())
                    .as("All JPA associations (ManyToOne/OneToOne/OneToMany/ManyToMany) must be FetchType.LAZY to prevent N+1 / cartesian fetches.");

    private static ArchCondition<JavaField> beLazyFetched() {
        return new ArchCondition<>("be lazy fetched") {
            @Override
            public void check(JavaField field, ConditionEvents events) {
                FetchType fetchType = getFetchType(field);
                boolean isLazy = FetchType.LAZY.equals(fetchType);
                String message = String.format("Field %s in class %s has FetchType %s (Should be LAZY)",
                        field.getName(), field.getOwner().getName(), fetchType != null ? fetchType : "EAGER (Default)");
                events.add(new SimpleConditionEvent(field, isLazy, message));
            }
        };
    }

    private static FetchType getFetchType(JavaField field) {
        if (field.isAnnotatedWith(ManyToOne.class)) {
            return field.getAnnotationOfType(ManyToOne.class).fetch();
        }
        if (field.isAnnotatedWith(OneToOne.class)) {
            return field.getAnnotationOfType(OneToOne.class).fetch();
        }
        if (field.isAnnotatedWith(OneToMany.class)) {
            return field.getAnnotationOfType(OneToMany.class).fetch();
        }
        if (field.isAnnotatedWith(ManyToMany.class)) {
            return field.getAnnotationOfType(ManyToMany.class).fetch();
        }
        return null;
    }
}
