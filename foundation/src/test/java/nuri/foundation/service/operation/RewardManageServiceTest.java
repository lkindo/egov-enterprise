package nuri.foundation.service.operation;

import nuri.foundation.domain.operation.RewardManage;
import nuri.foundation.repository.operation.RewardManageRepository;
import nuri.foundation.service.operation.dto.RewardManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    @Test
    @DisplayName("포상 전체 조회")
    void getAllRewards_Success() {
        // Given
        RewardManage entity = RewardManage.builder().rwardId("R1").rwardNm("Excellence").build();
        given(rewardManageRepository.findAll()).willReturn(List.of(entity));

        // When
        List<RewardManageDto> result = rewardManageService.getAllRewards();

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRwardNm()).isEqualTo("Excellence");
    }

    @Test
    @DisplayName("이름으로 포상 검색")
    void searchByName_Success() {
        // Given
        RewardManage entity = RewardManage.builder().rwardId("R1").rwardNm("Gold Prize").build();
        given(rewardManageRepository.findByRwrdNmContaining("Gold")).willReturn(List.of(entity));

        // When
        List<RewardManageDto> result = rewardManageService.searchByName("Gold");

        // Then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("포상 등록")
    void createReward_Success() {
        // Given
        RewardManageDto dto = RewardManageDto.builder().rwardNm("New Reward").build();
        RewardManage savedEntity = RewardManage.builder().rwardId("R2").rwardNm("New Reward").build();
        given(rewardManageRepository.save(any(RewardManage.class))).willReturn(savedEntity);

        // When
        RewardManageDto result = rewardManageService.createReward(dto);

        // Then
        assertThat(result.getRwardId()).isEqualTo("R2");
    }
}
