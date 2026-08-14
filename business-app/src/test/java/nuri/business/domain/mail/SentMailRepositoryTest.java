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
