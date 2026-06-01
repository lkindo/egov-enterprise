package nuri.api.controller.business.image;

import nuri.business.service.image.EgovMainImageService;
import nuri.business.service.image.dto.MainImageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(MainImageApiController.class)
@DisplayName("MainImageApiController 단위 테스트")
class MainImageApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private EgovMainImageService mainImageService;

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("메인 이미지 목록 조회 테스트")
    void getMainImageListTest() throws Exception {
        MainImageDto dto = MainImageDto.builder()
                .imgId("IMG1")
                .imgNm("메인이미지1")
                .build();
        Page<MainImageDto> page = new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1);

        given(mainImageService.getMainImageList(any(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/main-images")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].imgId").value("IMG1"));
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("메인 이미지 상세 조회 테스트")
    void getMainImageTest() throws Exception {
        MainImageDto dto = MainImageDto.builder()
                .imgId("IMG1")
                .imgNm("메인이미지1")
                .build();

        given(mainImageService.getMainImage("IMG1")).willReturn(dto);

        mockMvc.perform(get("/api/v1/main-images/IMG1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imgId").value("IMG1"));
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("메인 이미지 등록 테스트")
    void insertMainImageTest() throws Exception {
        MainImageDto dto = MainImageDto.builder()
                .imgNm("신규이미지")
                .build();

        mockMvc.perform(post("/api/v1/main-images")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("메인 이미지 수정 테스트")
    void updateMainImageTest() throws Exception {
        MainImageDto dto = MainImageDto.builder()
                .imgNm("수정이미지")
                .build();

        mockMvc.perform(put("/api/v1/main-images/IMG1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("메인 이미지 삭제 테스트")
    void deleteMainImageTest() throws Exception {
        mockMvc.perform(delete("/api/v1/main-images/IMG1")
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("반영된 메인 이미지 목록 조회 테스트")
    void getReflectedMainImagesTest() throws Exception {
        MainImageDto dto = MainImageDto.builder()
                .imgId("IMG1")
                .rfltYn("Y")
                .build();

        given(mainImageService.getReflectedMainImages()).willReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/main-images/reflected"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].imgId").value("IMG1"));
    }
}
