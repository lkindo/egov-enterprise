package nuri.business.domain.schedule;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
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

    @ParameterizedTest
    @NullAndEmptySource
    @DisplayName("NULL·빈 종료일은 월·두 기간 조회에서 시작일 하루로 판정한다")
    void absentEndDatesRemainVisibleOnlyOnTheirStartDay(String endDate) {
        Schedule day = scheduleRepository.saveAndFlush(Schedule.builder().schdlNm("하루 일정")
                .schdlSeCd("2").schdlBgngYmd("20261015").schdlEndYmd(endDate)
                .schdlPicId("USER_A").schdlDeptId("DEPT_A").build());

        assertThat(scheduleRepository.findMonthlySchedules("USER_A", "DEPT_A", "202610"))
                .extracting(Schedule::getSchdlSn).containsExactly(day.getSchdlSn());
        assertThat(scheduleRepository.findSchedulesByDateRange("USER_A", "20261015", "20261015"))
                .extracting(Schedule::getSchdlSn).containsExactly(day.getSchdlSn());
        assertThat(scheduleRepository.findSchedulesByDateRange("2", "USER_A", "20261015", "20261015"))
                .extracting(Schedule::getSchdlSn).containsExactly(day.getSchdlSn());
        assertThat(scheduleRepository.findSchedulesByDateRange("USER_A", "20261014", "20261014")).isEmpty();
        assertThat(scheduleRepository.findSchedulesByDateRange(null, "USER_A", "20261016", "20261016")).isEmpty();
        assertThat(scheduleRepository.findMonthlySchedules("USER_A", "DEPT_A", "202609")).isEmpty();
        assertThat(scheduleRepository.findMonthlySchedules("USER_A", "DEPT_A", "202611")).isEmpty();
        assertThat(day.getSchdlEndYmd()).as("read compatibility must not rewrite an existing value")
                .isEqualTo(endDate);
    }

    @Test
    @DisplayName("빈 종료일 읽기 호환도 본인·부서 공유 범위를 넓히지 않는다")
    void emptyEndDateQueriesPreserveOwnerAndDepartmentScope() {
        Schedule own = saveScopeFixture("내 개인 일정", "USER_A", "DEPT_A", "2");
        Schedule shared = saveScopeFixture("같은 부서 공유", "USER_B", "DEPT_A", "1");
        saveScopeFixture("같은 부서 타인 개인", "USER_B", "DEPT_A", "2");
        saveScopeFixture("다른 부서 공유", "USER_C", "DEPT_B", "1");
        scheduleRepository.flush();

        assertThat(scheduleRepository.findMonthlySchedules("USER_A", "DEPT_A", "202610"))
                .extracting(Schedule::getSchdlSn).containsExactly(own.getSchdlSn(), shared.getSchdlSn());
        assertThat(scheduleRepository.findSchedulesByDateRange("USER_A", "20261001", "20261031"))
                .extracting(Schedule::getSchdlSn).containsExactly(own.getSchdlSn());
        assertThat(scheduleRepository.findSchedulesByDateRange("2", "USER_A", "20261001", "20261031"))
                .extracting(Schedule::getSchdlSn).containsExactly(own.getSchdlSn());
        assertThat(scheduleRepository.findSchedulesByDateRange("1", "USER_A", "20261001", "20261031"))
                .isEmpty();
    }

    private Schedule saveScopeFixture(String name, String owner, String department, String scope) {
        return scheduleRepository.save(Schedule.builder().schdlNm(name).schdlSeCd(scope)
                .schdlBgngYmd("20261015").schdlEndYmd("").schdlPicId(owner).schdlDeptId(department).build());
    }

    @Test
    @DisplayName("부서 일정 페이지는 날짜·일련번호 순이며 부서·구분·검색 범위를 유지한다")
    void departmentPagesHaveStableOrderAndPreserveScope() {
        scheduleRepository.save(Schedule.builder().schdlNm("회의 - 다른 부서")
                .schdlSeCd("1").schdlDeptId("DEPT_B").schdlBgngYmd("20260801").build());
        save("회의 - 개인 일정", "20260801");
        scheduleRepository.save(Schedule.builder().schdlNm("검색 범위 밖")
                .schdlSeCd("1").schdlDeptId("DEPT_A").schdlBgngYmd("20260801").build());
        Schedule later = scheduleRepository.save(Schedule.builder().schdlNm("회의 - 늦은 날짜")
                .schdlSeCd("1").schdlDeptId("DEPT_A").schdlBgngYmd("20260910").build());
        Schedule first = scheduleRepository.save(Schedule.builder().schdlNm("회의 - 같은 날 먼저")
                .schdlSeCd("1").schdlDeptId("DEPT_A").schdlBgngYmd("20260905").build());
        Schedule second = scheduleRepository.save(Schedule.builder().schdlNm("회의 - 같은 날 나중")
                .schdlSeCd("1").schdlDeptId("DEPT_A").schdlBgngYmd("20260905").build());
        scheduleRepository.flush();

        var page1 = scheduleRepository.searchDeptSchedules("1", "DEPT_A", "회의", PageRequest.of(0, 2));
        var page2 = scheduleRepository.searchDeptSchedules("1", "DEPT_A", "회의", PageRequest.of(1, 2));

        assertThat(page1.getTotalElements()).isEqualTo(3);
        assertThat(page1.getContent()).extracting(Schedule::getSchdlSn)
                .containsExactly(first.getSchdlSn(), second.getSchdlSn());
        assertThat(page2.getContent()).extracting(Schedule::getSchdlSn).containsExactly(later.getSchdlSn());
    }
}
