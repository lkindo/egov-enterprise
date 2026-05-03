package nuri.business.service.schedule;

import nuri.business.domain.schedule.LeaderSchedule;
import nuri.business.domain.schedule.LeaderScheduleRepository;
import nuri.business.service.schedule.dto.LeaderScheduleDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeaderScheduleService 테스트")
class LeaderScheduleServiceTest {

    @Mock
    private LeaderScheduleRepository leaderScheduleRepository;

    @InjectMocks
    private LeaderScheduleService leaderScheduleService;

    @Test
    @DisplayName("간부 일정 목록 조회 성공")
    void getLeaderScheduleList_Success() {
        // Given
        Page<LeaderSchedule> page = new PageImpl<>(List.of(LeaderSchedule.builder().scheduleId("LSCH_1").scheduleNm("Title").build()));
        given(leaderScheduleRepository.findByScheduleNmContaining(anyString(), any(Pageable.class))).willReturn(page);

        // When
        Page<LeaderScheduleDto> result = leaderScheduleService.getLeaderScheduleList("test", Pageable.unpaged());

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("키워드가 null인 경우 전체 간부 일정 목록 조회")
    void getLeaderScheduleList_NullKeyword() {
        // Given
        Page<LeaderSchedule> page = new PageImpl<>(List.of(LeaderSchedule.builder().build()));
        given(leaderScheduleRepository.findByScheduleNmContaining(eq(""), any(Pageable.class))).willReturn(page);

        // When
        leaderScheduleService.getLeaderScheduleList(null, Pageable.unpaged());

        // Then
        verify(leaderScheduleRepository).findByScheduleNmContaining(eq(""), any());
    }

    @Test
    @DisplayName("간부 일정 상세 조회 성공")
    void getLeaderSchedule_Success() {
        // Given
        LeaderSchedule entity = LeaderSchedule.builder().scheduleId("LSCH_1").scheduleNm("Title").build();
        given(leaderScheduleRepository.findById("LSCH_1")).willReturn(Optional.of(entity));

        // When
        LeaderScheduleDto result = leaderScheduleService.getLeaderSchedule("LSCH_1");

        // Then
        assertThat(result.getScheduleNm()).isEqualTo("Title");
    }

    @Test
    @DisplayName("존재하지 않는 간부 일정 조회 시 예외 발생")
    void getLeaderSchedule_NotFound() {
        given(leaderScheduleRepository.findById(anyString())).willReturn(Optional.empty());
        
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> leaderScheduleService.getLeaderSchedule("invalid"))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }

    @Test
    @DisplayName("간부 일정 등록 성공")
    void createLeaderSchedule_Success() {
        // Given
        LeaderScheduleDto dto = LeaderScheduleDto.builder().scheduleNm("New").build();

        // When
        String id = leaderScheduleService.createLeaderSchedule("user", dto);

        // Then
        assertThat(id).startsWith("LSCH_");
        verify(leaderScheduleRepository).save(any(LeaderSchedule.class));
    }

    @Test
    @DisplayName("간부 일정 수정 성공")
    void updateLeaderSchedule_Success() {
        // Given
        LeaderSchedule entity = LeaderSchedule.builder().scheduleId("LSCH_1").build();
        given(leaderScheduleRepository.findById("LSCH_1")).willReturn(Optional.of(entity));
        LeaderScheduleDto dto = LeaderScheduleDto.builder().scheduleNm("Updated").build();

        // When
        leaderScheduleService.updateLeaderSchedule("LSCH_1", "user", dto);

        // Then
        assertThat(entity.getScheduleNm()).isEqualTo("Updated");
    }

    @Test
    @DisplayName("존재하지 않는 간부 일정 수정 시 예외 발생")
    void updateLeaderSchedule_NotFound() {
        given(leaderScheduleRepository.findById(anyString())).willReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> 
            leaderScheduleService.updateLeaderSchedule("invalid", "user", LeaderScheduleDto.builder().build())
        ).isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
    }

    @Test
    @DisplayName("간부 일정 삭제 성공")
    void deleteLeaderSchedule_Success() {
        // When
        leaderScheduleService.deleteLeaderSchedule("LSCH_1");

        // Then
        verify(leaderScheduleRepository).deleteById("LSCH_1");
    }

    @Test
    @DisplayName("간부 현황 목록 조회 (Mock)")
    void getLeaderStatusList() {
        assertThat(leaderScheduleService.getLeaderStatusList(null, Pageable.unpaged())).isEmpty();
    }

    @Test
    @DisplayName("간부 현황 조회 (Mock)")
    void getLeaderStatus() {
        assertThat(leaderScheduleService.getLeaderStatus("leader1")).isNull();
    }

    @Test
    @DisplayName("간부 현황 수정 (Mock)")
    void updateLeaderStatus() {
        // Should not throw any exception
        leaderScheduleService.updateLeaderStatus(null);
    }
}
