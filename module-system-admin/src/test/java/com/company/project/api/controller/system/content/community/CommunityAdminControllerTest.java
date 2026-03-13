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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CommunityAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("CommunityAdminController 테스트")
class CommunityAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommunityService communityService;

    @Test
    @DisplayName("커뮤니티 목록 조회 성공")
    void getCommunities_Success() throws Exception {
        // Given
        CommunityDto dto = CommunityDto.builder().cmmntyId("C1").cmmntyNm("Community 1").build();
        given(communityService.getCommunityList(any(), any(), any()))
                .willReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/communities")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultList[0].cmmntyId").value("C1"));
    }

    @Test
    @DisplayName("커뮤니티 상세 조회 성공")
    void getCommunity_Success() throws Exception {
        // Given
        CommunityDto dto = CommunityDto.builder().cmmntyId("C1").cmmntyNm("Community 1").build();
        given(communityService.getCommunity("C1")).willReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/communities/C1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cmmntyId").value("C1"));
    }
}
