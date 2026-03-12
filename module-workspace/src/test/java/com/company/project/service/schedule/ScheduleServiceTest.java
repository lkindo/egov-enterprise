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
}
