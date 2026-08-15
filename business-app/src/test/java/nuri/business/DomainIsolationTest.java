package nuri.business;

import nuri.business.architecture.LayeredArchitectureRules;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

import static com.tngtech.archunit.base.DescribedPredicate.alwaysTrue;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAnyPackage;

/**
 * 도메인 삭제가능성(Domain Deletability) 아키텍처 게이트.
 *
 * <p><b>목적(프레임워크 재사용성):</b> 본 저장소는 신규 SI/재개발의 베이스 프레임워크를 지향한다.
 * 재사용성의 핵심은 "필수(코어: foundation/admin) 도메인만 남기고 불필요한 업무 도메인은 통째로 삭제"할 수
 * 있어야 한다는 것이다. 이를 물리적으로 보장하려면 {@code nuri.business.domain.X} 하위의 형제(sibling)
 * 업무 도메인들이 서로를 직접 참조하지 않아야 한다(= 슬라이스 간 독립). 한 업무 도메인을 지웠을 때 다른
 * 업무 도메인이 컴파일 붕괴하면 그 도메인은 삭제 불가능하며, 프레임워크 재사용성이 훼손된다.
 *
 * <p><b>규칙 형태(DETECTION + ALLOW-LIST):</b> 현재 코드베이스에는 이미 알려진 결합(coupling)이
 * 존재하므로 하드 룰을 그대로 걸면 빌드가 즉시 RED가 된다. 따라서 "형제 도메인 간 상호 의존 금지"를
 * {@link SlicesRuleDefinition#slices() 슬라이스} 규칙으로 <b>탐지(detection)</b>하되, 아래 <b>현행
 * 결합을 명시적 ALLOW-LIST</b>로 예외 처리하여 빌드를 GREEN으로 유지한다. 이렇게 하면 <b>미래에 새로
 * 추가되는 업무 도메인이 형제 업무 도메인을 새로 참조하는 순간에만 빌드가 깨져</b>, 현행 부채는
 * 동결(baseline freeze)하면서도 제약을 강제할 수 있다. ALLOW-LIST의 게시판 클러스터 항목은 "언젠가
 * 풀어야 할 기술부채"의 공식 목록이기도 하다.
 *
 * <p><b>탐지 범위:</b> {@code @AnalyzeClasses(packages = "nuri.business.domain")}. 슬라이스는
 * {@code nuri.business.domain.(*)..} 의 첫 세그먼트(도메인명)로 분할되며, business-core(코어)와
 * business-app(업무) 도메인 클래스가 모두 테스트 클래스패스에 존재한다. 서비스 계층
 * ({@code nuri.business.service..})은 본 규칙의 대상이 아니다(도메인 엔티티 간 물리 결합만 판정).
 * ⚠ 주의: ArchUnit의 {@code ImportOption} 은 <b>의존 대상(target)</b> 클래스를 슬라이스에서 제외하지
 * 못한다(패키지명으로 슬라이스가 결정됨). 따라서 QueryDSL Q타입 조인이나 코어 도메인 참조는
 * ImportOption 이 아니라 아래 {@code ignoreDependency} ALLOW-LIST로 명시 예외 처리한다.
 *
 * <p><b>ALLOW-LIST 설계(2026-07-11, 실측 기반):</b> {@code :business-app:test} 실행으로 실제 위반
 * 슬라이스쌍을 전수 확인한 뒤 아래 두 버킷으로 예외를 구성했다.
 * <ul>
 *   <li><b>[버킷 1 — 코어(필수 기반) 도메인 타깃]</b> business-core에 속한 프레임워크 필수 도메인
 *       (인증/코드/메뉴/프로그램/조직/사용자/그룹/부서직무/로그인/로그/마이페이지 및 공용 커널
 *       {@code common})은 재사용 시에도 <b>절대 삭제되지 않는 코어</b>이므로, 이들을 <b>타깃</b>으로 하는
 *       참조는 전부 허용한다. (코어↔코어 결합 및 업무→코어 결합을 모두 커버. 실측 위반:
 *       auth→code, auth→menu, board→code, log→code, menu→auth, menu→program(Menu.program),
 *       user→common(RrnoEncryptionConverter), user→organization(OrganizationManage) — QueryDSL
 *       Q타입 조인 및 엔티티 참조 포함.) 업무 도메인이 <b>다른 업무 도메인</b>을 참조하는 경우는 여기에
 *       해당하지 않으므로 여전히 탐지된다.</li>
 *   <li><b>[버킷 2 — 게시판 클러스터 상호 결합(업무↔업무 기술부채, 향후 분리 대상)]</b>
 *       {@code comment → board}({@code Comment.board @ManyToOne}), {@code board → comment}
 *       ({@code Board.comments @OneToMany}, 양방향), {@code scrap → board}({@code Scrap.board
 *       @ManyToOne}), {@code operation → informalsanction}({@code RewardManage.informalSanction}).
 *       앞의 셋은 게시판 클러스터이고 마지막은 보상 승인 클러스터다. 각각 템플릿에서 함께 삭제되며,
 *       단독 삭제가 필요해지면 연관을 포트/식별자 참조로 분리해야 하는 <b>명시적 기술부채</b>다.</li>
 * </ul>
 *
 * <p><b>참고(범위 밖 결합):</b> {@code RealTimeDashboardService}(서비스 계층, {@code service.stats})가
 * {@code domain.notification}/게시글 이벤트에 의존하는 결합은 도메인 엔티티 결합이 아니라 서비스
 * 오케스트레이션이므로 본 도메인 슬라이스 규칙의 판정 대상이 아니다(레이어 규칙이 별도 관리).
 */
