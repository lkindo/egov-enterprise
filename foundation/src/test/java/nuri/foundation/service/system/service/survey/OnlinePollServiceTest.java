package nuri.foundation.service.system.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.system.service.survey.*;
import nuri.foundation.service.system.service.survey.dto.OnlinePollItemDto;
import nuri.foundation.service.system.service.survey.dto.OnlinePollManageDto;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("OnlinePollService 단위 테스트")
class OnlinePollServiceTest {

    @InjectMocks
    private OnlinePollService onlinePollService;

    @Mock
    private OnlinePollManageRepository pollManageRepository;
    @Mock
    private OnlinePollItemRepository pollItemRepository;
    @Mock
    private OnlinePollResultRepository pollResultRepository;

    @Test
    @DisplayName("설문 목록 조회 - 키워드 없음")
    void getPollList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        OnlinePollManage entity = OnlinePollManage.builder().pollId("P1").pollNm("Poll 1").build();
        given(pollManageRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        Page<OnlinePollManageDto> result = onlinePollService.getPollList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 목록 조회 - 키워드 있음")
    void getPollList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        OnlinePollManage entity = OnlinePollManage.builder().pollId("P1").pollNm("Poll 1").build();
        given(pollManageRepository.findByPollNmContaining(eq("Keyword"), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        Page<OnlinePollManageDto> result = onlinePollService.getPollList("Keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(pollManageRepository).findByPollNmContaining(eq("Keyword"), eq(pageable));
    }

    @Test
    @DisplayName("설문 목록 조회 - 빈 키워드")
    void getPollList_EmptyKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        OnlinePollManage entity = OnlinePollManage.builder().pollId("P1").build();
        given(pollManageRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        Page<OnlinePollManageDto> result = onlinePollService.getPollList("", pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 상세 조회 - 성공")
    void getPoll_Success() {
        OnlinePollManage entity = OnlinePollManage.builder().pollId("P1").pollNm("Poll 1").build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(entity));
        
        OnlinePollItem item = OnlinePollItem.builder().pollIemId("I1").pollManage(entity).pollIemNm("Item 1").build();
        given(pollItemRepository.findByPollManagePollId("P1")).willReturn(List.of(item));

        OnlinePollManageDto result = onlinePollService.getPoll("P1");

        assertThat(result.getPollId()).isEqualTo("P1");
        assertThat(result.getPollItems()).hasSize(1);
    }

    @Test
    @DisplayName("설문 상세 조회 - 실패")
    void getPoll_Fail() {
        given(pollManageRepository.findById("P99")).willReturn(Optional.empty());
        assertThrows(BusinessException.class, () -> onlinePollService.getPoll("P99"));
    }

    @Test
    @DisplayName("설문 등록 - 성공")
    void insertPoll() {
        try (var mockedSecurity = mockStatic(nuri.foundation.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            OnlinePollItemDto itemDto = OnlinePollItemDto.builder().pollIemNm("Item").build();
            OnlinePollManageDto dto = OnlinePollManageDto.builder()
                    .pollNm("New Poll")
                    .pollItems(List.of(itemDto))
                    .build();

            onlinePollService.insertPoll(dto);

            verify(pollManageRepository, times(1)).save(any(OnlinePollManage.class));
        }
    }

    @Test
    @DisplayName("설문 수정 - 성공")
    void updatePoll_Success() {
        try (var mockedSecurity = mockStatic(nuri.foundation.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            OnlinePollManage entity = OnlinePollManage.builder()
                    .pollId("P1")
                    .pollNm("Old")
                    .pollItems(new ArrayList<>())
                    .build();
            given(pollManageRepository.findById("P1")).willReturn(Optional.of(entity));

            OnlinePollManageDto dto = OnlinePollManageDto.builder()
                    .pollId("P1")
                    .pollNm("New")
                    .pollItems(List.of(OnlinePollItemDto.builder().pollIemNm("New Item").build()))
                    .build();

            onlinePollService.updatePoll(dto);

            assertThat(entity.getPollNm()).isEqualTo("New");
            assertThat(entity.getPollItems()).hasSize(1);
        }
    }

    @Test
    @DisplayName("설문 수정 - 실패 (데이터 없음)")
    void updatePoll_Fail() {
        given(pollManageRepository.findById("P99")).willReturn(Optional.empty());
        OnlinePollManageDto dto = OnlinePollManageDto.builder().pollId("P99").build();
        assertThrows(BusinessException.class, () -> onlinePollService.updatePoll(dto));
    }

    @Test
    @DisplayName("설문 삭제 - 성공")
    void deletePoll() {
        try (var mockedSecurity = mockStatic(nuri.foundation.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            onlinePollService.deletePoll("P1");
            verify(pollManageRepository, times(1)).deleteById("P1");
        }
    }

    @Test
    @DisplayName("설문 투표 - 성공")
    void vote_Success() {
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollId("P1")
                .pollDsuseYn("N")
                .pollBgngYmd(today)
                .pollEndYmd(today)
                .build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(entity));
        given(pollResultRepository.countByPollIdAndFrstRegisterId("P1", "user1")).willReturn(0L);

        onlinePollService.vote("P1", "I1", "user1");
        verify(pollResultRepository, times(1)).save(any(OnlinePollResult.class));
    }

    @Test
    @DisplayName("설문 투표 - 실패 (중지됨)")
    void vote_Fail_Disabled() {
        OnlinePollManage entity = OnlinePollManage.builder().pollId("P1").pollDsuseYn("Y").build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(entity));
        assertThrows(BusinessException.class, () -> onlinePollService.vote("P1", "I1", "user1"));
    }

    @Test
    @DisplayName("설문 투표 - 실패 (기간 전)")
    void vote_Fail_BeforeStart() {
        String tomorrow = java.time.LocalDate.now().plusDays(1).format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollId("P1")
                .pollDsuseYn("N")
                .pollBgngYmd(tomorrow)
                .pollEndYmd(tomorrow)
                .build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(entity));
        assertThrows(BusinessException.class, () -> onlinePollService.vote("P1", "I1", "user1"));
    }

    @Test
    @DisplayName("설문 투표 - 실패 (기간 후)")
    void vote_Fail_AfterEnd() {
        String yesterday = java.time.LocalDate.now().minusDays(1).format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollId("P1")
                .pollDsuseYn("N")
                .pollBgngYmd(yesterday)
                .pollEndYmd(yesterday)
                .build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(entity));
        assertThrows(BusinessException.class, () -> onlinePollService.vote("P1", "I1", "user1"));
    }

    @Test
    @DisplayName("설문 투표 - 실패 (중복 투표)")
    void vote_Fail_Duplicate() {
        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        OnlinePollManage entity = OnlinePollManage.builder()
                .pollId("P1")
                .pollDsuseYn("N")
                .pollBgngYmd(today)
                .pollEndYmd(today)
                .build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(entity));
        given(pollResultRepository.countByPollIdAndFrstRegisterId("P1", "user1")).willReturn(1L);

        assertThrows(BusinessException.class, () -> onlinePollService.vote("P1", "I1", "user1"));
    }

    @Test
    @DisplayName("설문 항목 등록")
    void insertPollItem() {
        OnlinePollManage poll = OnlinePollManage.builder().pollId("P1").build();
        given(pollManageRepository.findById("P1")).willReturn(Optional.of(poll));
        
        OnlinePollItemDto dto = OnlinePollItemDto.builder().pollId("P1").pollIemNm("Item").build();
        onlinePollService.insertPollItem(dto);
        verify(pollItemRepository, times(1)).save(any(OnlinePollItem.class));
    }

    @Test
    @DisplayName("설문 항목 수정 - 성공")
    void updatePollItem_Success() {
        OnlinePollItem entity = OnlinePollItem.builder().pollIemId("I1").pollIemNm("Old").build();
        given(pollItemRepository.findById("I1")).willReturn(Optional.of(entity));

        OnlinePollItemDto dto = OnlinePollItemDto.builder().pollIemId("I1").pollIemNm("New").build();
        onlinePollService.updatePollItem(dto);

        assertThat(entity.getPollIemNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("설문 항목 수정 - 실패 (데이터 없음)")
    void updatePollItem_Fail() {
        given(pollItemRepository.findById("I99")).willReturn(Optional.empty());
        OnlinePollItemDto dto = OnlinePollItemDto.builder().pollIemId("I99").build();
        assertThrows(BusinessException.class, () -> onlinePollService.updatePollItem(dto));
    }

    @Test
    @DisplayName("설문 항목 삭제")
    void deletePollItem() {
        onlinePollService.deletePollItem("I1");
        verify(pollItemRepository, times(1)).deleteById("I1");
    }
}
