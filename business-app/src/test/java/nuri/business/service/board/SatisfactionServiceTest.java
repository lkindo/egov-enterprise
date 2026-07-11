package nuri.business.service.board;

import nuri.business.domain.board.Satisfaction;
import nuri.business.domain.board.SatisfactionRepository;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.business.service.board.dto.SatisfactionMapper;
import nuri.business.service.board.dto.SatisfactionMapperImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@DisplayName("SatisfactionService 단위 테스트")
class SatisfactionServiceTest {

    @Mock
    private SatisfactionRepository satisfactionRepository;

    // 실제 MapStruct 생성 구현을 @InjectMocks 생성자에 주입 (매핑 동작 실검증)
    @Spy
    private SatisfactionMapper satisfactionMapper = new SatisfactionMapperImpl();

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
                .pstId("1")
                .dgstfnScr(5)
                .dgstfnCn("Good")
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
        Satisfaction existingEntity = Satisfaction.builder().dgstfnSn(10L).build();
        SatisfactionDto dto = SatisfactionDto.builder()
                .dgstfnSn(10L)
                .dgstfnScr(4)
                .dgstfnCn("Updated")
                .build();

        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(existingEntity));

        // when
        satisfactionService.updateSatisfaction("user1", dto);

        // then
        assertThat(existingEntity.getDgstfnScr()).isEqualTo(4);
    }

    @Test
    @DisplayName("만족도 삭제")
    void deleteSatisfaction() {
        // given
        Satisfaction entity = Satisfaction.builder().dgstfnSn(10L).build();
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
        Satisfaction entity = Satisfaction.builder().dgstfnSn(1L).build();
        given(satisfactionRepository.findByPstIdAndBbsIdAndUseYn(anyString(), anyString(), anyString()))
                .willReturn(List.of(entity));

        // when
        List<SatisfactionDto> result = satisfactionService.getSatisfactionList("BBS_01", "1");

        // then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("만족도 평균 조회")
    void getAverageSatisfaction() {
        // given
        given(satisfactionRepository.getAverageSatisfaction(anyString(), anyString())).willReturn(4.5);

        // when
        Double result = satisfactionService.getAverageSatisfaction("BBS_01", "1");

        // then
        assertThat(result).isEqualTo(4.5);
    }

    @Test
    @DisplayName("만족도 등록 - 레거시")
    void registerSatisfaction() {
        // given
        SatisfactionDto dto = SatisfactionDto.builder()
                .bbsId("BBS_01")
                .pstId("1")
                .dgstfnScr(5)
                .dgstfnCn("Legacy Good")
                .build();

        // when
        satisfactionService.registerSatisfaction(dto);

        // then
        verify(satisfactionRepository).save(any(Satisfaction.class));
    }

    @Test
    @DisplayName("만족도 수정 - 레거시")
    void updateSatisfaction_Legacy() {
        // given
        Satisfaction existingEntity = Satisfaction.builder().dgstfnSn(10L).build();
        SatisfactionDto dto = SatisfactionDto.builder()
                .dgstfnSn(10L)
                .dgstfnScr(3)
                .dgstfnCn("Updated Legacy")
                .build();

        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(existingEntity));

        // when
        satisfactionService.updateSatisfaction(dto);

        // then
        assertThat(existingEntity.getDgstfnScr()).isEqualTo(3);
        assertThat(existingEntity.getLastMdfrId()).isEqualTo("SYSTEM");
    }

    @Test
    @DisplayName("만족도 삭제 - 레거시")
    void deleteSatisfaction_Legacy() {
        // given
        Satisfaction entity = Satisfaction.builder().dgstfnSn(10L).build();
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        // when
        satisfactionService.deleteSatisfaction(10L);

        // then
        assertThat(entity.getUseYn()).isEqualTo("N");
        assertThat(entity.getLastMdfrId()).isEqualTo("SYSTEM");
    }

    @Test
    @DisplayName("만족도 상세 조회 성공")
    void getSatisfaction_Success() {
        // given
        Satisfaction entity = Satisfaction.builder().dgstfnSn(10L).build();
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        // when
        SatisfactionDto result = satisfactionService.getSatisfaction(10L);

        // then
        assertThat(result.getDgstfnSn()).isEqualTo(10L);
    }

    @Test
    @DisplayName("만족도 상세 조회 실패 - 리소스 없음")
    void getSatisfaction_NotFound() {
        // given
        given(satisfactionRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        org.junit.jupiter.api.Assertions.assertThrows(
                nuri.foundation.core.exception.BusinessException.class,
                () -> satisfactionService.getSatisfaction(10L)
        );
    }

    @Test
    @DisplayName("만족도 수정 실패 - 리소스 없음")
    void updateSatisfaction_NotFound() {
        // given
        SatisfactionDto dto = SatisfactionDto.builder().dgstfnSn(10L).build();
        given(satisfactionRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        org.junit.jupiter.api.Assertions.assertThrows(
                nuri.foundation.core.exception.BusinessException.class,
                () -> satisfactionService.updateSatisfaction("user1", dto)
        );
    }

    @Test
    @DisplayName("만족도 삭제 실패 - 리소스 없음")
    void deleteSatisfaction_NotFound() {
        // given
        given(satisfactionRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        org.junit.jupiter.api.Assertions.assertThrows(
                nuri.foundation.core.exception.BusinessException.class,
                () -> satisfactionService.deleteSatisfaction(10L, "user1", "pwd")
        );
    }

    @Test
    @DisplayName("비밀번호 확인 - 일치, 불일치, 없음")
    void checkPassword() {
        // given
        Satisfaction entity = Satisfaction.builder().dgstfnSn(10L).pswd("secret").build();
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));
        given(satisfactionRepository.findById(11L)).willReturn(Optional.empty());

        // when & then
        assertThat(satisfactionService.checkPassword(10L, "secret")).isTrue();
        assertThat(satisfactionService.checkPassword(10L, "wrong")).isFalse();
        assertThat(satisfactionService.checkPassword(11L, "any")).isFalse();
    }
}
