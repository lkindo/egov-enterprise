package nuri.business.domain.mail;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.mail.EmailSender;
import nuri.business.service.mail.MailAsyncProcessor;
import nuri.business.service.mail.MailService;
import nuri.business.service.mail.dto.SentMailDto;
import nuri.business.service.user.UserContactService;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("SentMailRepository 테스트")
class SentMailRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private SentMailRepository sentMailRepository;

    @Autowired
    private EntityManager em;

    @BeforeEach
    void setUp() {
        SentMail mail1 = SentMail.builder()
                .emlTtl("Test Subject 1")
                .emlCn("Test Content 1")
                .sndptyNm("Sender 1")
                .build();
        SentMail mail2 = SentMail.builder()
                .emlTtl("Another Mail")
                .emlCn("Special Message")
                .sndptyNm("Manager")
                .build();
        sentMailRepository.save(mail1);
        sentMailRepository.save(mail2);
        em.flush();
        em.clear();
    }

    /** 상태·발송 시각·발신자를 직접 적는다 — 감사 필드는 저장 시 채워지므로 저장 뒤에 덮는다. */
    private Long saveMail(String owner, String status, java.time.LocalDateTime dsptchDt) {
        SentMail mail = sentMailRepository.save(SentMail.builder().emlTtl("재발송").emlCn("본문").dsptchRsltCd(status).build());
        em.flush();
        em.createNativeQuery("update tb_email_dsptch_manage set frst_rgtr_id = ?1, dsptch_dt = ?2 where eml_dsptch_sn = ?3")
                .setParameter(1, owner).setParameter(2, dsptchDt).setParameter(3, mail.getEmlDsptchSn())
                .executeUpdate();
        em.clear();
        return mail.getEmlDsptchSn();
    }

    @Test
    @DisplayName("[DIP B5 F7] 재발송 차지는 본인의 실패·10분 넘게 멈춘 대기만 대기로 되돌리고 발송 시각을 지금으로 바꾼다")
    void claimForResend_onlyOwnFailedOrStuck() {
        java.time.LocalDateTime now = java.time.LocalDateTime.of(2026, 9, 26, 12, 0);
        java.time.LocalDateTime stuckBefore = now.minusMinutes(10);
        Long failed = saveMail("owner", "F", now.minusMinutes(1));
        Long stuck = saveMail("owner", "P", now.minusMinutes(30));
        Long inFlight = saveMail("owner", "P", now.minusMinutes(2));
        Long sent = saveMail("owner", "S", now.minusMinutes(30));
        Long others = saveMail("someone", "F", now.minusMinutes(1));

        assertThat(sentMailRepository.claimForResend(failed, "owner", now, stuckBefore)).isEqualTo(1);
        assertThat(sentMailRepository.claimForResend(stuck, "owner", now, stuckBefore)).isEqualTo(1);
        assertThat(sentMailRepository.claimForResend(inFlight, "owner", now, stuckBefore)).isZero();
        assertThat(sentMailRepository.claimForResend(sent, "owner", now, stuckBefore)).isZero();
        assertThat(sentMailRepository.claimForResend(others, "owner", now, stuckBefore)).isZero();

        SentMail claimed = sentMailRepository.findById(failed).orElseThrow();
        assertThat(claimed.getDsptchRsltCd()).isEqualTo("P");
        assertThat(claimed.getDsptchDt()).isEqualTo(now);
        // 같은 요청을 두 번 보내면 두 번째는 진다 — 방금 대기로 바뀐 행은 멈춘 대기가 아니다.
        assertThat(sentMailRepository.claimForResend(failed, "owner", now, stuckBefore)).isZero();
    }

    @Test
    @DisplayName("발송 결과로 좁히면 그 결과의 이력만 세고 싣는다 — '실패만 보기'")
    void searchSentMails_byResultCode() {
        java.time.LocalDateTime at = java.time.LocalDateTime.of(2026, 10, 1, 9, 0);
        Long failed = saveMail("owner", "F", at);
        saveMail("owner", "S", at);
        saveMail("owner", "P", at);

        Page<SentMail> onlyFailed = sentMailRepository.searchSentMails(null, null, null, "F", PageRequest.of(0, 10));
        assertThat(onlyFailed.getTotalElements()).isEqualTo(1);
        assertThat(onlyFailed.getContent()).extracting(SentMail::getEmlDsptchSn).containsExactly(failed);
        assertThat(sentMailRepository.searchSentMails(null, null, null, null, PageRequest.of(0, 10)).getTotalElements())
                .isEqualTo(5);
    }

    @Test
    @DisplayName("발송 메일 검색 테스트 - 제목 (1)")
    void searchSentMails_Subject() {
        Page<SentMail> result = sentMailRepository.searchSentMails(null, "1", "Subject", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmlTtl()).contains("Subject");
    }

    @Test
    @DisplayName("발송 메일 검색 테스트 - 내용 (2)")
    void searchSentMails_Content() {
        Page<SentMail> result = sentMailRepository.searchSentMails(null, "2", "Special", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmlCn()).contains("Special");
    }

    @Test
    @DisplayName("발송 메일 검색 테스트 - 발신자 (3)")
    void searchSentMails_Sender() {
        Page<SentMail> result = sentMailRepository.searchSentMails(null, "3", "Manager", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSndptyNm()).isEqualTo("Manager");
    }

    @Test
    @DisplayName("발송 메일 검색 테스트 - 검색어 없음")
    void searchSentMails_NoKeyword() {
        Page<SentMail> result = sentMailRepository.searchSentMails(null, "1", "", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(2);
    }

    @Test
    @DisplayName("[보안] 발신자 스코프가 지정되면 타인의 발송 메일은 조회되지 않는다")
    void searchSentMails_senderScope_filtersOthers() {
        // 발신자 스코프(senderLoginId)를 주면 frstRgtrId 가 일치하는 건만 나와야 한다.
        // 존재하지 않는 발신자로 조회했는데 결과가 있다면 스코프 조건이 무력화된 것이다.
        // (이 단언이 없으면 senderEq() 를 지워도 나머지 테스트가 전부 통과해 IDOR 회귀를 놓친다)
        Page<SentMail> others = sentMailRepository.searchSentMails("nobody-else", "1", "", PageRequest.of(0, 10));
        assertThat(others.getContent()).isEmpty();
        assertThat(others.getTotalElements()).isZero();

        // 스코프가 null(관리자 전건)일 때만 전건이 보인다 — 대조군
        Page<SentMail> all = sentMailRepository.searchSentMails(null, "1", "", PageRequest.of(0, 10));
        assertThat(all.getContent()).hasSize(2);
    }

    @Test
    @DisplayName("서비스와 실제 쿼리: 타인 본문을 바꿔도 관리자 본문 검색의 페이지와 전체 건수는 변하지 않는다")
    void bodySearchDoesNotDependOnAnotherSendersContentOrPageCounts() {
        Long firstOwn = saveSearchMail("search-admin", "own first", "private-marker");
        Long secondOwn = saveSearchMail("search-admin", "own second", "private-marker");
        saveSearchMail("search-admin", "own unrelated", "other content");
        saveSearchMail("another-sender", "other first", "private-marker");
        saveSearchMail("another-sender", "other second", "private-marker");
        saveSearchMail(null, "unknown sender", "private-marker");

        MailService service = searchService();
        try (MockedStatic<SecurityUtil> security = Mockito.mockStatic(SecurityUtil.class)) {
            security.when(() -> SecurityUtil.hasPermission("MAIL_READ_ALL")).thenReturn(true);
            security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("search-admin"));

            Page<SentMailDto> beforeFirst = service.getSentMailList("2", "private-marker", PageRequest.of(0, 1));
            Page<SentMailDto> beforeSecond = service.getSentMailList("2", "private-marker", PageRequest.of(1, 1));
            assertThat(beforeFirst.getContent()).extracting(SentMailDto::getEmlDsptchSn).containsExactly(secondOwn);
            assertThat(beforeSecond.getContent()).extracting(SentMailDto::getEmlDsptchSn).containsExactly(firstOwn);
            assertThat(beforeFirst.getTotalElements()).isEqualTo(2);
            assertThat(beforeSecond.getTotalElements()).isEqualTo(2);
            assertThat(beforeFirst.getTotalPages()).isEqualTo(2);

            em.createNativeQuery("update tb_email_dsptch_manage set eml_cn = ?1 where frst_rgtr_id = ?2 or frst_rgtr_id is null")
                    .setParameter(1, "changed-hidden-marker").setParameter(2, "another-sender").executeUpdate();
            em.clear();

            Page<SentMailDto> afterFirst = service.getSentMailList("2", "private-marker", PageRequest.of(0, 1));
            Page<SentMailDto> afterSecond = service.getSentMailList("2", "private-marker", PageRequest.of(1, 1));
            assertThat(afterFirst.getContent()).extracting(SentMailDto::getEmlDsptchSn).containsExactly(secondOwn);
            assertThat(afterSecond.getContent()).extracting(SentMailDto::getEmlDsptchSn).containsExactly(firstOwn);
            assertThat(afterFirst.getTotalElements()).isEqualTo(beforeFirst.getTotalElements());
            assertThat(afterSecond.getTotalElements()).isEqualTo(beforeSecond.getTotalElements());
            Page<SentMailDto> hiddenOnly = service.getSentMailList("2", "changed-hidden-marker", PageRequest.of(0, 1));
            assertThat(hiddenOnly.getContent()).isEmpty();
            assertThat(hiddenOnly.getTotalElements()).isZero();
        }
    }

    @Test
    @DisplayName("서비스와 실제 쿼리: 본인 본문 검색과 관리자 제목·발신자 검색의 기존 범위를 보존한다")
    void bodySearchKeepsOwnMatchesAndLeavesMetadataSearchScopeUnchanged() {
        Long own = saveSearchMail("search-admin", "shared-search-title", "own-body-marker");
        Long other = saveSearchMail("another-sender", "shared-search-title", "other-body-marker");
        MailService service = searchService();
        try (MockedStatic<SecurityUtil> security = Mockito.mockStatic(SecurityUtil.class)) {
            security.when(() -> SecurityUtil.hasPermission("MAIL_READ_ALL")).thenReturn(true);
            security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("search-admin"));

            Page<SentMailDto> ownBody = service.getSentMailList("2", "own-body-marker", PageRequest.of(0, 10));
            assertThat(ownBody.getContent()).extracting(SentMailDto::getEmlDsptchSn).containsExactly(own);
            assertThat(ownBody.getContent()).extracting(SentMailDto::getEmailCn).containsExactly("own-body-marker");

            for (String condition : new String[]{"1", "3"}) {
                String keyword = "1".equals(condition) ? "shared-search-title" : "search-sender-label";
                Page<SentMailDto> metadata = service.getSentMailList(condition, keyword, PageRequest.of(0, 1));
                assertThat(metadata.getContent()).extracting(SentMailDto::getEmlDsptchSn).containsExactly(other);
                assertThat(metadata.getTotalElements()).isEqualTo(2);
                assertThat(metadata.getContent()).extracting(SentMailDto::getEmailCn).containsOnlyNulls();
            }

            security.when(() -> SecurityUtil.hasPermission("MAIL_READ_ALL")).thenReturn(false);
            Page<SentMailDto> ownTitle = service.getSentMailList("1", "shared-search-title", PageRequest.of(0, 10));
            assertThat(ownTitle.getContent()).extracting(SentMailDto::getEmlDsptchSn).containsExactly(own);
            assertThat(ownTitle.getTotalElements()).isEqualTo(1);
        }
    }

    private MailService searchService() {
        return new MailService(sentMailRepository, mock(MailAsyncProcessor.class), mock(UserContactService.class),
                mock(EmailSender.class));
    }

    /** 격리된 테스트 DB의 가상 메일만 만든다. 저장 감사값을 바꿔 서로 다른 발신자를 표현한다. */
    private Long saveSearchMail(String owner, String title, String body) {
        SentMail mail = sentMailRepository.save(SentMail.builder().emlTtl(title).emlCn(body)
                .sndptyNm("search-sender-label").build());
        em.flush();
        em.createNativeQuery("update tb_email_dsptch_manage set frst_rgtr_id = ?1 where eml_dsptch_sn = ?2")
                .setParameter(1, owner).setParameter(2, mail.getEmlDsptchSn()).executeUpdate();
        em.clear();
        return mail.getEmlDsptchSn();
    }
}
