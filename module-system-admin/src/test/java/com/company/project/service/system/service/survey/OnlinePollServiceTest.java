package com.company.project.service.system.service.survey;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.system.service.survey.*;
import com.company.project.service.system.service.survey.dto.OnlinePollItemDto;
import com.company.project.service.system.service.survey.dto.OnlinePollManageDto;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
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

    // --- Poll Manage Tests ---

    @Test
    @DisplayName("폴 목록 조회 성공 - 모든 목록")
    void getPollList_All_Success() {
        OnlinePollManage poll = OnlinePollManage.builder().pollId("P1").pollNm("Poll 1").build();
        Page<OnlinePollManage> page = new PageImpl<>(List.of(poll));
        given(pollManageRepository.findAll(any(Pageable.class))).willReturn(page);

        Page<OnlinePollManageDto> result = onlinePollService.getPollList(null, Pageable.unpaged());
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("폴 목록 조회 성공 - 검색어 포함")
    void getPollList_Keyword_Success() {
        OnlinePollManage poll = OnlinePollManage.builder().pollId("P1").pollNm("Keyword Poll").build();
        Page<OnlinePollManage> page = new PageImpl<>(List.of(poll));
        given(pollManageRepository.findByPollNmContaining(eq("Keyword"), any(Pageable.class))).willReturn(page);

        Page<OnlinePollManageDto> result = onlinePollService.getPollList("Keyword", Pageable.unpaged());
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getPollNm()).contains("Keyword");
    }

    @Test
    @DisplayName("폴 상세 조회 성공")
    void getPoll_Success() {
        OnlinePollManage poll = OnlinePollManage.builder().pollId("P1").build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(poll));
        
        OnlinePollItem item = OnlinePollItem.builder().pollIemId("I1").pollId("P1").build();
        given(pollItemRepository.findByPollId("P1")).willReturn(List.of(item));
        given(pollResultRepository.countByPollIemId("I1")).willReturn(5L);

        OnlinePollManageDto result = onlinePollService.getPoll("P1");
        
        assertThat(result.getPollId()).isEqualTo("P1");
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getVoteCount()).isEqualTo(5L);
    }

    @Test
    @DisplayName("폴 상세 조회 실패 - 존재하지 않음")
    void getPoll_NotFound() {
        given(pollManageRepository.findById("P1")).willReturn(Optional.empty());
        assertThatThrownBy(() -> onlinePollService.getPoll("P1"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("폴 등록 성공")
    void insertPoll_Success() {
        OnlinePollManageDto dto = OnlinePollManageDto.builder()
                .pollNm("New Poll")
                .pollBeginDe("2024-01-01")
                .pollEndDe("2024-12-31")
                .build();

        onlinePollService.insertPoll(dto);
        verify(pollManageRepository).save(any(OnlinePollManage.class));
    }

    @Test
    @DisplayName("폴 수정 성공")
    void updatePoll_Success() {
        OnlinePollManage poll = OnlinePollManage.builder().pollId("P1").pollNm("Old").build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(poll));

        OnlinePollManageDto dto = OnlinePollManageDto.builder().pollId("P1").pollNm("New").build();
        onlinePollService.updatePoll(dto);
        assertThat(poll.getPollNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("폴 삭제 성공")
    void deletePoll_Success() {
        onlinePollService.deletePoll("P1");
        verify(pollManageRepository).deleteById("P1");
    }

    // --- Poll Item Tests ---

    @Test
    @DisplayName("폴 항목 목록 조회")
    void getPollItemList_Success() {
        OnlinePollItem item = OnlinePollItem.builder().pollIemId("I1").pollId("P1").build();
        given(pollItemRepository.findByPollId("P1")).willReturn(List.of(item));
        given(pollResultRepository.countByPollIemId("I1")).willReturn(10L);

        List<OnlinePollItemDto> result = onlinePollService.getPollItemList("P1");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getVoteCount()).isEqualTo(10L);
    }

    @Test
    @DisplayName("폴 항목 등록 성공")
    void insertPollItem_Success() {
        OnlinePollItemDto dto = OnlinePollItemDto.builder().pollId("P1").pollIemNm("Item 1").build();
        onlinePollService.insertPollItem(dto);
        verify(pollItemRepository).save(any(OnlinePollItem.class));
    }

    @Test
    @DisplayName("폴 항목 수정 성공")
    void updatePollItem_Success() {
        OnlinePollItem item = OnlinePollItem.builder().pollIemId("I1").pollIemNm("Old").build();
        given(pollItemRepository.findById("I1")).willReturn(Optional.of(item));

        OnlinePollItemDto dto = OnlinePollItemDto.builder().pollIemId("I1").pollIemNm("New").build();
        onlinePollService.updatePollItem(dto);
        assertThat(item.getPollIemNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("폴 항목 삭제 성공")
    void deletePollItem_Success() {
        onlinePollService.deletePollItem("I1");
        verify(pollItemRepository).deleteById("I1");
    }

    @Test
    @DisplayName("투표 실시")
    void vote_Success() {
        onlinePollService.vote("P1", "I1", "U1");
        verify(pollResultRepository).save(any(OnlinePollResult.class));
    }
}
