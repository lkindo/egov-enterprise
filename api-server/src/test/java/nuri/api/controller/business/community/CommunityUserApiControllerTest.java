package nuri.api.controller.business.community;

import nuri.business.service.system.content.community.CommunityService;
import nuri.business.service.system.content.community.dto.CommunityDto;
import nuri.business.security.jwt.JwtTokenProvider;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CommunityUserApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("CommunityUserApiController 테스트")
class CommunityUserApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private CommunityService communityService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("커뮤니티 목록 조회 성공")
    void getCommunities_Success() throws Exception {
        Page<CommunityDto> page = new PageImpl<>(List.of(CommunityDto.builder().cmntyId("CMM_001").cmntyTtl("Test Comm").build()));
        given(communityService.getCommunityList(any(), any(), any(Pageable.class))).willReturn(page);

        mockMvc.perform(get("/api/v1/communities")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].cmntyId").value("CMM_001"));
    }

    @Test
    @DisplayName("커뮤니티 상세 조회 성공")
    void getCommunity_Success() throws Exception {
        given(communityService.getCommunity(anyString())).willReturn(CommunityDto.builder().cmntyId("CMM_001").build());

        mockMvc.perform(get("/api/v1/communities/CMM_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cmntyId").value("CMM_001"));
    }

    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("커뮤니티 가입 신청 성공")
    void joinCommunity_Success() throws Exception {
        mockMvc.perform(post("/api/v1/communities/CMM_001/join")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
