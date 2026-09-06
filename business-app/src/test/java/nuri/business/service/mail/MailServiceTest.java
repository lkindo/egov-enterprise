package nuri.business.service.mail;

import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import nuri.business.service.mail.dto.MailRecipientDto;
import nuri.business.service.mail.dto.SentMailDto;
import nuri.business.service.user.UserContactService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import nuri.business.security.AuthorityConstants;
import nuri.business.security.util.SecurityUtil;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("MailService 단위 테스트")
class MailServiceTest {

    @InjectMocks
    private MailService mailService;

    @Mock
    private SentMailRepository sentMailRepository;

    @Mock
    private MailAsyncProcessor mailAsyncProcessor;

    @Mock
    private UserContactService userContactService;

    /**
     * 발송메일 조회는 발신자 스코프(IDOR 차단)를 타므로 SecurityContext 가 필요하다.
     * 기본은 <b>관리자</b>로 두고, 스코프 자체를 검증하는 테스트에서만 일반 사용자로 바꾼다.
     */
    private MockedStatic<SecurityUtil> securityUtil;

    /** 운영에서 설정으로 주입되는 발신 주소({@code nuri.mail.from}). @Value 는 Mockito 가 채우지 않는다. */
    private static final String SYSTEM_SENDER = "no-reply@egov.local";

    @BeforeEach
    void openSecurityUtilMock() {
        securityUtil = Mockito.mockStatic(SecurityUtil.class);
        asAdmin();
        org.springframework.test.util.ReflectionTestUtils.setField(
                mailService, "systemSenderAddress", SYSTEM_SENDER);
    }

    @AfterEach
    void closeSecurityUtilMock() {
        if (securityUtil != null) {
            securityUtil.close();
        }
    }

