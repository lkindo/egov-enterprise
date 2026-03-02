package com.company.project.domain.schedule;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("ScheduleRepository 테스트")
class ScheduleRepositoryTest {

        @Autowired
        private ScheduleRepository scheduleRepository;

        @Test
        @DisplayName("일정 저장 및 조회 확인")
        void saveAndFindById() {
                // Given
                Schedule schedule = Schedule.builder()
                                .schdulId("SCH_001")
                                .schdulNm("테스트 일정")
                                .schdulCn("일정 내용")
                                .schdulBgnde("202603011000")
                                .schdulEndde("202603011200")
                                .schdulSe("1")
                                .schdulDeptId("DEPT01")
                                .schdulKindCode("1")
                                .schdulPlace("conference room")
                                .schdulIpcrCode("A")
                                .schdulChargerId("CHARGER01")
                                .atchFileId("FILE_001")
                                .reptitSeCode("1")
                                .frstRegisterId("USER01")
                                .build();

                // When
                scheduleRepository.save(schedule);
                Optional<Schedule> found = scheduleRepository.findById("SCH_001");

                // Then
                assertThat(found).isPresent();
                assertThat(found.get().getSchdulNm()).isEqualTo("테스트 일정");
                assertThat(found.get().getSchdulDeptId()).isEqualTo("DEPT01");
                assertThat(found.get().getSchdulPlace()).isEqualTo("conference room");
                assertThat(found.get().getSchdulIpcrCode()).isEqualTo("A");
        }

        @Test
        @DisplayName("개인/부서 일정 검색 확인")
        void findSchedules() {
                // Given
                scheduleRepository
                                .save(Schedule.builder().schdulId("S1").schdulSe("1").frstRegisterId("OWNER1")
                                                .schdulNm("P1").build());
                scheduleRepository
                                .save(Schedule.builder().schdulId("S2").schdulSe("1").frstRegisterId("OWNER2")
                                                .schdulNm("P2").build());
                scheduleRepository
                                .save(Schedule.builder().schdulId("S3").schdulSe("2").schdulDeptId("DEPT1")
                                                .schdulNm("D1").build());

                // When: 개인 일정 검색
                Page<Schedule> personal = scheduleRepository.findSchedules("1", "OWNER1", PageRequest.of(0, 10));
                // Then
                assertThat(personal.getTotalElements()).isEqualTo(1);
                assertThat(personal.getContent().get(0).getSchdulNm()).isEqualTo("P1");

                // When: 부서 일정 검색
                Page<Schedule> department = scheduleRepository.findSchedules("2", "DEPT1", PageRequest.of(0, 10));
                // Then
                assertThat(department.getTotalElements()).isEqualTo(1);
                assertThat(department.getContent().get(0).getSchdulNm()).isEqualTo("D1");
        }

        @Test
        @DisplayName("날짜 범위 일정 검색 확인")
        void findSchedulesByRange() {
                // Given
                scheduleRepository.save(Schedule.builder()
                                .schdulId("R1")
                                .schdulSe("1")
                                .frstRegisterId("O1")
                                .schdulBgnde("20260301")
                                .schdulEndde("20260305")
                                .build());

                // When: 정확히 겹치는 범위
                List<Schedule> result1 = scheduleRepository.findSchedulesByRange("1", "O1", "20260301", "20260305");
                // When: 일부 겹치는 범위
                List<Schedule> result2 = scheduleRepository.findSchedulesByRange("1", "O1", "20260228", "20260302");
                // When: 겹치지 않는 범위
                List<Schedule> result3 = scheduleRepository.findSchedulesByRange("1", "O1", "20260306", "20260310");

                // Then
                assertThat(result1).hasSize(1);
                assertThat(result2).hasSize(1);
                assertThat(result3).isEmpty();
        }

        @Test
        @DisplayName("일정 정보 수정 확인")
        void updateSchedule() {
                // Given
                Schedule schedule = Schedule.builder()
                                .schdulId("U1")
                                .schdulNm("Old Title")
                                .build();
                scheduleRepository.save(schedule);

                // When
                Schedule saved = scheduleRepository.findById("U1").orElseThrow();
                saved.update("2", "1", "20260301", "20260301", "New Title", "New Content", "Place", "A", "FILE_001",
                                "1",
                                "ADMIN");
                scheduleRepository.saveAndFlush(saved);

                // Then
                Schedule updated = scheduleRepository.findById("U1").orElseThrow();
                assertThat(updated.getSchdulNm()).isEqualTo("New Title");
                assertThat(updated.getSchdulSe()).isEqualTo("2");
                assertThat(updated.getLastUpdusrId()).isEqualTo("ADMIN");
        }
}
