package nuri.business.domain.calendar;

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
@DisplayName("RestdeRepository 테스트")
class RestdeRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private RestdeRepository restdeRepository;

    @Autowired
    private EntityManager em;

    @BeforeEach
    void setUp() {
        Restde r1 = Restde.builder()
                .hldyYmd("20260101")
                .hldyNm("New Year")
                .hldyExpln("New Year's Day")
                .hldySeCd("1")
                .build();
        
        Restde r2 = Restde.builder()
                .hldyYmd("20260301")
                .hldyNm("Independence Movement Day")
                .hldyExpln("March 1st Movement")
                .hldySeCd("2")
                .build();
        
        em.persist(r1);
        em.persist(r2);
        em.flush();
        em.clear();
    }

    @Test
    @DisplayName("searchRestde - 검색어 없음")
    void searchRestde_NoKeyword() {
        Page<Restde> result = restdeRepository.searchRestde(
                null, null, PageRequest.of(0, 10));
        
        assertThat(result.getContent()).hasSize(2);
    }

    @Test
    @DisplayName("searchRestde - 조건 1: 휴일일자")
    void searchRestde_Condition1() {
        Page<Restde> result = restdeRepository.searchRestde(
                "1", "20260101", PageRequest.of(0, 10));
        
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getHldyNm()).isEqualTo("New Year");
    }

    @Test
    @DisplayName("searchRestde - 조건 2: 휴일명")
    void searchRestde_Condition2() {
        Page<Restde> result = restdeRepository.searchRestde(
                "2", "Movement", PageRequest.of(0, 10));
        
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getHldyYmd()).isEqualTo("20260301");
    }

    @Test
    @DisplayName("searchRestde - 알 수 없는 조건")
    void searchRestde_UnknownCondition() {
        Page<Restde> result = restdeRepository.searchRestde(
                "99", "Keyword", PageRequest.of(0, 10));
        
        assertThat(result.getContent()).hasSize(2); // no filtering applied
    }
}
