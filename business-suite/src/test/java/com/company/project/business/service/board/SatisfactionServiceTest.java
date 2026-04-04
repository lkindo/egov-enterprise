package com.company.project.business.service.board;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.business.domain.board.Satisfaction;
import com.company.project.business.domain.board.SatisfactionRepository;
import com.company.project.business.service.board.dto.SatisfactionDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("SatisfactionService 단위 테스트")
class SatisfactionServiceTest {

    @InjectMocks
    private SatisfactionService satisfactionService;

    @Mock
    private SatisfactionRepository satisfactionRepository;

    @Test
    @DisplayName("만족도 등록")
    void registerSatisfaction() {
        SatisfactionDto dto = SatisfactionDto.builder()
                .articleId(1L)
                .boardId("BBS_01")
                .writerId("user1")
                .satisfactionLevel(5)
                .build();

        satisfactionService.registerSatisfaction(dto);
        verify(satisfactionRepository).save(any(Satisfaction.class));
    }

    @Test
    @DisplayName("만족도 수정")
    void updateSatisfaction() {
        Satisfaction satisfaction = Satisfaction.builder().id(10L).satisfactionLevel(3).build();
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(satisfaction));

        SatisfactionDto dto = SatisfactionDto.builder().satisfactionId(10L).satisfactionLevel(5).build();
        satisfactionService.updateSatisfaction(dto);

        assertThat(satisfaction.getSatisfactionLevel()).isEqualTo(5);
    }

    @Test
    @DisplayName("만족도 삭제")
    void deleteSatisfaction() {
        satisfactionService.deleteSatisfaction(10L);
        verify(satisfactionRepository).deleteById(10L);
    }

    @Test
    @DisplayName("만족도 목록 및 평균 조회")
    void getSatisfactionListAndAverage() {
        Satisfaction satisfaction = Satisfaction.builder()
                .id(10L)
                .articleId(1L)
                .boardId("BBS_01")
                .satisfactionLevel(5)
                .build();
        
        given(satisfactionRepository.findByArticleIdAndBoardIdAndUseAt(1L, "BBS_01", "Y"))
                .willReturn(List.of(satisfaction));
        given(satisfactionRepository.getAverageSatisfaction(1L, "BBS_01")).willReturn(4.5);

        List<SatisfactionDto> list = satisfactionService.getSatisfactionList(1L, "BBS_01");
        Double avg = satisfactionService.getAverageSatisfaction(1L, "BBS_01");

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getSatisfactionLevel()).isEqualTo(5);
        assertThat(avg).isEqualTo(4.5);
    }

    @Test
    @DisplayName("만족도 단건 조회 및 비밀번호 확인")
    void getSatisfactionAndCheckPassword() {
        Satisfaction satisfaction = Satisfaction.builder()
                .id(10L)
                .password("pwd123")
                .build();
        
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(satisfaction));
        given(satisfactionRepository.findById(99L)).willReturn(Optional.empty());

        SatisfactionDto dto = satisfactionService.getSatisfaction(10L);
        assertThat(dto.getSatisfactionId()).isEqualTo(10L);
        
        assertThrows(BusinessException.class, () -> satisfactionService.getSatisfaction(99L));

        assertThat(satisfactionService.checkPassword(10L, "pwd123")).isTrue();
        assertThat(satisfactionService.checkPassword(10L, "wrong")).isFalse();
    }
}
