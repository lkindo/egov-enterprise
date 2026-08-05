package nuri.business.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.junit.ArchTests;

/**
 * JPA 연관관계 N+1 방어 규칙을 <b>이 모듈의 도메인 패키지</b>에 적용한다.
 * 규칙 본문은 {@link JpaArchitectureRules}(testFixtures) 에 유일본으로 있다.
 */
@AnalyzeClasses(packages = "nuri.business.domain", importOptions = ImportOption.DoNotIncludeTests.class)
public class JpaArchitectureTest {

    @ArchTest
    static final ArchTests jpaRules = ArchTests.in(JpaArchitectureRules.class);
}
