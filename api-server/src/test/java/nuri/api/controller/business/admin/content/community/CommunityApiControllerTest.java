package nuri.api.controller.business.admin.content.community;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.business.service.system.content.community.CommunityService;
import nuri.business.service.system.content.community.dto.CommunityDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommunityApiController 단위 테스트")
class CommunityApiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private CommunityService communityService;

    @InjectMocks
    private CommunityApiController communityApiController;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        
        org.springframework.web.method.support.HandlerMethodArgumentResolver principalResolver = new org.springframework.web.method.support.HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(org.springframework.core.MethodParameter parameter) {
                return parameter.getParameterType().isAssignableFrom(org.springframework.security.core.userdetails.UserDetails.class);
            }
            @Override
            public Object resolveArgument(org.springframework.core.MethodParameter parameter, org.springframework.web.method.support.ModelAndViewContainer mavContainer, org.springframework.web.context.request.NativeWebRequest webRequest, org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
                return new org.springframework.security.core.userdetails.User("user", "password", Collections.emptyList());
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(communityApiController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver(), principalResolver)
                .build();
    }

    @Test
    @DisplayName("커뮤니티 목록 조회")
    void getCommunities() throws Exception {
        Page<CommunityDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(communityService.getCommunityList(anyString(), anyString(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/content/community")
                        .param("searchCnd", "1")
                        .param("searchWrd", "test")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("커뮤니티 상세 조회")
    void getCommunity() throws Exception {
        CommunityDto dto = new CommunityDto();
        dto.setCmntySn(101L);
        when(communityService.getCommunity(101L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/content/community/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("커뮤니티 생성")
    void createCommunity() throws Exception {
        CommunityDto requestDto = new CommunityDto();
        requestDto.setCmntyNm("New Community");
        requestDto.setUseYn("Y");
        
        CommunityDto responseDto = new CommunityDto();
        responseDto.setCmntySn(101L);
        
        when(communityService.createCommunity(eq("user"), any(CommunityDto.class))).thenReturn(responseDto);

        mockMvc.perform(post("/api/v1/admin/content/community")
                        .with(SecurityMockMvcRequestPostProcessors.user(nuri.business.support.AuthorizationTestPrincipal.principal("user", "user", "ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cmntySn").value(101));
    }

    @Test
    @DisplayName("커뮤니티 생성 — 이름이 비면 400 (DEC-OPS-037 제품 규칙)")
    void createCommunity_BlankName_BadRequest() throws Exception {
        CommunityDto requestDto = new CommunityDto();
        requestDto.setCmntyNm("  ");
        requestDto.setUseYn("Y");

        mockMvc.perform(post("/api/v1/admin/content/community")
                        .with(SecurityMockMvcRequestPostProcessors.user(nuri.business.support.AuthorizationTestPrincipal.principal("user", "user", "ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isBadRequest());
        verify(communityService, never()).createCommunity(anyString(), any(CommunityDto.class));
    }

    @Test
    @DisplayName("커뮤니티 수정")
    void updateCommunity() throws Exception {
        CommunityDto dto = new CommunityDto();
        dto.setCmntyNm("Updated Community");
        dto.setUseYn("Y");

        doNothing().when(communityService).updateCommunity(eq("user"), any(CommunityDto.class));

        mockMvc.perform(put("/api/v1/admin/content/community/101")
                        .with(SecurityMockMvcRequestPostProcessors.user(nuri.business.support.AuthorizationTestPrincipal.principal("user", "user", "ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("커뮤니티 삭제")
    void deleteCommunity() throws Exception {
        doNothing().when(communityService).deleteCommunity(101L, "user");

        mockMvc.perform(delete("/api/v1/admin/content/community/101")
                        .with(SecurityMockMvcRequestPostProcessors.user(nuri.business.support.AuthorizationTestPrincipal.principal("user", "user", "ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ─── 멤버십 (2026-09-06 DEC-OPS-043) ────────────────────────────────────────────────────────

    @Test
    @DisplayName("회원·가입 신청 목록 — status 는 enum 이름으로 받아 서비스에 그대로 넘긴다")
    void getMembers() throws Exception {
        Page<nuri.business.service.system.content.community.dto.CommunityMemberDto> page = new PageImpl<>(
                List.of(new nuri.business.service.system.content.community.dto.CommunityMemberDto(
                        101L, "esntl-1", "홍길동",
                        nuri.business.domain.system.content.community.CommunityMemberStatus.REQUESTED,
                        "A", "N", "20260906", "Y")),
                PageRequest.of(0, 20), 1);
        when(communityService.getMembers(eq(101L),
                eq(nuri.business.domain.system.content.community.CommunityMemberStatus.REQUESTED), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/content/community/101/members").param("status", "REQUESTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].userId").value("esntl-1"))
                .andExpect(jsonPath("$.data.list[0].userNm").value("홍길동"))
                .andExpect(jsonPath("$.data.list[0].status").value("REQUESTED"));
    }

    @Test
    @DisplayName("가입 승인 — PATCH …/members/{userId}/approve")
    void approveMember() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/content/community/101/members/esntl-1/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        verify(communityService).approveMember(101L, "esntl-1");
    }

    @Test
    @DisplayName("가입 반려 — DELETE …/members/{userId}")
    void rejectMember() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/content/community/101/members/esntl-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        verify(communityService).rejectMember(101L, "esntl-1");
    }

    /**
     * 🔒 멤버십 전이 3본은 URL 게이트 외에 메서드의 정확한 기능 인가를 직접 든다. standalone MockMvc 는
     * 메서드 보안을 집행하지 않으므로 애노테이션의 존재를 리플렉션으로 고정한다 — 제거되면 인가 완화다.
     */
    @Test
    @DisplayName("멤버십 조회·승인·거절은 각각의 기능 권한을 확인한다")
    void membershipHandlersCarryMethodSecurity() throws Exception {
        for (String name : List.of("getMembers", "approveMember", "rejectMember")) {
            java.lang.reflect.Method handler = java.util.Arrays.stream(CommunityApiController.class.getDeclaredMethods())
                    .filter(m -> m.getName().equals(name)).findFirst().orElseThrow();
            String permission = switch (name) {
                case "getMembers" -> "COMMUNITY_READ_ALL";
                case "approveMember" -> "COMMUNITY_APPROVE";
                default -> "COMMUNITY_REJECT";
            };
            nuri.security.support.MethodPermissionContract.assertOperation(handler, permission, false);
        }
    }

    @Test
    @DisplayName("포틀릿 커뮤니티 목록 조회")
    void getCommunityPortlet() throws Exception {
        List<CommunityDto> list = Collections.singletonList(new CommunityDto());
        when(communityService.getCommunityListPortlet()).thenReturn(list);

        mockMvc.perform(get("/api/v1/admin/content/community/portlet"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
