package nuri.business;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * 서비스 계층 도메인 격리(Service-Layer Domain Isolation) 아키텍처 게이트 — §2.B 재사용성.
 *
 * <p><b>배경:</b> {@link DomainIsolationTest} 는 {@code nuri.business.domain} 엔티티 슬라이스 간 결합만
 * 판정하고 <b>서비스 계층은 대상 밖</b>이다(그 javadoc 명시). 재사용성 감사(2026-07-18)는 이 사각지대에서
 * 필수 코어 서비스가 샘플 도메인을 직접 주입·호출하는 결합을 발견했다:
 * {@code UserService}(필수)가 {@code CommunityUserRepository}(샘플 system.content.community)를 주입해
 * 사용자 삭제 경로에서 호출 → 커뮤니티 도메인을 삭제하면 필수 UserService 가 컴파일 붕괴. 이 결합은
 * {@code UserDeletionEvent} 리스너로 역전했고, 본 게이트가 그 <b>재발을 기계로 차단</b>한다.
 *
 * <p><b>스코프(business-core 전속):</b> 본 테스트는 <b>business-core 테스트 소스셋</b>에 두어
 * business-core(필수 코어 + 샘플-in-core)만 스캔한다. business-app 은 business-core 에 의존하므로
 * business-core 테스트 클래스패스에 없다 → 삭제가능한 <b>샘플 계층</b>(board/note/…) 및 그 정리
 * 리스너({@code UserDeletionCleanupListener} 는 사용자 삭제 시 board/comment/community 등 샘플 종속을
 * 정리하는 <b>샘플 오케스트레이션</b>이므로 샘플-in-core 참조가 정당)는 본 게이트 대상이 아니다.
 * 우리가 지키려는 불변식은 "<b>재사용 코어(business-core 의 필수 서비스)가 삭제가능 샘플-in-core 에
 * 의존하지 않는다</b>"이다.
 *
 * <p><b>규칙:</b> {@code nuri.business.service} 하위(=business-core 서비스) 중 <b>샘플-in-core</b>
 * ({@code service.system..} = banner/popup/community/survey/consult) <b>자신을 제외</b>한 서비스는
 * 그 샘플-in-core 클러스터({@code service.system..} · {@code domain.system..})에 의존해서는 안 된다.
 * 필수↔샘플 오케스트레이션은 {@code DashboardItemProvider}·{@code UserDeletionEvent} 등 foundation
 * 포트(DIP)로 역전한다. 현재 위반 0건 → 즉시 GREEN, 신규 결합만 차단.
 */
@AnalyzeClasses(
        packages = "nuri.business.service",
        importOptions = {
                ImportOption.DoNotIncludeTests.class,
                ArchitectureTest.ExcludeQClasses.class
        }
)
public class ServiceLayerIsolationTest {

    @ArchTest
    static final ArchRule core_services_should_not_depend_on_sample_in_core =
            noClasses()
                    .that().resideInAPackage("nuri.business.service..")
                    .and().resideOutsideOfPackage("nuri.business.service.system..")
                    .should().dependOnClassesThat().resideInAnyPackage(
                            "nuri.business.service.system..",
                            "nuri.business.domain.system..")
                    .because("재사용 코어(business-core 필수 서비스)가 삭제가능 샘플-in-core(system.content/system.service: "
                            + "banner·popup·community·survey·consult)에 직접 의존하면 그 샘플을 들어낼 때 코어가 컴파일 붕괴한다"
                            + "(프레임워크 재사용성). 필수↔샘플 오케스트레이션은 DashboardItemProvider·UserDeletionEvent "
                            + "포트(DIP)로 역전한다. 신규 직접 결합이 생기면 빌드가 깨진다.")
                    .allowEmptyShould(true);
}
