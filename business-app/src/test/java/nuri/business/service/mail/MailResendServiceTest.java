package nuri.business.service.mail;

import nuri.business.domain.mail.SentMail;
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

    @InjectMocks
    private MailService mailService;

    @Mock
    private SentMailRepository sentMailRepository;

    @Mock
    private MailAsyncProcessor mailAsyncProcessor;

    @Mock
    private UserContactService userContactService;

    @Mock
    private EmailSender emailSender;

    private MockedStatic<SecurityUtil> securityUtil;

    @BeforeEach
    void setUp() {
        securityUtil = Mockito.mockStatic(SecurityUtil.class);
        securityUtil.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("owner"));
        securityUtil.when(() -> SecurityUtil.hasPermission(anyString())).thenReturn(false);
        securityUtil.when(() -> SecurityUtil.assertOwnerOrPermission(anyString(), anyString())).thenAnswer(inv -> null);
        ReflectionTestUtils.setField(mailService, "systemSenderAddress", SYSTEM_SENDER);
    }

    @AfterEach
    void tearDown() {
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

        verify(mailAsyncProcessor).processSending(7L, "제목", "본문", SYSTEM_SENDER, "new@example.com");
    }

    @Test
    @DisplayName("직접 입력한 주소 수신자는 이력의 그 주소로 다시 보낸다")
    void resendDirectAddress() {
        given(sentMailRepository.findById(8L)).willReturn(Optional.of(mail(8L, "owner", "F", LocalDateTime.now(), "direct@example.com", null)));
        given(sentMailRepository.claimForResend(eq(8L), eq("owner"), any(), any())).willReturn(1);

        mailService.resendMail(8L);

        verify(mailAsyncProcessor).processSending(8L, "제목", "본문", SYSTEM_SENDER, "direct@example.com");
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
        verify(mailAsyncProcessor, never()).processSending(anyLong(), anyString(), anyString(), anyString(), anyString());
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

        verify(mailAsyncProcessor, never()).processSending(anyLong(), anyString(), anyString(), anyString(), anyString());
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
}
