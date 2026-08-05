package nuri.business.architecture;

import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.domain.JavaMethod;
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
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;

/**
 * JPA 연관관계 N+1 방어 아키텍처 규칙의 유일본.
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
 *
 * <p><b>좁은 게이트(2026-07-07 신설):</b> 코어 도메인(게시판/회원/권한/메뉴) 조사 결과 컬렉션(to-many)을
 * 소유한 엔티티는 {@code Board.comments} 하나뿐이며(회원/권한/메뉴는 복합키 조인 엔티티로 모델링),
 * 목록/상세 읽기 경로는 이미 QueryDSL DTO 프로젝션(searchArticles→BoardSearchResult,
 * findArticleDetail→BoardDetailResult)으로 N+1 을 회피한다. 따라서 "@EntityGraph 강제"는 실익이 없고
 * (오히려 페이지네이션 함정 유발) 정적 fetchJoin 판별은 위와 같이 불가하므로, 대신 실제 회귀
 * 위험인 <b>@EntityGraph + 페이지네이션 함정</b>을 {@link #entityGraphMustNotBeUsedWithPagination}
 * 규칙으로 좁게 강제한다.
 *
 * <p>실행은 각 모듈의 {@code JpaArchitectureTest} 가 담당한다 — 규칙은 공유하되 스캔 대상은
 * 모듈마다 다르기 때문이다. 자세한 이유는 {@link LayeredArchitectureRules} 참조.
 */
public final class JpaArchitectureRules {

    private JpaArchitectureRules() {
    }

    @ArchTest
    public static final ArchRule associationsMustBeLazy =
            fields().that().areAnnotatedWith(ManyToOne.class).or().areAnnotatedWith(OneToOne.class)
                    .or().areAnnotatedWith(OneToMany.class).or().areAnnotatedWith(ManyToMany.class)
                    .should(beLazyFetched())
                    .as("All JPA associations (ManyToOne/OneToOne/OneToMany/ManyToMany) must be FetchType.LAZY to prevent N+1 / cartesian fetches.");

    /**
     * 방안2 좁은 게이트: {@code @EntityGraph} 가 붙은 리포지토리 메서드는 {@link Pageable} 을 받을 수 없다.
     * 컬렉션(to-many)을 페치하는 @EntityGraph 를 페이지네이션과 결합하면 Hibernate 가 메모리 내
     * 페이징(HHH000104)으로 전락해 성능/정확성 결함이 발생한다. 페이지네이션 조회는 @EntityGraph
     * 컬렉션 페치가 아니라 DTO 프로젝션을 사용해야 한다(현재 코드베이스의 확립된 관례).
     * (현재 @EntityGraph 사용 0건 → allowEmptyShould 로 vacuous-green 허용, 회귀만 차단.)
     */
    @ArchTest
    public static final ArchRule entityGraphMustNotBeUsedWithPagination =
            methods().that().areAnnotatedWith(EntityGraph.class)
                    .should(notDeclarePageableParameter())
                    .as("Repository methods annotated with @EntityGraph must not declare a Pageable parameter "
                            + "(@EntityGraph collection fetch + pagination => in-memory pagination, HHH000104). "
                            + "Use a DTO projection for paginated reads instead.")
                    .allowEmptyShould(true);

    private static ArchCondition<JavaMethod> notDeclarePageableParameter() {
        return new ArchCondition<>("not declare a Pageable parameter") {
            @Override
            public void check(JavaMethod method, ConditionEvents events) {
                boolean hasPageable = method.getRawParameterTypes().stream()
                        .anyMatch(type -> type.isEquivalentTo(Pageable.class));
                String message = String.format(
                        "Method %s is annotated @EntityGraph and declares a Pageable parameter",
                        method.getFullName());
                events.add(new SimpleConditionEvent(method, !hasPageable, message));
            }
        };
    }

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
