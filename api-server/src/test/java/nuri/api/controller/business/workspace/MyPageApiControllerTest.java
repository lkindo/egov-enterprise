package nuri.api.controller.business.workspace;

import nuri.business.service.workspace.MyPageService;
import nuri.business.service.workspace.dto.MyPageContentDto;
import nuri.business.security.jwt.JwtTokenProvider;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MyPageApiController.class)
class MyPageApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private MyPageService myPageService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @WithMockCustomUser
    @DisplayName("마이페이지 활성 콘텐츠 목록 조회 API 테스트")
    void getContents_Success() throws Exception {
        // given
        MyPageContentDto dto = MyPageContentDto.builder()
                .cntntsId("MYP001")
                .cntntsNm("테스트 콘텐츠")
                .build();
        given(myPageService.getActiveMyPageContents()).willReturn(Collections.singletonList(dto));

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/workspace/mypage/contents")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].cntntsNm").value("테스트 콘텐츠"));
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("마이페이지 콘텐츠 등록 API 테스트")
    void createContent_Success() throws Exception {
        // given
        MyPageContentDto dto = MyPageContentDto.builder()
                .cntntsNm("신규 콘텐츠")
                .build();
        given(myPageService.createContent(any())).willReturn("MYP002");

        // when & then
        mockMvc.perform(post("/api/v1/admin/system/workspace/mypage/contents")
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("MYP002"));
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("마이페이지 콘텐츠 삭제 API 테스트")
    void deleteContent_Success() throws Exception {
        // when & then
        mockMvc.perform(delete("/api/v1/admin/system/workspace/mypage/contents/MYP001")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
