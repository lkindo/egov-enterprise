package nuri.business.service.operation;

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
}
