package nuri.business.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.junit.ArchTests;

/**
 * 엔티티 생성자 규범을 <b>이 모듈의 도메인 패키지</b>에 적용한다.
 * 규칙 본문은 {@link EntityConventionRules}(testFixtures) 에 유일본으로 있다.
 */
@AnalyzeClasses(packages = "nuri.business.domain", importOptions = ImportOption.DoNotIncludeTests.class)
public class EntityConventionArchTest {

    @ArchTest
    static final ArchTests entityRules = ArchTests.in(EntityConventionRules.class);
}
