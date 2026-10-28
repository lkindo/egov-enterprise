package nuri.business.service.board;

import nuri.business.domain.board.BoardMaster;
import nuri.business.service.board.dto.BoardPostListFilter;
import nuri.business.service.board.dto.PostingStatus;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.MockedStatic;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mockStatic;

/**
 * 게시 기간 판정·쓰기 규칙의 진리표(2026-10-23 ADR-0040 결정 3·12). 목록 술어(BoardPredicate)·첨부 판정과 같은 사전순 비교라
 * 경계(기준일 당일·빈 값·null)를 표로 고정한다.
 */
class BoardPostingStatusTest {

    private static final String TODAY = "20261023";

    private MockedStatic<nuri.business.security.util.SecurityUtil> security;

    @BeforeEach
    void setUp() {
        security = mockStatic(nuri.business.security.util.SecurityUtil.class, CALLS_REAL_METHODS);
        security.when(() -> nuri.business.security.util.SecurityUtil.hasPermission(anyString())).thenReturn(false);
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    @ParameterizedTest(name = "시작 {0} · 종료 {1} → {2}")
    @CsvSource(nullValues = "NULL", textBlock = """
            NULL,     NULL,     POSTING
            '',       '',       POSTING
            20261023, NULL,     POSTING
            20261022, 20261023, POSTING
            20261024, NULL,     SCHEDULED
            20261024, 20261031, SCHEDULED
            NULL,     20261022, ENDED
            20261001, 20261022, ENDED
            20261030, 20261022, ENDED
            """)
    @DisplayName("게시 상태: 종료가 지났으면 ENDED, 아니고 시작 전이면 SCHEDULED, 그 밖은 POSTING(시작일·종료일 당일은 게시 중)")
    void postingStatusTruthTable(String start, String end, PostingStatus expected) {
        assertThat(BoardPolicySupport.postingStatusOf(start, end, TODAY)).isEqualTo(expected);
    }

    @Test
    @DisplayName("시작 전·종료 뒤 판정의 경계는 기준일 당일을 포함하지 않는다")
    void startAndEndBoundaries() {
        assertThat(BoardPolicySupport.postingNotStarted("20261023", TODAY)).as("시작일=오늘은 게시").isFalse();
        assertThat(BoardPolicySupport.postingNotStarted("20261024", TODAY)).isTrue();
        assertThat(BoardPolicySupport.postingNotStarted("", TODAY)).isFalse();
        assertThat(BoardPolicySupport.postingNotStarted(null, TODAY)).isFalse();
        assertThat(BoardPolicySupport.postingEnded("20261023", TODAY)).as("종료일=오늘은 게시").isFalse();
        assertThat(BoardPolicySupport.postingEnded("20261022", TODAY)).isTrue();
        assertThat(BoardPolicySupport.postingEnded("", TODAY)).isFalse();
        assertThat(BoardPolicySupport.postingEnded(null, TODAY)).isFalse();
    }

    @Test
    @DisplayName("기준일은 시계의 시간대와 무관하게 서울 날짜다 — KST 자정 경계")
    void todayIsSeoulDateRegardlessOfClockZone() {
        assertThat(BoardPolicySupport.todayYmd(Clock.fixed(Instant.parse("2026-10-22T14:59:59Z"), ZoneOffset.UTC)))
                .isEqualTo("20261022");
        assertThat(BoardPolicySupport.todayYmd(Clock.fixed(Instant.parse("2026-10-22T15:00:00Z"), ZoneOffset.UTC)))
                .isEqualTo("20261023");
    }

    @Test
    @DisplayName("요청 날짜: 비었거나 null 이면 '바꾸지 않음'(null), 하이픈은 8자리로, 달력에 없는 날짜는 400")
    void requestedYmdNormalizesAndRejectsMalformedDates() {
        assertThat(BoardPolicySupport.requestedYmd(null)).isNull();
        assertThat(BoardPolicySupport.requestedYmd("")).isNull();
        assertThat(BoardPolicySupport.requestedYmd("2026-11-01")).isEqualTo("20261101");
        assertThat(BoardPolicySupport.requestedYmd("20261101")).isEqualTo("20261101");
        assertThatThrownBy(() -> BoardPolicySupport.requestedYmd("20260230"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThatThrownBy(() -> BoardPolicySupport.requestedYmd("2026/11/01"))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
    }

    @Test
    @DisplayName("예약 게시를 받지 않는 게시판은 오늘보다 뒤의 새 시작일만 거부한다(400)")
    void futureStartNeedsReservationSetting() {
        BoardMaster closed = BoardMaster.builder().bbsId("B").build();
        BoardMaster open = BoardMaster.builder().bbsId("B").rsvtPstgPsbltyYn("Y").build();

        assertThatThrownBy(() -> BoardPolicySupport.assertFutureStartAllowed(closed, "20261024", TODAY))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("이 게시판은 예약 게시를 받지 않습니다");
        assertThatCode(() -> BoardPolicySupport.assertFutureStartAllowed(closed, TODAY, TODAY)).doesNotThrowAnyException();
        assertThatCode(() -> BoardPolicySupport.assertFutureStartAllowed(closed, null, TODAY)).doesNotThrowAnyException();
        assertThatCode(() -> BoardPolicySupport.assertFutureStartAllowed(open, "20261024", TODAY)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("공개 뒤 시작일 변경: 같은 값·형식만 다른 같은 날짜는 변경이 아니고, 실제 변경은 BOARD_UPDATE_ALL 이 없으면 403")
    void startDateChangeAfterPublicationNeedsUpdateAll() {
        // ① 같은 값 재전송
        assertThatCode(() -> BoardPolicySupport.assertStartDateChangeAllowed("20261001", "20261001", TODAY))
                .doesNotThrowAnyException();
        // ② 형식만 다른 같은 날짜(옛 하이픈 저장값)
        assertThatCode(() -> BoardPolicySupport.assertStartDateChangeAllowed("2026-10-01", "20261001", TODAY))
                .doesNotThrowAnyException();
        // ③ 실제 변경 — 공개된 글(저장 시작일이 과거·null)이면 403
        assertThatThrownBy(() -> BoardPolicySupport.assertStartDateChangeAllowed("20261001", "20261030", TODAY))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED)
                .hasMessageContaining("게시가 시작된 글의 시작일은");
        assertThatThrownBy(() -> BoardPolicySupport.assertStartDateChangeAllowed(null, "20261020", TODAY))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        // 공개 전(저장 시작일이 미래)이면 작성자도 바꾼다.
        assertThatCode(() -> BoardPolicySupport.assertStartDateChangeAllowed("20261101", TODAY, TODAY))
                .doesNotThrowAnyException();
        // 대행 권한 보유자는 공개 뒤에도 바꾼다.
        security.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_UPDATE_ALL")).thenReturn(true);
        assertThatCode(() -> BoardPolicySupport.assertStartDateChangeAllowed("20261001", "20261030", TODAY))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("기간 순서는 합친 값으로 보고, 운영 경로는 오늘보다 이른 종료일을 거부한다")
    void periodOrderAndOperatorEndDate() {
        assertThatThrownBy(() -> BoardPolicySupport.assertPeriodOrder("20261110", "20261101"))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThatCode(() -> BoardPolicySupport.assertPeriodOrder("20261101", "20261101")).doesNotThrowAnyException();
        assertThatCode(() -> BoardPolicySupport.assertPeriodOrder(null, "20261101")).doesNotThrowAnyException();
        assertThatCode(() -> BoardPolicySupport.assertPeriodOrder("20261101", "")).doesNotThrowAnyException();
        assertThatThrownBy(() -> BoardPolicySupport.assertEndNotPast("20261022", TODAY))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThatCode(() -> BoardPolicySupport.assertEndNotPast(TODAY, TODAY)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("목록의 게시 상태 조건: 비면 조건 없음, 어휘 밖은 400")
    void postingStatusFilterParsing() {
        assertThat(BoardPostListFilter.of(null, null)).isEqualTo(BoardPostListFilter.NONE);
        assertThat(BoardPostListFilter.of("", null).postingStatus()).isNull();
        assertThat(BoardPostListFilter.of("SCHEDULED", null).postingStatus()).isEqualTo(PostingStatus.SCHEDULED);
        assertThatThrownBy(() -> BoardPostListFilter.of("scheduled", null))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
    }

    // ── 상단 고정(ADR-0040 결정 5) ────────────────────────────────────────────────

    @ParameterizedTest(name = "고정 {0} · 종료 {1} → {2}")
    @CsvSource(nullValues = "NULL", textBlock = """
            Y, 20261023, true
            Y, 20261231, true
            Y, 20261022, false
            Y, NULL,     false
            N, 20261231, false
            N, NULL,     false
            NULL, 20261231, false
            """)
    @DisplayName("고정 중: 고정 표시가 Y 이고 종료일이 기준일과 같거나 뒤다(종료일 당일까지 고정)")
    void pinActiveTruthTable(String yn, String end, boolean expected) {
        assertThat(BoardPolicySupport.pinActive(yn, end, TODAY)).isEqualTo(expected);
    }

    @Test
    @DisplayName("고정 요청은 Y·N 만 받는다(서비스 직접 호출도 400)")
    void pinRequestParsing() {
        assertThat(BoardPolicySupport.parsePinRequest("Y")).isTrue();
        assertThat(BoardPolicySupport.parsePinRequest("N")).isFalse();
        for (String invalid : new String[] {"y", "", null, "X"}) {
            assertThatThrownBy(() -> BoardPolicySupport.parsePinRequest(invalid))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }

    @Test
    @DisplayName("고정 종료일: 비우면 오늘 + 게시판 기본 일수, 오늘은 받고 오늘보다 이르면 400")
    void pinEndDate() {
        BoardMaster defaults = BoardMaster.builder().bbsId("B").build();
        BoardMaster week = BoardMaster.builder().bbsId("B").upendFixBscDayCnt(java.math.BigInteger.valueOf(7)).build();

        assertThat(BoardPolicySupport.pinEndYmd(defaults, null, TODAY)).as("기본 30일").isEqualTo("20261122");
        assertThat(BoardPolicySupport.pinEndYmd(defaults, "", TODAY)).isEqualTo("20261122");
        assertThat(BoardPolicySupport.pinEndYmd(week, null, TODAY)).isEqualTo("20261030");
        assertThat(BoardPolicySupport.pinEndYmd(defaults, TODAY, TODAY)).as("오늘 하루 고정").isEqualTo(TODAY);
        assertThat(BoardPolicySupport.pinEndYmd(defaults, "2026-12-01", TODAY)).isEqualTo("20261201");
        assertThatThrownBy(() -> BoardPolicySupport.pinEndYmd(defaults, "20261022", TODAY))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("고정 종료일은 오늘이나 그 뒤로");
    }

    @Test
    @DisplayName("새 고정: 고정을 받지 않는 게시판은 400, 상한은 새로 고정 중이 되는 글만 센다")
    void pinPolicyAndLimit() {
        BoardMaster closed = BoardMaster.builder().bbsId("B").build();
        BoardMaster open = BoardMaster.builder().bbsId("B").upendFixPsbltyYn("Y")
                .upendFixUplmtNocs(java.math.BigInteger.valueOf(3)).build();

        assertThatThrownBy(() -> BoardPolicySupport.assertPinsAccepted(closed))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessage("이 게시판은 상단 고정을 받지 않습니다.");
        assertThatCode(() -> BoardPolicySupport.assertPinsAccepted(open)).doesNotThrowAnyException();

        assertThatCode(() -> BoardPolicySupport.assertPinLimit(open, 1, 2)).as("상한에 꼭 맞으면 받는다").doesNotThrowAnyException();
        assertThatThrownBy(() -> BoardPolicySupport.assertPinLimit(open, 1, 3))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("최대 3건까지 둡니다(지금 3건)");
        assertThatThrownBy(() -> BoardPolicySupport.assertPinLimit(open, 2, 2))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE);
        assertThatCode(() -> BoardPolicySupport.assertPinLimit(open, 0, 5))
                .as("상한을 낮춘 뒤에도 이미 고정 중인 글의 종료일은 바꾼다").doesNotThrowAnyException();
    }

    /**
     * [ADR-0040 결정 7] 저장할 비밀글 여부 — 정책 3 × 요청(Y·N·null) × 저장값. REQUIRED 는 늘 Y(요청 N·null, 공개로 남아 있던 옛
     * 글을 고칠 때도), NONE·OPTIONAL 은 요청값, 요청이 없으면 저장값이다. NONE 이 Y 를 지키는 것이 도움말 1:1 문의 보존이다(H3).
     * [2026-10-29] 요청도 저장값도 없으면 NULL 이 아니라 N 이다 — 열람 판정이 모두 NULL 을 공개 글로 보므로 열람 범위는 같다.
     */
    @ParameterizedTest(name = "정책 {0} · 요청 {1} · 저장값 {2} → {3}")
    @CsvSource(nullValues = "NULL", textBlock = """
            NONE,     Y,    NULL, Y
            NONE,     N,    NULL, N
            NONE,     NULL, NULL, N
            NONE,     NULL, Y,    Y
            NONE,     N,    Y,    N
            OPTIONAL, Y,    NULL, Y
            OPTIONAL, N,    NULL, N
            OPTIONAL, NULL, N,    N
            OPTIONAL, NULL, NULL, N
            REQUIRED, Y,    NULL, Y
            REQUIRED, N,    NULL, Y
            REQUIRED, NULL, NULL, Y
            REQUIRED, N,    N,    Y
            REQUIRED, NULL, N,    Y
            """)
    @DisplayName("비밀글 정책: REQUIRED 는 늘 Y, NONE·OPTIONAL 은 요청값이고 요청이 없으면 저장값이다")
    void resolveSecretYnTruthTable(String policy, String requested, String stored, String expected) {
        BoardMaster master = BoardMaster.builder().bbsId("B").prvtPstPlcyCd(policy).build();
        assertThat(BoardPolicySupport.resolveSecretYn(master, requested, stored)).isEqualTo(expected);
    }
}
