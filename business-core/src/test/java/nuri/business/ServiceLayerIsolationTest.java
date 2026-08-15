package nuri.business;

import nuri.business.architecture.LayeredArchitectureRules;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * 코어 모듈 제품 경계 게이트 — §2.B 재사용성.
 *
 * <p>2026-08-15 결정으로 banner·popup·community·survey를 {@code business-app}으로 이관했다.
 * 패키지/API/DB 계약은 그대로 두되 물리 모듈만 옮겨, {@code business-core}는 인증·사용자·조직·메뉴·
 * 코드·정책 등 신규 프로젝트가 항상 필요로 하는 기반만 보유한다. 샘플이 코어로 다시 들어오면
 * {@code template/reusable-base}와 본 브랜치의 경계가 다시 어긋나므로 이 규칙이 즉시 차단한다.
 *
 * <p>{@code business-core:test} 클래스패스에는 상위 모듈인 {@code business-app}이 없다. 따라서 아래
 * 금지 패키지가 0개라는 사실은 "앱 코드를 금지"하는 것이 아니라 "코어 안에 앱 코드가 없다"는
 * 물리 경계의 실행 가능한 증거다. 코어→앱 의존은 Gradle 단방향 때문에 컴파일 단계에서도 불가능하다.
 */
@AnalyzeClasses(
        packages = "nuri.business",
        importOptions = {
                ImportOption.DoNotIncludeTests.class,
                LayeredArchitectureRules.ExcludeQClasses.class
        }
)
public class ServiceLayerIsolationTest {

    @ArchTest
    static final ArchRule sample_domains_should_not_reside_in_business_core =
            noClasses()
                    .should().resideInAnyPackage(
                            "nuri.business.domain.system.content.banner..",
                            "nuri.business.domain.system.content.popup..",
                            "nuri.business.domain.system.content.community..",
                            "nuri.business.domain.system.service.survey..",
                            "nuri.business.domain.system.service.consult..",
                            "nuri.business.service.system.content.banner..",
                            "nuri.business.service.system.content.popup..",
                            "nuri.business.service.system.content.community..",
                            "nuri.business.service.system.service.survey..",
                            "nuri.business.service.system.service.consult..")
                    .because("삭제 가능한 샘플 도메인은 business-app에만 있어야 business-core가 재사용 필수 코어로 유지된다");
}
