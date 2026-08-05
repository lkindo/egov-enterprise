package nuri.business;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.junit.ArchTests;
import nuri.business.architecture.LayeredArchitectureRules;

/**
 * 레이어/명명/순환/모듈경계 규칙을 <b>이 모듈의 클래스패스</b>에 적용한다.
 *
 * <p>규칙 본문은 {@link LayeredArchitectureRules}(testFixtures) 에 유일본으로 있다.
 * 스캔 대상은 모듈마다 다르므로 {@code @AnalyzeClasses} 만 여기 남기고 규칙은 포함해 쓴다.
 */
@AnalyzeClasses(
        packages = "nuri",
        importOptions = {
                ImportOption.DoNotIncludeTests.class,
                LayeredArchitectureRules.ExcludeQClasses.class,
                LayeredArchitectureRules.ExcludeDtoClasses.class
        }
)
public class ArchitectureTest {

    @ArchTest
    static final ArchTests layeredRules = ArchTests.in(LayeredArchitectureRules.class);
}
