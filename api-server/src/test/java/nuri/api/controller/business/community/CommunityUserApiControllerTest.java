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

    /**
     * [2026-09-08 PD-CMTY-001] 커뮤니티 귀속 게시판 목록은 <b>게시판 도메인</b>이 소유한다 —
     * 커뮤니티가 게시판을 import 하면 서비스 계층 교차 결합(GAP-ARCH-001)이 늘어나므로 조립만 여기서 한다.
     */
    @MockitoBean
    private nuri.business.service.board.BoardMasterService boardMasterService;

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

    /** [2026-09-06 DEC-OPS-043] 내 멤버십은 principal(esntlId) 축으로만 조회한다 — 경로에 다른 사용자를 지정할 수 없다. */
    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("내 멤버십 상태 — principal 의 esntlId 로 조회한다")
    void getMyMembership() throws Exception {
        given(communityService.getMembership(101L, "user01")).willReturn(
                new nuri.business.service.system.content.community.dto.CommunityMembershipDto(
                        101L, nuri.business.service.system.content.community.dto.CommunityMembershipDto.Status.REQUESTED, "20260906"));

        mockMvc.perform(get("/api/v1/communities/101/membership").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REQUESTED"))
                .andExpect(jsonPath("$.data.joinYmd").value("20260906"));
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

    /**
     * [2026-09-08 PD-CMTY-001] 회원 자격이 처음으로 여는 기능.
     *
     * <p>여기서 고정하는 것은 <b>경로와 위임 대상</b>이다 — 인가 판정 자체는
     * {@code BoardMasterService#assertCommunityMember} 가 소유하고 그 규칙은
     * {@code BoardCommunityAccessTest} 가 검증한다. 컨트롤러가 커뮤니티 서비스로 우회하거나
     * 판정 없는 다른 조회를 부르면 인가가 사라지므로 호출 대상을 양방향으로 고정한다.
     */
    @Test
    @DisplayName("커뮤니티 게시판 목록 — 게시판 서비스의 회원 판정 경로로만 조회한다")
    @WithMockCustomUser
    void getCommunityBoards_Success() throws Exception {
        given(boardMasterService.getCommunityBoards(anyLong())).willReturn(List.of(
                new nuri.business.service.board.dto.CommunityBoardDto(
                        "BBSMSTR_CMNTY01", "회원 게시판", "회원만 씁니다", "BBST01")));

        mockMvc.perform(get("/api/v1/communities/101/boards")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].bbsId").value("BBSMSTR_CMNTY01"))
                .andExpect(jsonPath("$.data[0].bbsTtl").value("회원 게시판"));

        org.mockito.Mockito.verify(boardMasterService).getCommunityBoards(101L);
        // 커뮤니티 서비스로 우회하면 회원 판정이 통째로 빠진다.
        org.mockito.Mockito.verifyNoInteractions(communityService);
    }
}
