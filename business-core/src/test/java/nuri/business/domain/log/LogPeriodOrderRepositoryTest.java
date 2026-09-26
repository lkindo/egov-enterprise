package nuri.business.domain.log;

import nuri.business.support.PersistenceTestSupport;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 로그 조회 5종이 역순 기간을 400 으로 거부하는가(2026-09-26 DIP C6).
 *
 * <p>{@code between} 은 역순 범위에 오류 없이 0건을 돌려줘, 화면은 "해당 기간에 기록이 없다" 고 말했다.
 * 판정은 {@link LogSearchPeriod#requireOrdered} 하나가 소유하고, 여기서는 다섯 저장소가 모두 그것을 거치는지 본다.
 */
@Transactional
@DisplayName("로그 조회 기간 순서")
class LogPeriodOrderRepositoryTest extends PersistenceTestSupport {

    @Autowired private LoginLogRepository loginLogRepository;
    @Autowired private PrivacyLogRepository privacyLogRepository;
    @Autowired private SysLogRepository sysLogRepository;
    @Autowired private UserLogRepository userLogRepository;
    @Autowired private WebLogRepository webLogRepository;

    private static final PageRequest PAGE = PageRequest.of(0, 10);

    @Test
    @DisplayName("시작일이 종료일보다 늦으면 다섯 조회 모두 입력 오류다")
    void reversedPeriodIsRejectedByEveryLogSearch() {
        assertRejected(() -> loginLogRepository.searchLoginLogs(null, "20260910", "20260901", PAGE));
        assertRejected(() -> privacyLogRepository.searchPrivacyLogs(null, "2026-09-10", "2026-09-01", PAGE));
        assertRejected(() -> sysLogRepository.searchSysLogs(null, "20260910", "20260901", PAGE));
        assertRejected(() -> userLogRepository.searchUserLogs(null, "20260910", "20260901", PAGE));
        assertRejected(() -> webLogRepository.searchWebLogs(null, "20260910", "20260901", PAGE));
    }

    @Test
    @DisplayName("같은 날짜와 정순 기간은 그대로 조회한다")
    void sameDayAndOrderedPeriodsAreAccepted() {
        assertThatCode(() -> sysLogRepository.searchSysLogs(null, "20260901", "20260901", PAGE)).doesNotThrowAnyException();
        assertThatCode(() -> userLogRepository.searchUserLogs(null, "20260901", "20260910", PAGE)).doesNotThrowAnyException();
        assertThatCode(() -> loginLogRepository.searchLoginLogs(null, "20260901", "20260910", PAGE)).doesNotThrowAnyException();
    }

    private static void assertRejected(org.assertj.core.api.ThrowableAssert.ThrowingCallable search) {
        assertThatThrownBy(search)
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("종료일");
    }
}
