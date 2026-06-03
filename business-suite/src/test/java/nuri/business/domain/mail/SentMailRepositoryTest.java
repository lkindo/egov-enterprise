package nuri.business.domain.mail;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
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
                .msgId("MAIL_001")
                .emlTtl("Test Subject 1")
                .emlCn("Test Content 1")
                .sndptyNm("Sender 1")
                .build();
        SentMail mail2 = SentMail.builder()
                .msgId("MAIL_002")
                .emlTtl("Another Mail")
                .emlCn("Special Message")
                .sndptyNm("Manager")
                .build();
        sentMailRepository.save(mail1);
        sentMailRepository.save(mail2);
        em.flush();
        em.clear();
    }

    @Test
    @DisplayName("발송 메일 검색 테스트 - 제목 (1)")
    void searchSentMails_Subject() {
        Page<SentMail> result = sentMailRepository.searchSentMails("1", "Subject", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmlTtl()).contains("Subject");
    }

    @Test
    @DisplayName("발송 메일 검색 테스트 - 내용 (2)")
    void searchSentMails_Content() {
        Page<SentMail> result = sentMailRepository.searchSentMails("2", "Special", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmlCn()).contains("Special");
    }

    @Test
    @DisplayName("발송 메일 검색 테스트 - 발신자 (3)")
    void searchSentMails_Sender() {
        Page<SentMail> result = sentMailRepository.searchSentMails("3", "Manager", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSndptyNm()).isEqualTo("Manager");
    }

    @Test
    @DisplayName("발송 메일 검색 테스트 - 검색어 없음")
    void searchSentMails_NoKeyword() {
        Page<SentMail> result = sentMailRepository.searchSentMails("1", "", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(2);
    }
}
