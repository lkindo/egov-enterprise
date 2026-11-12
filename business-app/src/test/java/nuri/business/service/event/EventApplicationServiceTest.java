package nuri.business.service.event;

import nuri.business.domain.event.EventApplication;
import nuri.business.domain.event.EventApplicationRepository;
import nuri.business.domain.event.EventApplicationStatus;
import nuri.business.domain.event.EventInfo;
import nuri.business.domain.event.EventInfoRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * [V2_152] 행사 참가 신청 — 정원·마감·중복·반려 재신청 거부·본인 취소·관리 인가(H3). 신청·처리는 행사 행을 잠근 뒤 판정한다
 * ({@code findByIdForUpdate}) — 같은 행사의 쓰기가 한 줄로 서므로 자리 수가 정원을 넘지 않는다(동시성 통합 시험이 실제 DB 로 본다).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("행사 참가 신청·정원 마감 계약")
class EventApplicationServiceTest {
    @Mock private EventInfoRepository eventInfoRepository;
    @Mock private EventApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private EventApplicationService service;
    private MockedStatic<SecurityUtil> security;

    private static final DateTimeFormatter YMD = DateTimeFormatter.BASIC_ISO_DATE;
    private static final String TODAY = LocalDate.now(ZoneId.of("Asia/Seoul")).format(YMD);
    private static final String TOMORROW = LocalDate.now(ZoneId.of("Asia/Seoul")).plusDays(1).format(YMD);
    private static final String YESTERDAY = LocalDate.now(ZoneId.of("Asia/Seoul")).minusDays(1).format(YMD);

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class, CALLS_REAL_METHODS);
        security.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("me"));
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("login-me"));
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    private EventInfo event(Integer capacity, String deadline, String begin) {
        EventInfo event = EventInfo.builder().evntSn(5L).evntNm("워크숍").evntBgngYmd(begin).evntEndYmd(begin)
                .pscpNope(capacity).aplyDdlnYmd(deadline).build();
        event.setFrstRgtrId("owner-login");
        given(eventInfoRepository.findByIdForUpdate(5L)).willReturn(Optional.of(event));
        return event;
    }

    private static BusinessException error(Runnable call) {
        try {
            call.run();
        } catch (BusinessException e) {
            return e;
        }
        throw new AssertionError("BusinessException expected");
    }

    @Test
    @DisplayName("자리가 남았으면 신청을 받는다 — 신청자는 인증 주체의 esntlId 로 고정한다")
    void appliesWhileSeatsRemain() {
        event(2, TOMORROW, TOMORROW);
        given(applicationRepository.countSeats(5L)).willReturn(1L);
        given(applicationRepository.save(any())).willAnswer(invocation -> invocation.getArgument(0));

        var result = service.apply(5L);

        assertThat(result.aplcntId()).isEqualTo("me");
        assertThat(result.aplySttsCd()).isEqualTo("APPLIED");
    }

    @Test
    @DisplayName("정원이 차면 409 — 신청 행을 만들지 않는다")
    void rejectsWhenFull() {
        event(2, TOMORROW, TOMORROW);
        given(applicationRepository.countSeats(5L)).willReturn(2L);

        assertThat(error(() -> service.apply(5L)).getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("마감일이 지났거나 마감일이 없는 행사(신청을 받지 않는 기존 행사)는 409 — 시작일이 남아 있어도 받지 않는다")
    void rejectsAfterDeadlineOrWithoutDeadline() {
        event(null, YESTERDAY, TOMORROW);
        assertThat(error(() -> service.apply(5L)).getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);

        org.mockito.Mockito.reset(eventInfoRepository);
        event(null, null, TOMORROW);
        assertThat(error(() -> service.apply(5L)).getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        assertThat(EventApplicationService.applicationOpen(
                EventInfo.builder().evntBgngYmd(TOMORROW).build(), TODAY)).as("마감일 없는 기존 행사는 열리지 않는다").isFalse();
        assertThat(EventApplicationService.applicationOpen(
                EventInfo.builder().aplyDdlnYmd(TODAY).build(), TODAY)).as("마감일 당일까지 받는다").isTrue();
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("이미 신청했거나 반려된 신청은 다시 신청할 수 없다(409), 취소한 신청은 같은 행으로 다시 신청한다")
    void duplicateAndRejectedCannotReapplyButCancelledCan() {
        event(null, TOMORROW, TOMORROW);
        EventApplication applied = EventApplication.apply(5L, "me", LocalDateTime.now());
        given(applicationRepository.findByEvntSnAndAplcntId(5L, "me")).willReturn(Optional.of(applied));
        assertThat(error(() -> service.apply(5L)).getErrorCode()).isEqualTo(CommonErrorCode.DUPLICATE_RESOURCE);

        applied.reject(LocalDateTime.now());
        assertThat(error(() -> service.apply(5L)).getErrorCode()).isEqualTo(CommonErrorCode.DUPLICATE_RESOURCE);

        EventApplication cancelled = EventApplication.apply(5L, "me", LocalDateTime.now());
        cancelled.cancel(LocalDateTime.now());
        given(applicationRepository.findByEvntSnAndAplcntId(5L, "me")).willReturn(Optional.of(cancelled));
        service.apply(5L);
        assertThat(cancelled.status()).isEqualTo(EventApplicationStatus.APPLIED);
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("본인 신청만 취소한다 — 신청 내역이 없으면 404, 시작한 행사는 409")
    void cancelsOwnApplicationOnly() {
        event(null, TOMORROW, TOMORROW);
        given(applicationRepository.findByEvntSnAndAplcntId(5L, "me")).willReturn(Optional.empty());
        assertThat(error(() -> service.cancel(5L)).getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);

        org.mockito.Mockito.reset(eventInfoRepository);
        event(null, YESTERDAY, YESTERDAY);
        assertThat(error(() -> service.cancel(5L)).getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
    }

    @Test
    @DisplayName("행사 등록자도 수정 대행 권한자도 아니면 신청자를 승인·반려하지 못한다(403)")
    void strangerCannotDecideApplications() {
        event(null, TOMORROW, TOMORROW);
        security.when(() -> SecurityUtil.hasPermission(anyString())).thenReturn(false);

        assertThatThrownBy(() -> service.approve(5L, 9L, 0)).isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verify(applicationRepository, never()).findByEvntAplySnAndEvntSn(any(), any());
    }

    @Test
    @DisplayName("행사 등록자는 승인하고 신청자에게 알린다 — 읽은 버전이 다르면 409")
    void ownerApprovesWithVersion() {
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("owner-login"));
        event(null, TOMORROW, TOMORROW);
        EventApplication applied = EventApplication.apply(5L, "applicant", LocalDateTime.now());
        ReflectionTestUtils.setField(applied, "version", 3);
        given(applicationRepository.findByEvntAplySnAndEvntSn(9L, 5L)).willReturn(Optional.of(applied));

        assertThat(error(() -> service.approve(5L, 9L, 2)).getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        service.approve(5L, 9L, 3);

        assertThat(applied.status()).isEqualTo(EventApplicationStatus.APPROVED);
        verify(eventPublisher).publishEvent(any(Object.class));
    }
}
