package nuri.business.domain.mail;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
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

import static org.assertj.core.api.Assertions.assertThat;

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
}
