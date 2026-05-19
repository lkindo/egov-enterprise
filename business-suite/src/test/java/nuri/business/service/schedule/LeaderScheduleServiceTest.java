package nuri.business.service.schedule;

import nuri.business.domain.schedule.LeaderSchedule;
import nuri.business.domain.schedule.LeaderScheduleRepository;
import nuri.business.domain.schedule.LeaderStatusRepository;
import nuri.business.service.schedule.dto.LeaderScheduleDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
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

@DisplayName("LeaderScheduleService 단위 테스트")
class LeaderScheduleServiceTest {

    @Mock
    private LeaderScheduleRepository leaderScheduleRepository;

    @Mock
    private LeaderStatusRepository leaderStatusRepository;

    @Mock
    private EgovIdGnrService egovLeaderSchdlIdGnrService;

    @InjectMocks
    private LeaderScheduleService leaderScheduleService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("간부 일정 목록 조회")
    void getLeaderScheduleList() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        LeaderSchedule entity = LeaderSchedule.builder().schdlId("LS1").schdlTtl("Test LS").build();
        given(leaderScheduleRepository.searchLeaderSchedules(any(), any(), any())).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<LeaderScheduleDto> result = leaderScheduleService.getLeaderScheduleList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("간부 일정 상세 조회")
    void getLeaderSchedule() {
        // given
        String schdlId = "LS1";
        LeaderSchedule entity = LeaderSchedule.builder().schdlId(schdlId).schdlTtl("Test LS").build();
        given(leaderScheduleRepository.findById(schdlId)).willReturn(Optional.of(entity));

        // when
        LeaderScheduleDto result = leaderScheduleService.getLeaderSchedule(schdlId);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getSchdlId()).isEqualTo(schdlId);
    }

    @Test
    @DisplayName("간부 일정 생성")
    void createLeaderSchedule() throws Exception {
        // given
        String userId = "user1";
        LeaderScheduleDto dto = LeaderScheduleDto.builder()
                .schdlTtl("New LS")
                .leaderId("leader1")
                .build();
        given(egovLeaderSchdlIdGnrService.getNextStringId()).willReturn("LS1");

        // when
        leaderScheduleService.createLeaderSchedule(userId, dto);

        // then
        verify(leaderScheduleRepository).save(any(LeaderSchedule.class));
    }

    @Test
    @DisplayName("간부 일정 수정")
    void updateLeaderSchedule() {
        // given
        String schdlId = "LS1";
        String userId = "user1";
        LeaderSchedule existingEntity = LeaderSchedule.builder().schdlId(schdlId).schdlTtl("Old Title").build();
        LeaderScheduleDto updateDto = LeaderScheduleDto.builder()
                .schdlId(schdlId)
                .schdlTtl("New Title")
                .build();

        given(leaderScheduleRepository.findById(schdlId)).willReturn(Optional.of(existingEntity));

        // when
        leaderScheduleService.updateLeaderSchedule(schdlId, userId, updateDto);

        // then
        assertThat(existingEntity.getSchdlTtl()).isEqualTo("New Title");
    }

    @Test
    @DisplayName("간부 일정 삭제")
    void deleteLeaderSchedule() {
        // given
        String schdlId = "LS1";

        // when
        leaderScheduleService.deleteLeaderSchedule(schdlId);

        // then
        verify(leaderScheduleRepository).deleteById(schdlId);
    }

    @Test
    @DisplayName("간부 상태 목록 조회 - 키워드 없음")
    void getLeaderStatusList_noKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        nuri.business.domain.schedule.LeaderStatus entity = nuri.business.domain.schedule.LeaderStatus.builder()
                .leaderId("leader1")
                .leaderSttus("1")
                .build();
        given(leaderStatusRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<nuri.business.service.schedule.dto.LeaderStatusDto> result = leaderScheduleService.getLeaderStatusList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getLeaderId()).isEqualTo("leader1");
        verify(leaderStatusRepository).findAll(pageable);
    }

    @Test
    @DisplayName("간부 상태 목록 조회 - 키워드 매칭")
    void getLeaderStatusList_withKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        nuri.business.domain.schedule.LeaderStatus entity = nuri.business.domain.schedule.LeaderStatus.builder()
                .leaderId("leader1")
                .leaderSttus("1")
                .build();
        given(leaderStatusRepository.findByLeaderIdContaining("leader", pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<nuri.business.service.schedule.dto.LeaderStatusDto> result = leaderScheduleService.getLeaderStatusList("leader", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getLeaderId()).isEqualTo("leader1");
        verify(leaderStatusRepository).findByLeaderIdContaining("leader", pageable);
    }
}