@AnalyzeClasses(
        packages = "nuri.business.domain",
        importOptions = {
                ImportOption.DoNotIncludeTests.class,
                LayeredArchitectureRules.ExcludeQClasses.class
        }
)
public class DomainIsolationTest {

    /** 코어(필수 기반) 도메인 패키지 식별자 — 삭제 대상이 아니므로 참조 타깃으로 허용한다. */
    private static final String[] CORE_DOMAIN_PACKAGES = {
            "nuri.business.domain.auth..",
            "nuri.business.domain.code..",
            "nuri.business.domain.common..",
            "nuri.business.domain.deptjob..",
            "nuri.business.domain.file..",
            "nuri.business.domain.group..",
            "nuri.business.domain.log..",
            "nuri.business.domain.login..",
            "nuri.business.domain.menu..",
            "nuri.business.domain.mypage..",
            "nuri.business.domain.organization..",
            "nuri.business.domain.program..",
            "nuri.business.domain.user.."
    };

    @ArchTest
    static final ArchRule sibling_domains_should_be_independent =
            SlicesRuleDefinition.slices()
                    .matching("nuri.business.domain.(*)..")
                    .should().notDependOnEachOther()
                    // ── ALLOW-LIST 1: 코어(필수 기반) 도메인은 삭제되지 않는 프레임워크 기반 → 타깃 허용 ──
                    .ignoreDependency(alwaysTrue(), resideInAnyPackage(CORE_DOMAIN_PACKAGES))
                    // ── ALLOW-LIST 2: 게시판 클러스터 기존 상호 결합(업무↔업무 기술부채, 향후 분리 대상) ──
                    // comment → board (Comment.board @ManyToOne)
                    .ignoreDependency(
                            resideInAPackage("nuri.business.domain.comment.."),
                            resideInAPackage("nuri.business.domain.board.."))
                    // board → comment (Board.comments @OneToMany, 양방향 매핑)
                    .ignoreDependency(
                            resideInAPackage("nuri.business.domain.board.."),
                            resideInAPackage("nuri.business.domain.comment.."))
                    // scrap → board (Scrap.board @ManyToOne)
                    .ignoreDependency(
                            resideInAPackage("nuri.business.domain.scrap.."),
                            resideInAPackage("nuri.business.domain.board.."))
                    // operation → informalsanction (RewardManage.informalSanction, 보상 승인 클러스터)
                    .ignoreDependency(
                            resideInAPackage("nuri.business.domain.operation.."),
                            resideInAPackage("nuri.business.domain.informalsanction.."))
                    .because("업무 도메인은 서로 독립적이어야 통째로 삭제/재사용할 수 있다(프레임워크 재사용성). "
                            + "코어 도메인 참조는 허용하되, 게시판·보상승인 클러스터의 업무↔업무 결합은 현행 기술부채로 동결한다. "
                            + "신규 업무 도메인이 형제 업무 도메인을 새로 참조하면 빌드가 깨진다.")
                    .allowEmptyShould(true);
}
