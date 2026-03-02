package com.company.project.domain.banner;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BannerEntityTest {

    @Test
    @DisplayName("Banner 엔티티 생성 테스트")
    void bannerTest() {
        Banner banner = Banner.builder()
                .bannerId("BNR_01")
                .bannerNm("Main Banner")
                .linkUrl("/home")
                .reflctAt("Y")
                .build();

        assertThat(banner.getBannerId()).isEqualTo("BNR_01");
        assertThat(banner.getBannerNm()).isEqualTo("Main Banner");
        assertThat(banner.getLinkUrl()).isEqualTo("/home");
    }
}
