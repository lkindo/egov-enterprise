package nuri;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTag;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * api-server 모듈 아키텍처 검증 테스트 (ArchUnit)
 */
@AnalyzeClasses(
    packages = "nuri",
    importOptions = {
        ImportOption.DoNotIncludeTests.class
    }
)
@ArchTag("architecture-gate")
public class ArchitectureTest {

    // ─────────────────────────────────────────────
    // 1. 프레젠테이션 계층 엔티티 직접 참조 금지 (백엔드 헌법 제3조 1항)
    // ─────────────────────────────────────────────
    @ArchTest
    static final ArchRule controller_should_not_depend_on_entity =
            noClasses().that().resideInAPackage("nuri.api..")
                    .should().dependOnClassesThat().areAnnotatedWith(jakarta.persistence.Entity.class)
                    .because("프레젠테이션(API) 계층은 JPA Entity를 직접 사용하거나 의존해서는 안 되며, DTO를 사용해야 합니다 (백엔드 헌법 제3조 1항)");
}
