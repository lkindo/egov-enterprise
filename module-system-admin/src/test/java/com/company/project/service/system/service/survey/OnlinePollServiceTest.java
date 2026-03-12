package com.company.project.service.system.service.survey;

import com.company.project.domain.system.service.survey.*;
import com.company.project.service.system.service.survey.dto.OnlinePollManageDto;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("OnlinePollService 테스트")
class OnlinePollServiceTest {

    @Mock
    private OnlinePollManageRepository pollManageRepository;
    @Mock
    private OnlinePollItemRepository pollItemRepository;
    @Mock
    private OnlinePollResultRepository pollResultRepository;

    @InjectMocks
    private OnlinePollService onlinePollService;

    @Test
    @DisplayName("설문조사 목록 조회")
    void getPollListTest() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        OnlinePollManage poll = OnlinePollManage.builder().pollId("P1").pollNm("Test").build();
        given(pollManageRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(poll)));

        // When
        Page<OnlinePollManageDto> result = onlinePollService.getPollList(null, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getPollNm()).isEqualTo("Test");
    }

    @Test
    @DisplayName("설문조사 상세 조회")
    void getPollTest() {
        // Given
        OnlinePollManage poll = OnlinePollManage.builder().pollId("P1").pollNm("Test").build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(poll));
        given(pollItemRepository.findByPollId("P1")).willReturn(List.of());

        // When
        OnlinePollManageDto result = onlinePollService.getPoll("P1");

        // Then
        assertThat(result.getPollNm()).isEqualTo("Test");
    }

    @Test
    @DisplayName("설문조사 등록")
    void insertPollTest() {
        // Given
        OnlinePollManageDto dto = OnlinePollManageDto.builder().pollNm("New").build();

        // When
        onlinePollService.insertPoll(dto);

        // Then
        verify(pollManageRepository).save(any(OnlinePollManage.class));
    }

    @Test
    @DisplayName("설문조사 수정")
    void updatePollTest() {
        // Given
        OnlinePollManage poll = OnlinePollManage.builder().pollId("P1").pollNm("Old").build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(poll));
        OnlinePollManageDto dto = OnlinePollManageDto.builder().pollId("P1").pollNm("New").build();

        // When
        onlinePollService.updatePoll(dto);

        // Then
        assertThat(poll.getPollNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("설문조사 삭제")
    void deletePollTest() {
        // When
        onlinePollService.deletePoll("P1");

        // Then
        verify(pollManageRepository).deleteById("P1");
    }

    @Test
    @DisplayName("투표")
    void voteTest() {
        // When
        onlinePollService.vote("P1", "I1", "U1");

        // Then
        verify(pollResultRepository).save(any(OnlinePollResult.class));
    }
}
