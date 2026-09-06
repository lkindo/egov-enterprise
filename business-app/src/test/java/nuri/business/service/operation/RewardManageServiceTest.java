package nuri.business.service.operation;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import nuri.foundation.core.exception.BusinessException;
import java.util.Optional;

import nuri.business.domain.operation.RewardManage;
import nuri.business.domain.operation.RewardManageRepository;
import nuri.business.service.operation.dto.RewardManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("RewardManageService (포상 관리) 테스트")
class RewardManageServiceTest {

    @Mock
    private RewardManageRepository rewardManageRepository;

    @InjectMocks
    private RewardManageService rewardManageService;

    private static final Pageable PAGEABLE = PageRequest.of(0, 10);

    @Test
    @DisplayName("포상 전체 조회 - 페이징")
    void getRewardList_Success() {
        // Given
        RewardManage entity = RewardManage.builder().rwrdSn(1L).rwrdNm("Excellence").build();
        given(rewardManageRepository.findAll(PAGEABLE)).willReturn(new PageImpl<>(List.of(entity), PAGEABLE, 1));

        // When
        var result = rewardManageService.getRewardList(null, PAGEABLE);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getRwardNm()).isEqualTo("Excellence");
    }

    @Test
    @DisplayName("이름으로 포상 검색 - 페이징")
    void getRewardList_SearchByName() {
        // Given
        RewardManage entity = RewardManage.builder().rwrdSn(1L).rwrdNm("Gold Prize").build();
        given(rewardManageRepository.findByRwrdNmContaining("Gold", PAGEABLE))
                .willReturn(new PageImpl<>(List.of(entity), PAGEABLE, 1));

        // When
        var result = rewardManageService.getRewardList("Gold", PAGEABLE);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("포상 등록")
    void createReward_Success() {
        // Given
        RewardManageDto dto = RewardManageDto.builder().rwardNm("New Reward").build();
        RewardManage savedEntity = RewardManage.builder().rwrdSn(2L).rwrdNm("New Reward").build();
        given(rewardManageRepository.save(any(RewardManage.class))).willReturn(savedEntity);

        // When
        RewardManageDto result = rewardManageService.createReward(dto);

        // Then
        assertThat(result.getRwrdSn()).isEqualTo(2L);
    }

    // [2026-09-05 DEC-OPS-036] 수정·삭제 경로 — 종전에는 등록만 되고 고칠 수 없었다.
    @Test
    @DisplayName("포상 수정 — 화면이 편집하는 다섯 필드를 갱신하고 식별자는 유지한다")
    void updateReward_Success() {
        RewardManage entity = RewardManage.builder().rwrdSn(7L).rwrdUserId("U1").rwrdCd("R01")
                .rwrdYmd("20260101").rwrdNm("Old").cntrbCn("old").build();
        given(rewardManageRepository.findById(7L)).willReturn(Optional.of(entity));
        RewardManageDto dto = RewardManageDto.builder().rwrdSn(999L).rwardwnrId("U2").rwardCode("R02")
                .rwardDe("20260202").rwardNm("New").pblenCn("new").build();

        RewardManageDto result = rewardManageService.updateReward(7L, dto);

        assertThat(result.getRwrdSn()).isEqualTo(7L);
        assertThat(result.getRwardwnrId()).isEqualTo("U2");
        assertThat(result.getRwardCode()).isEqualTo("R02");
        assertThat(result.getRwardDe()).isEqualTo("20260202");
        assertThat(result.getRwardNm()).isEqualTo("New");
        assertThat(result.getPblenCn()).isEqualTo("new");
    }

    @Test
    @DisplayName("포상 삭제")
    void deleteReward_Success() {
        RewardManage entity = RewardManage.builder().rwrdSn(7L).rwrdNm("Old").build();
        given(rewardManageRepository.findById(7L)).willReturn(Optional.of(entity));

        rewardManageService.deleteReward(7L);

        verify(rewardManageRepository).delete(entity);
    }

    @Test
    @DisplayName("없는 포상의 수정·삭제는 RESOURCE_NOT_FOUND")
    void updateOrDelete_NotFound() {
        given(rewardManageRepository.findById(9L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> rewardManageService.updateReward(9L, RewardManageDto.builder().build()))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> rewardManageService.deleteReward(9L)).isInstanceOf(BusinessException.class);
        verify(rewardManageRepository, never()).delete(any(RewardManage.class));
    }
}
