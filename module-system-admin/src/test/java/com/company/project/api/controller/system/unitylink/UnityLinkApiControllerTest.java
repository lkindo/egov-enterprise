package com.company.project.api.controller.system.unitylink;

import com.company.project.service.unitylink.EgovUnityLinkService;
import com.company.project.service.unitylink.dto.UnityLinkDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UnityLinkApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("UnityLinkApiController 테스트")
class UnityLinkApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovUnityLinkService unityLinkService;

    @Test
    @DisplayName("통합 링크 목록 조회 성공")
    void getUnityLinkList_Success() throws Exception {
        // Given
        UnityLinkDto dto = new UnityLinkDto();
        dto.setUnityLinkId("L1");
        given(unityLinkService.getUnityLinkList(any(), any()))
                .willReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/unitylinks")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].unityLinkId").value("L1"));
    }
}
