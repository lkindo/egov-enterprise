package nuri.api.controller.business.community;

import nuri.business.service.system.content.community.CommunityService;
import nuri.business.service.system.content.community.dto.CommunityDto;
import nuri.foundation.security.jwt.JwtTokenProvider;
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
        Page<CommunityDto> page = new PageImpl<>(List.of(CommunityDto.builder().cmntySn(101L).cmntyNm("Test Comm").build()));
        given(communityService.getActiveCommunityList(any(), any(), any(Pageable.class))).willReturn(page);

        mockMvc.perform(get("/api/v1/communities")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].cmntySn").value(101));
    }

    /**
     * [2026-09-05] 사용자 상세는 {@code getActiveCommunity} 를 불러야 한다. 종전에는 관리자 상세와
     * 같은 무필터 {@code getCommunity} 를 불러 논리 삭제된 커뮤니티가 cmntySn 직접 지정으로 열렸다.
     * 어느 메서드를 부르는지가 곧 인가 의미라, 호출 대상을 양방향으로 고정한다.
     */
    @Test
    @DisplayName("커뮤니티 상세 조회 성공 — 사용자용 활성 조회 메서드를 통해서만")
    void getCommunity_Success() throws Exception {
        given(communityService.getActiveCommunity(anyLong())).willReturn(CommunityDto.builder().cmntySn(101L).build());

        mockMvc.perform(get("/api/v1/communities/101")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cmntySn").value(101));

        // 관리자용 무필터 메서드로 새면 논리 삭제된 커뮤니티가 다시 열린다.
        org.mockito.Mockito.verify(communityService, org.mockito.Mockito.never()).getCommunity(anyLong());
    }

    @Test
    @DisplayName("🔒 논리 삭제된 커뮤니티는 사용자 상세에서 404 다 — 존재 여부를 드러내지 않는다")
    void getCommunity_hiddenIsNotFound() throws Exception {
        given(communityService.getActiveCommunity(101L)).willThrow(
                new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND));

        mockMvc.perform(get("/api/v1/communities/101")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("커뮤니티 가입 신청 성공")
    void joinCommunity_Success() throws Exception {
        mockMvc.perform(post("/api/v1/communities/101/join")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
