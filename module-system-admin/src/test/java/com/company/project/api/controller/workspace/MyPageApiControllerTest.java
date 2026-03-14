package com.company.project.api.controller.workspace;

import com.company.project.service.workspace.MyPageService;
import com.company.project.service.workspace.dto.MyPageContentDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MyPageApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("MyPageApiController 테스트")
class MyPageApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MyPageService myPageService;

    @Test
    @DisplayName("마이페이지 콘텐츠 목록 조회 성공")
    void getContents_Success() throws Exception {
        // Given
        MyPageContentDto dto = MyPageContentDto.builder()
                .cntntsId("M1")
                .cntntsNm("My Page Content")
                .cntntsUseAt("Y")
                .build();
        given(myPageService.getActiveMyPageContents()).willReturn(List.of(dto));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/workspace/mypage/contents")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].cntntsId").value("M1"));
    }
}
