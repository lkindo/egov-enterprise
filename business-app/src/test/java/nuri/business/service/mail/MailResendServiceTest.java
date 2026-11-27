package nuri.business.service.mail;

import nuri.business.domain.mail.SentMail;
import nuri.foundation.core.job.DurableWorkPort;
import nuri.foundation.core.util.CryptoUtil;
import nuri.business.domain.mail.SentMailRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.user.UserContactService;
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
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 메일 재발송·발송 가능 상태 계약(2026-09-26 DIP B5 F7).
 *
 * <p>검증 축: ① 발신자 본인만 ② 실패·멈춘 대기만 — 차지는 저장소 한 번의 UPDATE 가 판정한다 ③ 사용자 수신자는 저장된
 * 식별자로 <b>지금</b> 등록된 주소로 보내고, 이름만 남은 옛 행은 거부한다 ④ 응답 힌트 {@code resendable} 은 같은 규칙이다.
 */
@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("MailService — 재발송·발송 가능 상태 (DIP B5 F7)")
class MailResendServiceTest {

    private static final String SYSTEM_SENDER = "no-reply@egov.local";

    /** 시도 토큰 시각의 저장 정밀도. 표준 스키마(마이크로초)를 쓴다. */
    @org.mockito.Spy
    private nuri.foundation.core.persistence.VendorSqlDialect vendorSql = new nuri.foundation.core.persistence.PostgresqlSqlDialect();

    @InjectMocks
    private MailService mailService;

    @Mock
    private SentMailRepository sentMailRepository;

    @Mock
    private DurableWorkPort durableWork;

    @Mock
    private UserContactService userContactService;

    @Mock
    private EmailSender emailSender;

    private MockedStatic<SecurityUtil> securityUtil;
    private MockedStatic<CryptoUtil> crypto;

