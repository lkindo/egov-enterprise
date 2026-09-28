package nuri.api.controller.business.admin.content.banner;

import nuri.business.service.system.content.banner.BannerService;
import nuri.business.service.system.content.banner.dto.BannerDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BannerUserApiControllerTest {
    @Mock private BannerService bannerService;
    @InjectMocks private BannerUserApiController controller;

    @Test
    void publicResponseKeepsDisplayFieldsWithoutAuditIdentity() throws Exception {
        when(bannerService.getReflectedBanners()).thenReturn(List.of(BannerDto.builder()
                .bnrSn(1L).bnrNm("운영 안내").linkUrl("/home").frstRgtrId("private-admin-login").build()));

        MockMvcBuilders.standaloneSetup(controller).build().perform(get("/api/v1/banners/reflected"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].bnrNm").value("운영 안내"))
                .andExpect(jsonPath("$.data[0].linkUrl").value("/home"))
                .andExpect(jsonPath("$.data[0].frstRgtrId").doesNotExist());
    }
}
