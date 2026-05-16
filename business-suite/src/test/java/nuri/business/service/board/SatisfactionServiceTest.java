package nuri.business.service.board;

import nuri.business.domain.board.Satisfaction;
import nuri.business.domain.board.SatisfactionRepository;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@DisplayName("SatisfactionService 단위 테스트")
class SatisfactionServiceTest {

    @Mock
    private SatisfactionRepository satisfactionRepository;

    @InjectMocks
    private SatisfactionService satisfactionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("만족도 등록")
    void createSatisfaction() {
        // given
        SatisfactionDto dto = SatisfactionDto.builder()
                .bbsId("BBS_01")
                .pstId(1L)
                .stsfdgLevel(5)
                .stsfdgCn("Good")
                .build();

        // when
        satisfactionService.createSatisfaction("user1", dto);

        // then
        verify(satisfactionRepository).save(any(Satisfaction.class));
    }

    @Test
    @DisplayName("만족도 수정")
    void updateSatisfaction() {
        // given
        Satisfaction existingEntity = Satisfaction.builder().stsfdgId(10L).build();
        SatisfactionDto dto = SatisfactionDto.builder()
                .satisfactionId(10L)
                .stsfdgLevel(4)
                .stsfdgCn("Updated")
                .build();

        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(existingEntity));

        // when
        satisfactionService.updateSatisfaction("user1", dto);

        // then
        assertThat(existingEntity.getStsfdgLevel()).isEqualTo(4);
    }

    @Test
    @DisplayName("만족도 삭제")
    void deleteSatisfaction() {
        // given
        Satisfaction entity = Satisfaction.builder().stsfdgId(10L).build();
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        // when
        satisfactionService.deleteSatisfaction(10L, "user1", "pwd");

        // then
        assertThat(entity.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("만족도 목록 조회")
    void getSatisfactionList() {
        // given
        Satisfaction entity = Satisfaction.builder().stsfdgId(1L).build();
        given(satisfactionRepository.findByPstIdAndBbsIdAndUseYn(anyLong(), anyString(), anyString()))
                .willReturn(List.of(entity));

        // when
        List<SatisfactionDto> result = satisfactionService.getSatisfactionList("BBS_01", 1L);

        // then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("만족도 평균 조회")
    void getAverageSatisfaction() {
        // given
        given(satisfactionRepository.getAverageSatisfaction(anyLong(), anyString())).willReturn(4.5);

        // when
        Double result = satisfactionService.getAverageSatisfaction("BBS_01", 1L);

        // then
        assertThat(result).isEqualTo(4.5);
    }
}
