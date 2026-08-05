package nuri.business.architecture;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.core.importer.Location;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

/**
 * 레이어 의존성·명명·순환참조·모듈경계 규칙의 유일본.
 *
 * <p>종전에는 {@code business-core} 와 {@code business-app} 의 {@code ArchitectureTest} 에
 * 바이트 동일한 사본으로 존재했다. 규칙을 여기로 올리고, 각 모듈은 {@code @AnalyzeClasses} 로
 * <b>자기 클래스패스를</b> 지정한 뒤 {@code ArchTests.in(...)} 으로 이 규칙들을 포함한다.
 *
 * <p><b>왜 이 클래스 자체를 테스트로 만들지 않는가</b>: {@code @AnalyzeClasses} 를 여기 붙여
 * testFixtures 에 두면 Gradle 의 {@code test} 태스크가 자기 모듈 산출물만 스캔하므로
 * <b>어느 모듈에서도 실행되지 않는다</b>. 규칙은 공유하되 실행은 모듈마다 일어나야 한다.
 */
public final class LayeredArchitectureRules {

    private LayeredArchitectureRules() {
    }

    /** QueryDSL Q 클래스 제외 필터 */
    public static class ExcludeQClasses implements ImportOption {
        @Override
        public boolean includes(Location location) {
            String uri = location.asURI().toString();
            return !uri.contains("/Q") && !uri.contains("$Q") && !uri.contains("/generated/");
        }
    }

    /** DTO 클래스 제외 필터 (Repository의 CQRS용 DTO 프로젝션 조회 허용 목적) */
    public static class ExcludeDtoClasses implements ImportOption {
        @Override
        public boolean includes(Location location) {
            String uri = location.asURI().toString();
            return !uri.contains("/dto/") && !uri.contains(".dto.");
        }
    }

    // ─────────────────────────────────────────────
    // 1. 레이어 의존성 규칙
    // ─────────────────────────────────────────────

    @ArchTest
    public static final ArchRule layered_architecture_rule = layeredArchitecture()
            .consideringOnlyDependenciesInAnyPackage("nuri.business.service..", "nuri.business.domain..")
            .layer("Service").definedBy("nuri.business.service..")
            .layer("Domain").definedBy("nuri.business.domain..")
            .whereLayer("Service").mayOnlyBeAccessedByLayers("Service")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Service", "Domain");

    // ─────────────────────────────────────────────
    // 2. 명명 규칙
    // ─────────────────────────────────────────────

    @ArchTest
    public static final ArchRule services_should_be_named_service =
            classes().that().areAnnotatedWith(org.springframework.stereotype.Service.class)
                    .should().haveSimpleNameEndingWith("Service")
                    .orShould().haveSimpleNameEndingWith("ServiceImpl")
                    .orShould().haveSimpleNameEndingWith("Logic")
                    .because("서비스 클래스 명명 규칙: @Service 클래스는 *Service, *ServiceImpl 또는 *Logic으로 끝나야 합니다");

    // ─────────────────────────────────────────────
    // 3. 의존성 방향 위반 금지
    // ─────────────────────────────────────────────

    @ArchTest
    public static final ArchRule domain_should_not_depend_on_service =
            noClasses().that().resideInAPackage("nuri.business.domain..")
                    .should().dependOnClassesThat(new DescribedPredicate<JavaClass>("service classes excluding DTOs") {
                        @Override
                        public boolean test(JavaClass javaClass) {
                            String packageName = javaClass.getPackageName();
                            return packageName.startsWith("nuri.business.service") && !packageName.contains(".dto");
                        }
                    })
                    .because("Domain 계층은 Service 계층에 의존해서는 안 됩니다 (단방향 의존성 원칙, 단 DTO 조회 프로젝션은 허용)");

    // ─────────────────────────────────────────────
    // 4. 순환 참조 금지
    // ─────────────────────────────────────────────

    @ArchTest
    public static final ArchRule no_cycles_in_service_packages =
            SlicesRuleDefinition.slices()
                    .matching("nuri.business.service.(*)..")
                    .should().beFreeOfCycles()
                    .because("서비스 패키지 간 순환 의존성은 유지보수성을 해칩니다");

    // ─────────────────────────────────────────────
    // 5. 모듈 경계 규칙
    // ─────────────────────────────────────────────

    @ArchTest
    public static final ArchRule foundation_should_not_depend_on_business =
            noClasses().that().resideInAPackage("nuri.foundation..")
                    .should().dependOnClassesThat().resideInAPackage("nuri.business..")
                    .because("프레임워크 핵심(foundation) 모듈은 애플리케이션(business) 모듈에 의존해서는 안 됩니다");
}
