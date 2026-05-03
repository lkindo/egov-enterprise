package nuri.business.domain.report;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
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
import nuri.foundation.domain.config.JpaConfig;
import nuri.foundation.security.audit.LoginUserAuditorAware;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("WorkReportRepository 테스트")
class WorkReportRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private WorkReportRepository workReportRepository;

    @Autowired
    private EntityManager em;

    @BeforeEach
    void setUp() {
        WorkReport report1 = WorkReport.builder()
                .reportId("REP001")
                .reportSubject("Monthly Report")
                .reportContent("Details...")
                .writerId("USER1")
                .reportType("1")
                .build();
        
        WorkReport report2 = WorkReport.builder()
                .reportId("REP002")
                .reportSubject("Weekly Status")
                .reportContent("Progress...")
                .writerId("USER2")
                .reportType("2")
                .build();

        em.persist(report1);
        em.persist(report2);
        em.flush();
        em.clear();
    }

    @Test
    @DisplayName("searchWorkReports - 조건 없음")
    void searchWorkReports_NoConditions() {
        Page<WorkReport> result = workReportRepository.searchWorkReports(
                null, null, null, null, null, null, null, null, PageRequest.of(0, 10));
        
        assertThat(result.getContent()).hasSize(2);
    }

    @Test
    @DisplayName("searchWorkReports - 작성자 ID 검색")
    void searchWorkReports_SearchId() {
        Page<WorkReport> result = workReportRepository.searchWorkReports(
                "USER1", null, null, null, null, null, null, null, PageRequest.of(0, 10));
        
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getReportId()).isEqualTo("REP001");
    }

    @Test
    @DisplayName("searchWorkReports - 보고서 유형 검색")
    void searchWorkReports_SearchSe() {
        Page<WorkReport> result = workReportRepository.searchWorkReports(
                null, null, null, null, null, null, null, "2", PageRequest.of(0, 10));
        
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getReportId()).isEqualTo("REP002");
    }

    @Test
    @DisplayName("searchWorkReports - 보고서 유형 0은 무시")
    void searchWorkReports_SearchSeZero() {
        Page<WorkReport> result = workReportRepository.searchWorkReports(
                null, null, null, null, null, null, null, "0", PageRequest.of(0, 10));
        
        assertThat(result.getContent()).hasSize(2);
    }

    @Test
    @DisplayName("searchWorkReports - 제목 검색")
    void searchWorkReports_SearchSubject() {
        Page<WorkReport> result = workReportRepository.searchWorkReports(
                null, null, null, null, "0", "Monthly", null, null, PageRequest.of(0, 10));
        
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getReportId()).isEqualTo("REP001");
    }
}
