package nuri.business.service.menu.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 메뉴 연결 라우트의 쿼리 키 allowlist 계약 (PD-UX-002 Q3).
 *
 * <p><b>무엇을 막는가.</b> {@code modern_route} 는 DB 가 소유하는 URL 공간이다. 프런트의
 * {@code normalizeInternalRoute} 는 origin·제어문자·경로 모호성만 보고 <b>쿼리를 의도적으로
 * 보존</b>하므로, 메뉴 행에 들어간 쿼리는 그대로 사용자 URL 이 된다. 종전 방어선은 DTO 의
 * {@code @Size(max = 500)} 하나였고 DB 에도 형식 CHECK 제약이 없어(2026-09-04 실측),
 * 관리자가 '연결 라우트' 자유 입력칸에 {@code ?q=<사람 이름>} 을 타이핑하면 그것이 URL 이 됐다.
 *
 * <p><b>왜 여기서 검사하는가.</b> 읽기 쪽에서 잘라내면 저장된 값이 조용히 달라져 관리자가 이유를
 * 모른다. 저장에서 거부해야 입력한 사람에게 사유를 말할 수 있다.
 *
 * <p><b>실측 근거(2026-09-04, e2e Postgres 17.9).</b> 메뉴 90행 중 {@code modern_route} 보유 76,
 * 쿼리 보유 12행이며 distinct 키는 {@code tab} <b>1종</b>(값 12개 전부 열거형)이다.
 * {@code bbsId} 는 시드에 없고 게시판 생성 마법사가 런타임에 써 넣는다.
 * 아래 정상 케이스는 그 76행에서 형태별로 뽑았다 — 즉 이 계약은 <b>현행 데이터를 100% 통과</b>시킨다.
 *
 * <p>⚠ 이 테스트가 red 인데 패턴을 넓혀 통과시키는 것은 수정이 아니라 은폐다.
 * 키를 늘려야 한다면 그 키가 URL 에 실려도 되는 값인지부터 판정하고, 사유를 함께 남긴다.
 */
class MenuRouteQueryKeyTest {

    private static final Validator VALIDATOR;

    static {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            VALIDATOR = factory.getValidator();
        }
    }

    private Set<ConstraintViolation<MenuDto>> validate(String modernRoute) {
        MenuDto dto = MenuDto.builder()
                .menuNm("검증용 메뉴")
                .modernRoute(modernRoute)
                .build();
        return VALIDATOR.validateProperty(dto, "modernRoute");
    }

    @ParameterizedTest(name = "허용: {0}")
    @ValueSource(strings = {
            // 시드 76행에서 형태별로 뽑은 실제 값
            "/admin/system",
            "/admin/system/logs/login",
            "/admin/survey/hub?tab=manage",
            "/admin/help/faq?tab=FAQ",
            "/admin/system/monitoring/hub?tab=observability",
            "/search",
            "/smart-toolkit/dept-job",
            // 게시판 생성 마법사가 런타임에 만드는 형태
            "/admin/community/boards?bbsId=BBSMSTR_AAAAAAAAAAAA",
            // 허용 키 조합·레거시·프래그먼트
            "/admin/x?tab=a&bbsId=b",
            "egovframework/com/uat/uia/EgovLoginUsr.do",
            "/admin/x?tab=a#section",
            "/admin/x/",
    })
    @DisplayName("현행 메뉴 라우트와 런타임 생성 형태는 그대로 통과한다")
    void allowsCurrentRoutes(String route) {
        assertThat(validate(route)).isEmpty();
    }

    @ParameterizedTest(name = "거부: {0}")
    @ValueSource(strings = {
            // 이 계약의 본체 — allowlist 밖 쿼리 키
            "/admin/x?q=hong",
            "/admin/x?token=abc",
            "/admin/x?searchWrd=hong",
            "/admin/x?tab=a&q=hong",
            "/admin/x?TAB=a",
            // 경로 모호성 — 읽기 쪽 정규화기도 거부하지만 저장에서 먼저 사유를 말한다
            "//evil.com",
            "/a//b",
            "/admin/x\\y",
            "https://evil.com/x",
            "/admin/x?",
    })
    @DisplayName("allowlist 밖 쿼리 키와 경로 모호성은 저장 시점에 거부된다")
    void rejectsUnknownQueryKeysAndAmbiguousPaths(String route) {
        assertThat(validate(route)).isNotEmpty();
    }

    @Test
    @DisplayName("거부 메시지가 무엇을 고쳐야 하는지 말한다")
    void messageExplainsWhatToFix() {
        Set<ConstraintViolation<MenuDto>> violations = validate("/admin/x?q=hong");

        assertThat(violations).isNotEmpty();
        assertThat(violations.iterator().next().getMessage())
                .contains("tab")
                .contains("bbsId");
    }

    @Test
    @DisplayName("값이 없으면 검사 대상이 아니다 — 폴더 메뉴는 라우트를 갖지 않는다")
    void allowsAbsentRoute() {
        // 실측: 메뉴 90행 중 14행이 modern_route NULL 이고 전부 prgrm_file_nm='dir' 인 폴더다.
        assertThat(validate(null)).isEmpty();
    }
}
