package nuri.business.service.mail;

import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import nuri.business.service.mail.dto.SentMailDto;
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

    /**
     * 발송메일 조회는 발신자 스코프(IDOR 차단)를 타므로 SecurityContext 가 필요하다.
     * 기본은 <b>관리자</b>로 두고, 스코프 자체를 검증하는 테스트에서만 일반 사용자로 바꾼다.
     */
    private MockedStatic<SecurityUtil> securityUtil;

    @BeforeEach
    void openSecurityUtilMock() {
        securityUtil = Mockito.mockStatic(SecurityUtil.class);
        asAdmin();
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
        SentMail mail = SentMail.builder().msgId("M1").emlTtl("Subject").build();
        given(sentMailRepository.searchSentMails(isNull(), eq("1"), isNull(), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(mail)));

        Page<SentMailDto> result = mailService.getSentMailList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getMssageId()).isEqualTo("M1");
    }

    @Test
    @DisplayName("보낸 메일 상세 조회 - 성공")
    void getSentMail_Success() {
        SentMail mail = SentMail.builder().msgId("M1").emlTtl("Subject").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(mail));

        SentMailDto result = mailService.getSentMail("M1");

        assertThat(result.getMssageId()).isEqualTo("M1");
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

        String mssageId = mailService.sendMail("user1", dto);

        assertThat(mssageId).startsWith("MAIL_");
        verify(sentMailRepository).save(any(SentMail.class));
        verify(mailAsyncProcessor).processSending(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("메일 결과 업데이트")
    void updateMailResult() {
        SentMail mail = SentMail.builder().msgId("M1").dsptchRsltCd("P").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(mail));

        mailService.updateMailResult("M1", "S");

        assertThat(mail.getDsptchRsltCd()).isEqualTo("S");
    }

    @Test
    @DisplayName("메일 삭제")
    void deleteMail() {
        SentMail mail = SentMail.builder().msgId("M1").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(mail));

        mailService.deleteMail("M1");

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
        SentMail mail = SentMail.builder().msgId("M1").emlTtl("Subject").build();
        mail.setFrstRgtrId("user2");
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(mail));

        assertThatThrownBy(() -> mailService.getSentMail("M1"))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }

    @Test
    @DisplayName("[보안] 타인의 메일 삭제는 ACCESS_DENIED")
    void deleteMail_otherUsersMail_denied() {
        asUser("user1");
        SentMail mail = SentMail.builder().msgId("M1").build();
        mail.setFrstRgtrId("user2");
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(mail));

        assertThatThrownBy(() -> mailService.deleteMail("M1"))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
        verify(sentMailRepository, never()).delete(any(SentMail.class));
    }

    @Test
    @DisplayName("보낸 메일 상세 조회 - 데이터 없음")
    void getSentMail_NotFound() {
        given(sentMailRepository.findById(anyString())).willReturn(Optional.empty());
        assertThatThrownBy(() -> mailService.getSentMail("MISSING"))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }

    @Test
    @DisplayName("보낸 메일 목록 조회 - 빈 키워드")
    void getSentMailList_EmptyKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SentMail mail = SentMail.builder().msgId("M1").emlTtl("Subject").build();
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
        given(sentMailRepository.findById(anyString())).willReturn(Optional.empty());
        assertThatThrownBy(() -> mailService.updateMailResult("MISSING", "F"))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }

    @Test
    @DisplayName("메일 삭제 - 데이터 없음")
    void deleteMail_NotFound() {
        given(sentMailRepository.findById(anyString())).willReturn(Optional.empty());
        assertThatThrownBy(() -> mailService.deleteMail("MISSING"))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }
}
