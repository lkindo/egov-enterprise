package com.company.project.foundation.service.operation;

import com.company.project.foundation.domain.operation.RewardManage;
import com.company.project.foundation.repository.operation.RewardManageRepository;
import com.company.project.foundation.service.operation.dto.RewardManageDto;
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
@DisplayName("RewardManageService ?åÏä§??)
class RewardManageServiceTest {

    @Mock
    private RewardManageRepository rewardManageRepository;

    @InjectMocks
    private RewardManageService rewardManageService;

    @Test
    @DisplayName("?¨ÏÉÅ ?ÑÏ≤¥ Ï°∞Ìöå")
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
    @DisplayName("?¥Î¶Ñ?ºÎ°ú ?¨ÏÉÅ Í≤Ä??)
    void searchByName_Success() {
        // Given
        RewardManage entity = RewardManage.builder().rwardId("R1").rwardNm("Gold Prize").build();
        given(rewardManageRepository.findByRwardNmContaining("Gold")).willReturn(List.of(entity));

        // When
        List<RewardManageDto> result = rewardManageService.searchByName("Gold");

        // Then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("?¨ÏÉÅ ?±Î°ù")
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