    private void asAdmin() {
        securityUtil.when(() -> SecurityUtil.hasRole(AuthorityConstants.ROLE_ADMIN)).thenReturn(true);
        securityUtil.when(() -> SecurityUtil.hasRole(AuthorityConstants.ROLE_SYSTEM)).thenReturn(false);
        securityUtil.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("admin"));
    }

    private void asUser(String loginId) {
        securityUtil.when(() -> SecurityUtil.hasRole(AuthorityConstants.ROLE_ADMIN)).thenReturn(false);
        securityUtil.when(() -> SecurityUtil.hasRole(AuthorityConstants.ROLE_SYSTEM)).thenReturn(false);
        securityUtil.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of(loginId));
        // 실제 가드는 assertOwnerOrAdmin 이 담당한다 — 소유자 불일치 시 예외를 던지도록 재현
        securityUtil.when(() -> SecurityUtil.assertOwnerOrAdmin(anyString()))
                .thenAnswer(inv -> {
                    if (!loginId.equals(inv.getArgument(0))) {
                        throw new nuri.foundation.core.exception.BusinessException(
                                nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);
                    }
                    return null;
                });
    }

    @Test
    @DisplayName("보낸 메일 목록 조회 - 키워드 없음(관리자는 전건 스코프)")
    void getSentMailList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SentMail mail = SentMail.builder().emlDsptchSn(1L).emlTtl("Subject").build();
        given(sentMailRepository.searchSentMails(isNull(), eq("1"), isNull(), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(mail)));

        Page<SentMailDto> result = mailService.getSentMailList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmlDsptchSn()).isEqualTo(1L);
    }

    @Test
    @DisplayName("보낸 메일 상세 조회 - 성공")
    void getSentMail_Success() {
        SentMail mail = SentMail.builder().emlDsptchSn(1L).emlTtl("Subject").build();
        given(sentMailRepository.findById(1L)).willReturn(Optional.of(mail));

        SentMailDto result = mailService.getSentMail(1L);

        assertThat(result.getEmlDsptchSn()).isEqualTo(1L);
    }

    @Test
    @DisplayName("메일 발송 - 성공")
    void sendMail_Success() {
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject")
                .emailCn("Content")
                .dsptchPerson("sender@test.com")
                .recptnPerson("receiver@test.com")
                .build();

        given(sentMailRepository.save(any(SentMail.class)))
                .willReturn(SentMail.builder().emlDsptchSn(1L).build());

        Long emlDsptchSn = mailService.sendMail("user1", dto);

        assertThat(emlDsptchSn).isEqualTo(1L);
        verify(sentMailRepository).save(any(SentMail.class));
        verify(mailAsyncProcessor).processSending(anyLong(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("발신 주소 - 화면이 발신자를 안 보내도 설정된 시스템 주소로 발송한다")
    void sendMail_usesConfiguredSender_whenRequestOmitsIt() {
        // 메일 발송 화면은 발신자 입력이 없어 dsptchPerson 이 항상 null 이었다. 종전 구현은 그 null 을
        // 그대로 SMTP From 으로 넘겨 RealEmailSender 가 NPE 로 죽었고, 3회 재시도 뒤 전건이 실패로 남았다.
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject")
                .emailCn("Content")
                .recptnPerson("receiver@test.com")
                .build();
        given(sentMailRepository.save(any(SentMail.class)))
                .willReturn(SentMail.builder().emlDsptchSn(7L).build());

        mailService.sendMail("user1", dto);

        org.mockito.ArgumentCaptor<String> from = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(mailAsyncProcessor).processSending(
                anyLong(), anyString(), anyString(), from.capture(), anyString());
        assertThat(from.getValue()).isEqualTo(SYSTEM_SENDER);
    }

    @Test
    @DisplayName("발신 주소 - 요청 본문이 발신자를 주장해도 SMTP From 은 설정 주소를 쓴다")
    void sendMail_ignoresClaimedSender_forSmtpFrom() {
        // 발신자는 위조 가능한 축이다. 클라이언트가 무엇을 주장하든 실제 발송 주소는 서버가 정한다.
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject").emailCn("Content")
                .dsptchPerson("attacker@evil.test").recptnPerson("receiver@test.com")
                .build();
        given(sentMailRepository.save(any(SentMail.class)))
                .willReturn(SentMail.builder().emlDsptchSn(8L).build());

        mailService.sendMail("user1", dto);

        org.mockito.ArgumentCaptor<String> from = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(mailAsyncProcessor).processSending(
                anyLong(), anyString(), anyString(), from.capture(), anyString());
        assertThat(from.getValue()).isEqualTo(SYSTEM_SENDER);
    }

    @Test
    @DisplayName("발신자 이력 - 인증 주체를 기록한다 (종전에는 전건 공백)")
    void sendMail_recordsAuthenticatedSenderInHistory() {
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject").emailCn("Content")
                .recptnPerson("receiver@test.com")
                .build();
        given(sentMailRepository.save(any(SentMail.class)))
                .willReturn(SentMail.builder().emlDsptchSn(9L).build());

        mailService.sendMail("user1", dto);

        org.mockito.ArgumentCaptor<SentMail> saved = org.mockito.ArgumentCaptor.forClass(SentMail.class);
        verify(sentMailRepository).save(saved.capture());
        assertThat(saved.getValue().getSndptyNm()).isEqualTo("user1");
    }

    @Test
    @DisplayName("발신자 이력 - 인증 주체가 없는 내부 발송은 호출자가 명시한 발신자를 남긴다")
    void sendMail_fallsBackToDeclaredSender_forInternalDispatch() {
        // 제재 알림 등 이벤트 기반 내부 발송에는 로그인 주체가 없다. 그 경우까지 이력이 비지 않게 한다.
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject").emailCn("Content")
                .dsptchPerson("admin@egov.enterprise").recptnPerson("receiver@test.com")
                .build();
        given(sentMailRepository.save(any(SentMail.class)))
                .willReturn(SentMail.builder().emlDsptchSn(10L).build());

        mailService.sendMail(null, dto);

        org.mockito.ArgumentCaptor<SentMail> saved = org.mockito.ArgumentCaptor.forClass(SentMail.class);
        verify(sentMailRepository).save(saved.capture());
        assertThat(saved.getValue().getSndptyNm()).isEqualTo("admin@egov.enterprise");
    }

    @Test
    @DisplayName("메일 비동기 큐 포화는 커밋된 대기 건을 명시적 실패로 전환")
    void sendMail_executorRejected_marksFailure() {
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject").emailCn("Content")
                .dsptchPerson("sender@test.com").recptnPerson("receiver@test.com")
                .build();
        doThrow(new java.util.concurrent.RejectedExecutionException("full"))
                .when(mailAsyncProcessor)
                .processSending(anyLong(), anyString(), anyString(), anyString(), anyString());
        given(sentMailRepository.save(any(SentMail.class)))
                .willReturn(SentMail.builder().emlDsptchSn(2L).build());

        Long emlDsptchSn = mailService.sendMail("user1", dto);

        verify(mailAsyncProcessor).markResult(emlDsptchSn, "F");
    }

    /*
     * [2026-09-05 DEC-OPS-035] 수신자 피커 공용화 — recipients(esntlId|emlAddr) 계약.
     */
    @Test
    @DisplayName("수신자 목록은 사용자(esntlId)를 서버가 이메일로 해석하고, 수신자마다 발송 이력 1건을 만든다")
    void sendMail_recipients_resolveUsersAndDispatchPerRecipient() {
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject").emailCn("Content")
                .recipients(List.of(
                        MailRecipientDto.builder().esntlId("USR_A").build(),
                        MailRecipientDto.builder().emlAddr("direct@example.com").build(),
                        MailRecipientDto.builder().esntlId("USR_B").build()))
                .build();
        given(userContactService.resolve(List.of("USR_A", "USR_B"))).willReturn(List.of(
                new UserContactService.UserContact("USR_A", "갑", "gap@example.com", null),
                new UserContactService.UserContact("USR_B", "을", "eul@example.com", null)));
        java.util.concurrent.atomic.AtomicLong serial = new java.util.concurrent.atomic.AtomicLong(10L);
        given(sentMailRepository.save(any(SentMail.class)))
                .willAnswer(inv -> SentMail.builder().emlDsptchSn(serial.incrementAndGet()).build());

        Long first = mailService.sendMail("admin", dto);

        assertThat(first).isEqualTo(11L);
        org.mockito.ArgumentCaptor<SentMail> saved = org.mockito.ArgumentCaptor.forClass(SentMail.class);
        verify(sentMailRepository, times(3)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(SentMail::getRcvrNm)
                .containsExactly("gap@example.com", "direct@example.com", "eul@example.com");
        verify(mailAsyncProcessor).processSending(eq(11L), eq("Subject"), eq("Content"), eq(SYSTEM_SENDER), eq("gap@example.com"));
        verify(mailAsyncProcessor).processSending(eq(12L), eq("Subject"), eq("Content"), eq(SYSTEM_SENDER), eq("direct@example.com"));
        verify(mailAsyncProcessor).processSending(eq(13L), eq("Subject"), eq("Content"), eq(SYSTEM_SENDER), eq("eul@example.com"));
    }

    @Test
    @DisplayName("🚨 등록된 이메일이 없는 사용자가 있으면 이름을 밝히고 전체를 거부한다 — 부분 발송 금지")
    void sendMail_recipients_rejectsUserWithoutEmail() {
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject").emailCn("Content")
                .recipients(List.of(
                        MailRecipientDto.builder().esntlId("USR_A").build(),
                        MailRecipientDto.builder().esntlId("USR_NOMAIL").build()))
                .build();
        given(userContactService.resolve(List.of("USR_A", "USR_NOMAIL"))).willReturn(List.of(
                new UserContactService.UserContact("USR_A", "갑", "gap@example.com", null),
                new UserContactService.UserContact("USR_NOMAIL", "병", null, "01011112222")));

        assertThatThrownBy(() -> mailService.sendMail("admin", dto))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .hasMessageContaining("병");
        verify(sentMailRepository, never()).save(any(SentMail.class));
        verify(mailAsyncProcessor, never()).processSending(anyLong(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("수신자가 하나도 없거나(둘 다 비움) 한 항목에 사용자와 주소를 함께 주면 거부한다")
    void sendMail_recipients_rejectsEmptyOrAmbiguous() {
        SentMailDto none = SentMailDto.builder().sj("S").emailCn("C").build();
        assertThatThrownBy(() -> mailService.sendMail("admin", none))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .hasMessageContaining("수신자를 한 명 이상");

        SentMailDto ambiguous = SentMailDto.builder().sj("S").emailCn("C")
                .recipients(List.of(MailRecipientDto.builder().esntlId("USR_A").emlAddr("a@b.c").build()))
                .build();
        assertThatThrownBy(() -> mailService.sendMail("admin", ambiguous))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .hasMessageContaining("중 하나");
        verify(sentMailRepository, never()).save(any(SentMail.class));
    }

    @Test
    @DisplayName("같은 주소는 한 번만 보내고, 종전 recptnPerson 도 함께 오면 그 주소로 1건 더 보낸다")
    void sendMail_recipients_deduplicatesAndKeepsLegacyField() {
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject").emailCn("Content")
                .recptnPerson("legacy@example.com")
                .recipients(List.of(
                        MailRecipientDto.builder().emlAddr("dup@example.com").build(),
                        MailRecipientDto.builder().emlAddr("dup@example.com").build()))
                .build();
        given(userContactService.resolve(List.of())).willReturn(List.of());
        given(sentMailRepository.save(any(SentMail.class)))
                .willReturn(SentMail.builder().emlDsptchSn(1L).build());

        mailService.sendMail("admin", dto);

        org.mockito.ArgumentCaptor<SentMail> saved = org.mockito.ArgumentCaptor.forClass(SentMail.class);
        verify(sentMailRepository, times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(SentMail::getRcvrNm)
                .containsExactly("dup@example.com", "legacy@example.com");
    }

    @Test
    @DisplayName("메일 결과 업데이트")
    void updateMailResult() {
        SentMail mail = SentMail.builder().emlDsptchSn(1L).dsptchRsltCd("P").build();
        given(sentMailRepository.findById(1L)).willReturn(Optional.of(mail));

        mailService.updateMailResult(1L, "S");

        assertThat(mail.getDsptchRsltCd()).isEqualTo("S");
    }

    @Test
    @DisplayName("메일 삭제")
    void deleteMail() {
        SentMail mail = SentMail.builder().emlDsptchSn(1L).build();
        given(sentMailRepository.findById(1L)).willReturn(Optional.of(mail));

        mailService.deleteMail(1L);

        verify(sentMailRepository).delete(mail);
    }

    @Test
    @DisplayName("보낸 메일 목록 조회 - 키워드 포함(제목 조건으로 위임)")
    void getSentMailList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        given(sentMailRepository.searchSentMails(isNull(), eq("1"), eq("key"), eq(pageable)))
                .willReturn(Page.empty());

        mailService.getSentMailList("key", pageable);

        // 키워드 전용 오버로드도 스코프가 적용되는 경로(searchSentMails)로 위임되어야 한다.
        // findBySjContaining 으로 되돌아가면 발신자 스코프가 무력화된다.
        verify(sentMailRepository).searchSentMails(isNull(), eq("1"), eq("key"), eq(pageable));
        verify(sentMailRepository, never()).findBySjContaining(anyString(), any(Pageable.class));
    }

    @Test
    @DisplayName("보낸 메일 목록 조회 - 검색 조건 포함")
    void getSentMailList_WithCondition() {
        Pageable pageable = PageRequest.of(0, 10);
        given(sentMailRepository.searchSentMails(nullable(String.class), anyString(), anyString(), eq(pageable)))
                .willReturn(Page.empty());

        mailService.getSentMailList("sj", "key", pageable);

        verify(sentMailRepository).searchSentMails(nullable(String.class), anyString(), anyString(), eq(pageable));
    }

    @Test
    @DisplayName("[보안] 일반 사용자 목록 조회는 본인 loginId 로 스코프가 좁혀진다")
    void getSentMailList_normalUser_scopedToSelf() {
        Pageable pageable = PageRequest.of(0, 10);
        asUser("user1");
        given(sentMailRepository.searchSentMails(eq("user1"), anyString(), nullable(String.class), eq(pageable)))
                .willReturn(Page.empty());

        mailService.getSentMailList("1", null, pageable);

        // null(전건)이 아니라 반드시 본인 loginId 가 넘어가야 한다 — 발송메일 전건 노출 회귀 가드
        verify(sentMailRepository).searchSentMails(eq("user1"), anyString(), nullable(String.class), eq(pageable));
        verify(sentMailRepository, never()).searchSentMails(isNull(), anyString(), nullable(String.class),
                any(Pageable.class));
    }

    @Test
    @DisplayName("[보안] 타인의 메일 상세 조회는 ACCESS_DENIED")
    void getSentMail_otherUsersMail_denied() {
        asUser("user1");
        SentMail mail = SentMail.builder().emlDsptchSn(1L).emlTtl("Subject").build();
        mail.setFrstRgtrId("user2");
        given(sentMailRepository.findById(1L)).willReturn(Optional.of(mail));

        assertThatThrownBy(() -> mailService.getSentMail(1L))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }

    @Test
    @DisplayName("[보안] 타인의 메일 삭제는 ACCESS_DENIED")
    void deleteMail_otherUsersMail_denied() {
        asUser("user1");
        SentMail mail = SentMail.builder().emlDsptchSn(1L).build();
        mail.setFrstRgtrId("user2");
        given(sentMailRepository.findById(1L)).willReturn(Optional.of(mail));

        assertThatThrownBy(() -> mailService.deleteMail(1L))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
        verify(sentMailRepository, never()).delete(any(SentMail.class));
    }

    @Test
    @DisplayName("보낸 메일 상세 조회 - 데이터 없음")
    void getSentMail_NotFound() {
        given(sentMailRepository.findById(anyLong())).willReturn(Optional.empty());
        assertThatThrownBy(() -> mailService.getSentMail(999L))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }

    @Test
    @DisplayName("보낸 메일 목록 조회 - 빈 키워드")
    void getSentMailList_EmptyKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SentMail mail = SentMail.builder().emlDsptchSn(1L).emlTtl("Subject").build();
        given(sentMailRepository.searchSentMails(isNull(), eq("1"), eq(""), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(mail)));

        Page<SentMailDto> result = mailService.getSentMailList("", pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("SentMailDto - null 엔티티 변환")
    void sentMailDto_FromNull() {
        SentMailDto result = SentMailDto.from(null);
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("메일 결과 업데이트 - 데이터 없음")
    void updateMailResult_NotFound() {
        given(sentMailRepository.findById(anyLong())).willReturn(Optional.empty());
        assertThatThrownBy(() -> mailService.updateMailResult(999L, "F"))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }

    @Test
    @DisplayName("메일 삭제 - 데이터 없음")
    void deleteMail_NotFound() {
        given(sentMailRepository.findById(anyLong())).willReturn(Optional.empty());
        assertThatThrownBy(() -> mailService.deleteMail(999L))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }
}
