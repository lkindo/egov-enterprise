package com.company.project.business.service.board;

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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("SatisfactionService 테스트")
class SatisfactionServiceTest {

    @Mock
    private SatisfactionRepository satisfactionRepository;

    @InjectMocks
    private SatisfactionService satisfactionService;

    @Test
    @DisplayName("만족도 등록 성공")
    void registerSatisfaction_Success() {
        // Given
        SatisfactionDto dto = SatisfactionDto.builder()
                .articleId(1L)
                .boardId("BBS1")
                .writerId("user1")
                .satisfactionLevel(5)
                .build();

        // When
        satisfactionService.registerSatisfaction(dto);

        // Then
        verify(satisfactionRepository).save(any(Satisfaction.class));
    }

    @Test
    @DisplayName("만족도 목록 조회 성공")
    void getSatisfactionList_Success() {
        // Given
        Satisfaction entity = Satisfaction.builder().id(1L).articleId(1L).boardId("BBS1").build();
        given(satisfactionRepository.findByArticleIdAndBoardIdAndUseAt(1L, "BBS1", "Y")).willReturn(List.of(entity));

        // When
        List<SatisfactionDto> result = satisfactionService.getSatisfactionList(1L, "BBS1");

        // Then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("평균 만족도 조회 성공")
    void getAverageSatisfaction_Success() {
        // Given
        given(satisfactionRepository.getAverageSatisfaction(1L, "BBS1")).willReturn(4.5);

        // When
        Double result = satisfactionService.getAverageSatisfaction(1L, "BBS1");

        // Then
        assertThat(result).isEqualTo(4.5);
    }

    @Test
    @DisplayName("만족도 상세 조회 성공")
    void getSatisfaction_Success() {
        // Given
        Satisfaction entity = Satisfaction.builder().id(1L).articleId(1L).build();
        given(satisfactionRepository.findById(1L)).willReturn(Optional.of(entity));

        // When
        SatisfactionDto result = satisfactionService.getSatisfaction(1L);

        // Then
        assertThat(result.getSatisfactionId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("만족도 수정 성공")
    void updateSatisfaction_Success() {
        // Given
        Satisfaction entity = Satisfaction.builder().id(1L).build();
        given(satisfactionRepository.findById(1L)).willReturn(Optional.of(entity));
        SatisfactionDto dto = SatisfactionDto.builder().satisfactionId(1L).satisfactionLevel(3).build();

        // When
        satisfactionService.updateSatisfaction(dto);

        // Then
        verify(satisfactionRepository).findById(1L);
    }

    @Test
    @DisplayName("만족도 삭제 성공")
    void deleteSatisfaction_Success() {
        // When
        satisfactionService.deleteSatisfaction(1L);

        // Then
        verify(satisfactionRepository).deleteById(1L);
    }

    @Test
    @DisplayName("비밀번호 확인 성공")
    void checkPassword_Success() {
        // Given
        Satisfaction entity = Satisfaction.builder().id(1L).password("pass123").build();
        given(satisfactionRepository.findById(1L)).willReturn(Optional.of(entity));

        // When
        boolean result = satisfactionService.checkPassword(1L, "pass123");

        // Then
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("비밀번호 확인 실패 - 암호 틀림")
    void checkPassword_Fail() {
        // Given
        Satisfaction entity = Satisfaction.builder().id(1L).password("correct").build();
        given(satisfactionRepository.findById(1L)).willReturn(Optional.of(entity));

        // When
        boolean result = satisfactionService.checkPassword(1L, "wrong");

        // Then
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("만족도 수정 실패 - 데이터 없음 (ifPresent 분기)")
    void updateSatisfaction_NoEntity() {
        given(satisfactionRepository.findById(999L)).willReturn(Optional.empty());
        SatisfactionDto dto = SatisfactionDto.builder().satisfactionId(999L).build();

        satisfactionService.updateSatisfaction(dto);

        verify(satisfactionRepository).findById(999L);
    }

    @Test
    @DisplayName("상세 조회 및 암호 확인 실패 - ResourceNotFoundException")
    void satisfaction_Exceptions() {
        given(satisfactionRepository.findById(999L)).willReturn(Optional.empty());

        org.junit.jupiter.api.Assertions.assertThrows(com.company.project.foundation.core.exception.BusinessException.class, 
                () -> satisfactionService.getSatisfaction(999L));
        
        org.junit.jupiter.api.Assertions.assertThrows(com.company.project.foundation.core.exception.BusinessException.class, 
                () -> satisfactionService.checkPassword(999L, "any"));
    }

    @Test
    @DisplayName("비밀번호 확인 - 암호가 없는 경우 (null 분기)")
    void checkPassword_NullPasswordInEntity() {
        Satisfaction entity = Satisfaction.builder().id(1L).password(null).build();
        given(satisfactionRepository.findById(1L)).willReturn(Optional.of(entity));

        boolean result = satisfactionService.checkPassword(1L, "any");

        assertThat(result).isFalse();
    }
}
