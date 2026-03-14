package com.company.project.service.schedule;

import com.company.project.domain.schedule.Schedule;
import com.company.project.domain.schedule.ScheduleRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.schedule.dto.ScheduleDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScheduleService 테스트")
class ScheduleServiceTest {

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ScheduleService scheduleService;

    @Test
    @DisplayName("일정 목록 조회 성공")
    void getScheduleList_Success() {
        // Given
        Page<Schedule> page = new PageImpl<>(List.of(Schedule.builder().schdulId("SCH1").build()));
        given(scheduleRepository.findByFrstRegisterId(anyString(), any(Pageable.class))).willReturn(page);

        // When
        Page<ScheduleDto> result = scheduleService.getScheduleList("user", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("일정 상세 조회 성공")
    void getSchedule_Success() {
        // Given
        Schedule entity = Schedule.builder().schdulId("SCH1").schdulNm("Title").build();
        given(scheduleRepository.findById("SCH1")).willReturn(Optional.of(entity));

        // When
        ScheduleDto result = scheduleService.getSchedule("SCH1");

        // Then
        assertThat(result.getSchdulNm()).isEqualTo("Title");
    }

    @Test
    @DisplayName("일정 등록 성공")
    void createSchedule_Success() {
        // Given
        ScheduleDto dto = ScheduleDto.builder().schdulNm("New").build();

        // When
        String id = scheduleService.createSchedule("user", dto);

        // Then
        assertThat(id).startsWith("SCHDUL_");
        verify(scheduleRepository).save(any(Schedule.class));
    }

    @Test
    @DisplayName("사용자 팝업 조회 성공")
    void selectEmpLyrPopup_Success() {
        // Given
        egovframework.com.cmm.ComDefaultVO searchVO = new egovframework.com.cmm.ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageSize(10);
        Page<User> page = new PageImpl<>(List.of(User.builder().userId("user1").userNm("Name").esntlId("E1").password("pass").build()));
        given(userRepository.searchUsers(any(), any(), any(), any())).willReturn(page);

        // When
        java.util.List<java.util.Map<String, Object>> result = scheduleService.selectEmpLyrPopup(searchVO);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("userNm")).isEqualTo("Name");
    }

    @Test
    @DisplayName("월간 일정 조회 성공")
    void getMonthlySchedule_Success() {
        // Given
        given(scheduleRepository.findOverlappingSchedules(anyString(), anyString())).willReturn(List.of(Schedule.builder().schdulId("SCH1").build()));

        // When
        List<ScheduleDto> result = scheduleService.getMonthlySchedule("user", "202403");

        // Then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("일정 수정 성공")
    void updateSchedule_Success() {
        // Given
        Schedule entity = Schedule.builder().schdulId("SCH1").createdBy("user").build();
        given(scheduleRepository.findById("SCH1")).willReturn(Optional.of(entity));
        ScheduleDto dto = ScheduleDto.builder().schdulNm("Updated").build();

        // When
        scheduleService.updateSchedule("SCH1", "user", dto);

        // Then
        assertThat(entity.getSchdulNm()).isEqualTo("Updated");
    }

    @Test
    @DisplayName("일정 삭제 성공")
    void deleteSchedule_Success() {
        // Given
        Schedule entity = Schedule.builder().schdulId("SCH1").build();
        given(scheduleRepository.findById("SCH1")).willReturn(Optional.of(entity));

        // When
        scheduleService.deleteSchedule("SCH1", "user");

        // Then
        verify(scheduleRepository).delete(entity);
    }
}