    @BeforeEach
    void setUp() {
        crypto = Mockito.mockStatic(CryptoUtil.class);
        crypto.when(() -> CryptoUtil.encrypt(anyString())).thenAnswer(call -> encrypted(call.getArgument(0)));
        securityUtil = Mockito.mockStatic(SecurityUtil.class);
        securityUtil.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("owner"));
        securityUtil.when(() -> SecurityUtil.hasPermission(anyString())).thenReturn(false);
        securityUtil.when(() -> SecurityUtil.assertOwnerOrPermission(anyString(), anyString())).thenAnswer(inv -> null);
        ReflectionTestUtils.setField(mailService, "systemSenderAddress", SYSTEM_SENDER);
    }

    @AfterEach
    void tearDown() {
        crypto.close();
        securityUtil.close();
    }

    private static SentMail mail(Long sn, String owner, String status, LocalDateTime dsptchDt, String rcvrNm, String rcvrId) {
        SentMail mail = SentMail.builder().emlDsptchSn(sn).emlTtl("제목").emlCn("본문")
                .rcvrNm(rcvrNm).rcvrId(rcvrId).dsptchRsltCd(status).build();
        ReflectionTestUtils.setField(mail, "frstRgtrId", owner);
        ReflectionTestUtils.setField(mail, "dsptchDt", dsptchDt);
        return mail;
    }

    @Test
    @DisplayName("사용자 수신자는 저장된 식별자로 지금 등록된 주소를 다시 찾아 같은 이력으로 보낸다")
    void resendUserRecipientToCurrentAddress() {
        given(sentMailRepository.findById(7L)).willReturn(Optional.of(mail(7L, "owner", "F", LocalDateTime.now(), "갑", "USR_A")));
        given(userContactService.resolve(List.of("USR_A")))
                .willReturn(List.of(new UserContactService.UserContact("USR_A", "갑", "new@example.com", null)));
        given(sentMailRepository.claimForResend(eq(7L), eq("owner"), any(), any())).willReturn(1);

        mailService.resendMail(7L);

        assertEnqueued(7L, "new@example.com");
    }

    @Test
    @DisplayName("직접 입력한 주소 수신자는 이력의 그 주소로 다시 보낸다")
    void resendDirectAddress() {
        given(sentMailRepository.findById(8L)).willReturn(Optional.of(mail(8L, "owner", "F", LocalDateTime.now(), "direct@example.com", null)));
        given(sentMailRepository.claimForResend(eq(8L), eq("owner"), any(), any())).willReturn(1);

        mailService.resendMail(8L);

        assertEnqueued(8L, "direct@example.com");
    }

    @Test
    @DisplayName("멈춘 대기의 기준 시각은 지금에서 10분 전이다")
    void stuckThresholdIsTenMinutes() {
        given(sentMailRepository.findById(8L)).willReturn(Optional.of(mail(8L, "owner", "P", null, "direct@example.com", null)));
        given(sentMailRepository.claimForResend(anyLong(), anyString(), any(), any())).willReturn(1);

        mailService.resendMail(8L);

        org.mockito.ArgumentCaptor<LocalDateTime> now = org.mockito.ArgumentCaptor.forClass(LocalDateTime.class);
        org.mockito.ArgumentCaptor<LocalDateTime> stuckBefore = org.mockito.ArgumentCaptor.forClass(LocalDateTime.class);
        verify(sentMailRepository).claimForResend(eq(8L), eq("owner"), now.capture(), stuckBefore.capture());
        assertThat(java.time.Duration.between(stuckBefore.getValue(), now.getValue())).isEqualTo(java.time.Duration.ofMinutes(10));
    }

    @Test
    @DisplayName("🔐 남의 메일은 관리자라도 다시 보내지 않는다 — 403, 차지하지 않는다")
    void onlySenderCanResend() {
        securityUtil.when(() -> SecurityUtil.hasPermission(anyString())).thenReturn(true);
        given(sentMailRepository.findById(9L)).willReturn(Optional.of(mail(9L, "someone", "F", LocalDateTime.now(), "direct@example.com", null)));

        assertThatThrownBy(() -> mailService.resendMail(9L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verify(sentMailRepository, never()).claimForResend(anyLong(), anyString(), any(), any());
        verify(durableWork, never()).enqueue(any());
    }

    @Test
    @DisplayName("이름만 남은 옛 사용자 수신자 행은 누구에게 보냈는지 몰라 다시 보내지 않는다")
    void legacyNameOnlyRowIsRejected() {
        given(sentMailRepository.findById(10L)).willReturn(Optional.of(mail(10L, "owner", "F", LocalDateTime.now(), "홍길동", null)));

        assertThatThrownBy(() -> mailService.resendMail(10L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("새로 작성해 주세요");
        verify(sentMailRepository, never()).claimForResend(anyLong(), anyString(), any(), any());
    }

    @Test
    void addressShapedTruncatedDisplayCannotBeUsedForManualResend() {
        String truncated = "a".repeat(84) + "@example.co.ukxx";
        assertThat(truncated).hasSize(100);
        given(sentMailRepository.findById(10L)).willReturn(Optional.of(
                mail(10L, "owner", "F", LocalDateTime.now(), truncated, null)));
        assertThat(mailService.getSentMail(10L).getResendable()).isFalse();
        assertThatThrownBy(() -> mailService.resendMail(10L)).isInstanceOf(BusinessException.class);
        verify(durableWork, never()).enqueue(any());
    }

    @Test
    void queuedStateIsPubliclyPendingButNotManuallyResendable() {
        given(sentMailRepository.findById(10L)).willReturn(Optional.of(
                mail(10L, "owner", "Q", LocalDateTime.now().minusMinutes(11), "direct@example.com", null)));
        assertThat(mailService.getSentMail(10L).getSndngResultCode()).isEqualTo("P");
        assertThat(mailService.getSentMail(10L).getResendable()).isFalse();
    }

    @Test
    @DisplayName("수신자가 지금 이메일이 없으면 이름을 밝히고 거부한다")
    void recipientWithoutEmailIsRejected() {
        given(sentMailRepository.findById(11L)).willReturn(Optional.of(mail(11L, "owner", "F", LocalDateTime.now(), "을", "USR_B")));
        given(userContactService.resolve(List.of("USR_B")))
                .willReturn(List.of(new UserContactService.UserContact("USR_B", "을", null, null)));

        assertThatThrownBy(() -> mailService.resendMail(11L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("'을' 님은 등록된 이메일 주소가 없어");
    }

    @Test
    @DisplayName("차지에 지면 이미 발송된 메일은 400, 처리 중인 메일은 409 이고 아무것도 보내지 않는다")
    void lostClaimDoesNotSend() {
        given(sentMailRepository.findById(12L)).willReturn(Optional.of(mail(12L, "owner", "S", LocalDateTime.now(), "direct@example.com", null)));
        given(sentMailRepository.claimForResend(anyLong(), anyString(), any(), any())).willReturn(0);
        assertThatThrownBy(() -> mailService.resendMail(12L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.INVALID_STATE);

        given(sentMailRepository.findById(13L)).willReturn(Optional.of(mail(13L, "owner", "P", LocalDateTime.now(), "direct@example.com", null)));
        assertThatThrownBy(() -> mailService.resendMail(13L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);

        verify(durableWork, never()).enqueue(any());
    }

    @Test
    @DisplayName("응답 힌트 resendable 은 본인·실패 또는 10분 넘게 멈춘 대기·수신자를 다시 찾을 수 있을 때만 true 다")
    void resendableHintFollowsTheSameRule() {
        LocalDateTime now = LocalDateTime.now();
        record Case(SentMail mail, boolean expected) { }
        List<Case> cases = List.of(
                new Case(mail(1L, "owner", "F", now, "갑", "USR_A"), true),
                new Case(mail(2L, "owner", "F", now, "direct@example.com", null), true),
                new Case(mail(3L, "owner", "P", now.minusMinutes(11), "갑", "USR_A"), true),
                new Case(mail(4L, "owner", "P", now.minusMinutes(1), "갑", "USR_A"), false),
                new Case(mail(5L, "owner", "S", now, "갑", "USR_A"), false),
                new Case(mail(6L, "owner", "F", now, "홍길동", null), false),
                new Case(mail(7L, "someone", "F", now, "갑", "USR_A"), false));
        for (Case c : cases) {
            given(sentMailRepository.findById(c.mail().getEmlDsptchSn())).willReturn(Optional.of(c.mail()));
            assertThat(mailService.getSentMail(c.mail().getEmlDsptchSn()).getResendable())
                    .as("mail %d", c.mail().getEmlDsptchSn())
                    .isEqualTo(c.expected());
        }
    }

    @Test
    @DisplayName("발송 가능 상태는 현재 발송 구현이 실제로 전달하는지를 알린다")
    void deliveryStatusReflectsSender() {
        given(emailSender.isDeliveryConfigured()).willReturn(false);
        assertThat(mailService.getDeliveryStatus().deliveryConfigured()).isFalse();

        given(emailSender.isDeliveryConfigured()).willReturn(true);
        assertThat(mailService.getDeliveryStatus().deliveryConfigured()).isTrue();
    }

    @Test
    @DisplayName("SMTP 가 없는 기본 발송 구현은 전달하지 않는다고 말한다")
    void loggingSenderIsNotConfigured() {
        assertThat(new LoggingEmailSender().isDeliveryConfigured()).isFalse();
    }

    @Test
    @DisplayName("[GAP-MAIL-001 ②] 재발송도 사용자별 시간당 발송 한도를 공유하며 초과 시 차지·작업 등록 없이 429(C015)로 차단한다")
    void resendMailEnforcesHourlyUserLimit() {
        mailService.setMailUserRateLimiter(new MailUserRateLimiter(1));
        given(sentMailRepository.findById(20L)).willReturn(Optional.of(
                mail(20L, "owner", "F", LocalDateTime.now(), "direct@example.com", null)));
        given(sentMailRepository.findById(21L)).willReturn(Optional.of(
                mail(21L, "owner", "F", LocalDateTime.now(), "direct2@example.com", null)));
        given(sentMailRepository.claimForResend(eq(20L), eq("owner"), any(), any())).willReturn(1);

        mailService.resendMail(20L);

        assertThatThrownBy(() -> mailService.resendMail(21L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.TOO_MANY_REQUESTS);
        verify(sentMailRepository, never()).claimForResend(eq(21L), anyString(), any(), any());
        verify(durableWork).enqueue(any());
    }

    @Test
    @DisplayName("[GAP-MAIL-001 ②] 재발송 차지 실패(409)와 작업 등록 실패·트랜잭션 롤백은 사용자 한도를 소모하지 않는다")
    void failedClaimAndRollbackDoNotConsumeRateLimit() {
        mailService.setMailUserRateLimiter(new MailUserRateLimiter(1));
        given(sentMailRepository.findById(30L)).willReturn(Optional.of(
                mail(30L, "owner", "F", LocalDateTime.now(), "direct@example.com", null)));
        given(sentMailRepository.findById(31L)).willReturn(Optional.of(
                mail(31L, "owner", "F", LocalDateTime.now(), "direct2@example.com", null)));

        // 1) 동시 재발송 차지 패배(409)는 한도를 소비하지 않아 다음 재발송이 성공해야 한다.
        given(sentMailRepository.claimForResend(eq(30L), eq("owner"), any(), any())).willReturn(0);
        assertThatThrownBy(() -> mailService.resendMail(30L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);

        // 2) durableWork.enqueue 예외 시 예약 한도가 반환된다.
        given(sentMailRepository.claimForResend(eq(31L), eq("owner"), any(), any())).willReturn(1);
        org.mockito.Mockito.doThrow(new IllegalStateException("queue unavailable"))
                .when(durableWork).enqueue(any());
        assertThatThrownBy(() -> mailService.resendMail(31L))
                .isInstanceOf(IllegalStateException.class);
        org.mockito.Mockito.reset(durableWork);

        // 3) 트랜잭션 롤백 동기화 시 예약 한도가 반환되어 이후 재발송이 최종 성공한다.
        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();
        try {
            mailService.resendMail(31L);
            org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations()
                    .forEach(sync -> sync.afterCompletion(
                            org.springframework.transaction.support.TransactionSynchronization.STATUS_ROLLED_BACK));
        } finally {
            org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization();
        }

        org.mockito.Mockito.clearInvocations(durableWork);
        crypto.clearInvocations();
        mailService.resendMail(31L);
        assertEnqueued(31L, "direct2@example.com");
    }
    private static String encrypted(String address) {
        return java.util.Base64.getEncoder().encodeToString(address.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private void assertEnqueued(long id, String address) {
        verify(durableWork).enqueue(org.mockito.ArgumentMatchers.argThat(work -> {
            var intent = MailDeliveryWorkHandler.intent(work);
            return intent.dispatchId() == id && intent.encryptedRecipient().equals(encrypted(address))
                    && intent.from().equals(SYSTEM_SENDER) && !work.payload().contains(address);
        }));
        crypto.verify(() -> CryptoUtil.encrypt(address));
    }

}
