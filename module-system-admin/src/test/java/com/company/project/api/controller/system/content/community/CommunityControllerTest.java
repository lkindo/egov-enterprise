package com.company.project.api.controller.system.content.community;

import com.company.project.service.system.content.community.CommunityService;
import com.company.project.service.system.content.community.dto.CommunityDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CommunityController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("CommunityController 테스트")
class CommunityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommunityService communityService;

    @Test
    @DisplayName("커뮤니티 상세 조회 성공")
    void getCommunity_Success() throws Exception {
        // Given
        given(communityService.getCommunity("C1")).willReturn(CommunityDto.builder().cmmntyId("C1").build());

        // When & Then
        mockMvc.perform(get("/api/v1/communities/C1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cmmntyId").value("C1"));
    }
}
