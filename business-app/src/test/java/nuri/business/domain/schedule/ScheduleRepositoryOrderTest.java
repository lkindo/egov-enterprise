package nuri.business.domain.schedule;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 달력 일정 조회의 표시 순서를 고정한다(2026-09-26 DIP C7).
 *
 * <p>월·기간 조회 쿼리에 ORDER BY 가 없어 같은 날 일정의 순서를 DB 가 정했다 — 화면을 열 때마다 순서가 바뀔 수
 * 있었다. 시작일 순, 같으면 등록 순으로 읽는다.
 */
@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("ScheduleRepository 표시 순서")
class ScheduleRepositoryOrderTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private ScheduleRepository scheduleRepository;

    private Schedule save(String name, String beginYmd) {
        return scheduleRepository.save(Schedule.builder()
                .schdlNm(name)
                .schdlSeCd("2")
                .schdlBgngYmd(beginYmd)
                .schdlEndYmd(beginYmd)
                .schdlPicId("USER_A")
                .schdlDeptId("DEPT_A")
                .build());
    }

    @Test
    @DisplayName("월·기간 조회는 시작일 순, 같은 날은 등록 순으로 돌려준다")
    void monthlyAndRangeQueriesOrderByBeginDateThenRegistration() {
        // 등록 순서를 표시 순서와 일부러 다르게 둔다: 늦은 날짜를 먼저 등록한다.
        save("셋째 — 10일", "20260910");
        save("첫째 — 5일 먼저 등록", "20260905");
        save("둘째 — 5일 나중 등록", "20260905");

        List<String> monthly = scheduleRepository.findMonthlySchedules("USER_A", "DEPT_A", "202609")
                .stream().map(Schedule::getSchdlNm).toList();
        List<String> range = scheduleRepository.findSchedulesByDateRange("USER_A", "20260901", "20260930")
                .stream().map(Schedule::getSchdlNm).toList();
        List<String> ownerRange = scheduleRepository.findSchedulesByDateRange(null, "USER_A", "20260901", "20260930")
                .stream().map(Schedule::getSchdlNm).toList();

        List<String> expected = List.of("첫째 — 5일 먼저 등록", "둘째 — 5일 나중 등록", "셋째 — 10일");
        assertThat(monthly).containsExactlyElementsOf(expected);
        assertThat(range).containsExactlyElementsOf(expected);
        assertThat(ownerRange).containsExactlyElementsOf(expected);
    }
}
