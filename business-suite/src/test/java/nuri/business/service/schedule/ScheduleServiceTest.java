package nuri.business.service.schedule;

import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
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

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    @InjectMocks
    private ScheduleService scheduleService;

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private UserRepository userRepository;

    @Test
    @DisplayName("사용자 팝업 조회")
    void selectEmpLyrPopup() {
        // given
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageSize(10);
        searchVO.setSearchCondition("1");
        searchVO.setSearchKeyword("test");

        User user = User.builder()
                .userId("user1")
                .userNm("Tester")
                .esntlId("ESNTL_1")
                .password("password")
                .build();
        Page<User> users = new PageImpl<>(Collections.singletonList(user));

        given(userRepository.searchUsers(isNull(), eq("1"), eq("test"), any(Pageable.class))).willReturn(users);

        // when
        List<Map<String, Object>> result = scheduleService.selectEmpLyrPopup(searchVO);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("emplyrId")).isEqualTo("user1");
    }

    @Test
    @DisplayName("일정 목록 조회 (사용자 ID 기반)")
    void getScheduleList_ByUserId() {
        // given
        String userId = "user1";
        Pageable pageable = PageRequest.of(0, 10);
        Schedule schedule = Schedule.builder().schdulId("SCH_1").schdulNm("Test").build();
        Page<Schedule> page = new PageImpl<>(Collections.singletonList(schedule));

        given(scheduleRepository.findByFrstRegisterId(userId, pageable)).willReturn(page);

        // when
        Page<ScheduleDto> result = scheduleService.getScheduleList(userId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("월간 일정 조회")
    void getMonthlySchedule() {
        // given
        String userId = "user1";
        String yearMonth = "202405";
        Schedule schedule = Schedule.builder().schdulId("SCH_1").schdulNm("Test").build();

        given(scheduleRepository.findOverlappingSchedules(anyString(), anyString())).willReturn(Collections.singletonList(schedule));

        // when
        List<ScheduleDto> result = scheduleService.getMonthlySchedule(userId, yearMonth);

        // then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("일정 상세 조회")
    void getSchedule() {
        // given
        String id = "SCH_1";
        Schedule schedule = Schedule.builder().schdulId(id).schdulNm("Test").build();
        given(scheduleRepository.findById(id)).willReturn(Optional.of(schedule));

        // when
        ScheduleDto result = scheduleService.getSchedule(id);

        // then
        assertThat(result.getSchdulId()).isEqualTo(id);
    }

    @Test
    @DisplayName("일정 생성")
    void createSchedule() {
        // given
        String userId = "user1";
        ScheduleDto dto = ScheduleDto.builder()
                .schdulNm("New Schedule")
                .build();

        // when
        String id = scheduleService.createSchedule(userId, dto);

        // then
        assertThat(id).startsWith("SCHDUL_");
        verify(scheduleRepository, times(1)).save(any(Schedule.class));
    }

    @Test
    @DisplayName("일정 수정")
    void updateSchedule() {
        // given
        String id = "SCH_1";
        ScheduleDto dto = ScheduleDto.builder()
                .schdulNm("Updated")
                .build();
        Schedule schedule = Schedule.builder().schdulId(id).schdulNm("Old").build();

        given(scheduleRepository.findById(id)).willReturn(Optional.of(schedule));

        // when
        scheduleService.updateSchedule(id, "user1", dto);

        // then
        assertThat(schedule.getSchdulNm()).isEqualTo("Updated");
    }

    @Test
    @DisplayName("일정 삭제")
    void deleteSchedule() {
        // given
        String id = "SCH_1";
        Schedule schedule = Schedule.builder().schdulId(id).build();

        given(scheduleRepository.findById(id)).willReturn(Optional.of(schedule));

        // when
        scheduleService.deleteSchedule(id, "user1");

        // then
        verify(scheduleRepository, times(1)).delete(schedule);
    }

    @Test
    @DisplayName("사용자 ID 없이 전체 일정 목록 조회")
    void getScheduleList_All() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        given(scheduleRepository.findAll(any(Pageable.class))).willReturn(Page.empty());

        // when
        scheduleService.getScheduleList(null, pageable);

        // then
        verify(scheduleRepository).findAll(pageable);
    }

    @Test
    @DisplayName("구분 및 소유자 기반 일정 목록 조회")
    void getScheduleList_BySeAndOwner() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        given(scheduleRepository.findSchedules(anyString(), anyString(), any())).willReturn(Page.empty());

        // when
        scheduleService.getScheduleList("1", "user1", pageable);

        // then
        verify(scheduleRepository).findSchedules(eq("1"), eq("user1"), any());
    }

    @Test
    @DisplayName("날짜 범위 및 소유자 기반 일정 목록 조회")
    void getScheduleListByDateRange() {
        // given
        given(scheduleRepository.findOverlappingSchedules(anyString(), anyString())).willReturn(Collections.emptyList());
        given(scheduleRepository.findSchedulesByRange(any(), any(), any(), any())).willReturn(Collections.emptyList());

        // when
        scheduleService.getScheduleListByDateRange("user1", "20240101", "20240131");
        scheduleService.getScheduleListByDateRange("1", "user1", "20240101", "20240131");

        // then
        verify(scheduleRepository).findOverlappingSchedules("20240101", "20240131");
        verify(scheduleRepository).findSchedulesByRange("1", "user1", "20240101", "20240131");
    }

    @Test
    @DisplayName("존재하지 않는 일정 수정 시 예외 발생")
    void updateSchedule_NotFound() {
        // given
        given(scheduleRepository.findById(anyString())).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> scheduleService.updateSchedule("invalid", "user1", ScheduleDto.builder().build()))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("존재하지 않는 일정 삭제 시 예외 발생")
    void deleteSchedule_NotFound() {
        // given
        given(scheduleRepository.findById(anyString())).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> scheduleService.deleteSchedule("invalid", "user1"))
                .isInstanceOf(BusinessException.class);
    }
}
