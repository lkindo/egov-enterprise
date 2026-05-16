package nuri.business.service.schedule;

import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
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

@DisplayName("ScheduleService 단위 테스트")
class ScheduleServiceTest {

    @Mock
    private ScheduleRepository scheduleRepository;

    @InjectMocks
    private ScheduleService scheduleService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("일정 목록 조회")
    void getScheduleList() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Schedule entity = Schedule.builder().schdlId("S1").schdlTtl("Test Schedule").build();
        given(scheduleRepository.searchSchedules(any(), any(), any())).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<ScheduleDto> result = scheduleService.getScheduleList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSchdlTtl()).isEqualTo("Test Schedule");
    }

    @Test
    @DisplayName("일정 상세 조회")
    void getSchedule() {
        // given
        String schdlId = "S1";
        Schedule entity = Schedule.builder().schdlId(schdlId).schdlTtl("Test Schedule").build();
        given(scheduleRepository.findById(schdlId)).willReturn(Optional.of(entity));

        // when
        ScheduleDto result = scheduleService.getSchedule(schdlId);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getSchdlId()).isEqualTo(schdlId);
    }

    @Test
    @DisplayName("일정 생성")
    void createSchedule() {
        // given
        String userId = "user1";
        ScheduleDto dto = ScheduleDto.builder()
                .schdlTtl("New Schedule")
                .schdlSeCd("1")
                .build();

        // when
        scheduleService.createSchedule(userId, dto);

        // then
        verify(scheduleRepository).save(any(Schedule.class));
    }

    @Test
    @DisplayName("일정 수정")
    void updateSchedule() {
        // given
        String schdlId = "S1";
        String userId = "user1";
        Schedule existingEntity = Schedule.builder().schdlId(schdlId).schdlTtl("Old Title").build();
        ScheduleDto updateDto = ScheduleDto.builder()
                .schdlId(schdlId)
                .schdlTtl("New Title")
                .build();

        given(scheduleRepository.findById(schdlId)).willReturn(Optional.of(existingEntity));

        // when
        scheduleService.updateSchedule(schdlId, userId, updateDto);

        // then
        assertThat(existingEntity.getSchdlTtl()).isEqualTo("New Title");
    }

    @Test
    @DisplayName("일정 삭제")
    void deleteSchedule() {
        // given
        String schdlId = "S1";

        // when
        scheduleService.deleteSchedule(schdlId, "user1");

        // then
        verify(scheduleRepository).deleteById(schdlId);
    }
}
