package nuri.api.controller.business.admin.content.banner;

import nuri.business.test.BaseControllerTest;

import nuri.business.service.system.content.banner.BannerService;
import nuri.business.service.system.content.banner.dto.BannerDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import java.util.Collections;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("BannerApiController 테스트")
class BannerApiControllerTest extends BaseControllerTest {

    private BannerService bannerService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        bannerService = mock(BannerService.class);
        return new BannerApiController(bannerService);
    }

    @Override
    protected HandlerMethodArgumentResolver[] getCustomArgumentResolvers() {
        return new HandlerMethodArgumentResolver[] { new PageableHandlerMethodArgumentResolver() };
    }

    @Test
    @DisplayName("배너 목록 조회 - 성공")
    void getBanners_success() throws Exception {
        when(bannerService.getBannerList(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvc.perform(get("/api/v1/admin/system/banners").param("keyword", "test")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("배너 상세 조회 - 성공")
    void getBanner_success() throws Exception {
        when(bannerService.getBanner(1L)).thenReturn(BannerDto.builder().build());
        mockMvc.perform(get("/api/v1/admin/system/banners/1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("배너 등록/수정/삭제 - 성공")
    void banner_crud_success() throws Exception {
        BannerDto dto = BannerDto.builder().bnrNm("Test Banner").build();

        mockMvc.perform(post("/api/v1/admin/system/banners")
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/admin/system/banners/1")
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/admin/system/banners/1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("메인화면용 배너 목록 조회 - 성공")
    void getReflectedBanners_success() throws Exception {
        when(bannerService.getReflectedBanners()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/admin/system/banners/reflected")).andExpect(status().isOk());
    }
}
