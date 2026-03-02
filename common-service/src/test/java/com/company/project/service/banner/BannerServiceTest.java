package com.company.project.service.banner;

import com.company.project.domain.banner.Banner;
import com.company.project.domain.banner.BannerRepository;
import com.company.project.service.banner.dto.BannerDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class BannerServiceTest {

    @Mock
    private BannerRepository bannerRepository;

    @InjectMocks
    private BannerService bannerService;

    @Test
    @DisplayName("게시된 배너 목록 조회 테스트")
    void getReflectedBannersTest() {
        // Given
        Banner banner = Banner.builder()
                .bannerId("BNR_001")
                .bannerNm("Main Banner")
                .reflctAt("Y")
                .sortOrdr(1)
                .build();
        given(bannerRepository.findByReflctAtOrderBySortOrdrAsc("Y")).willReturn(List.of(banner));

        // When
        List<BannerDto> result = bannerService.getReflectedBanners();

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getBannerNm()).isEqualTo("Main Banner");
    }
}
