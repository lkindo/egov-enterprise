package nuri.api.controller.business.help;

import nuri.business.service.help.HelpService;
import nuri.business.service.help.dto.HpcmDto;
import nuri.business.service.help.dto.OnlineManualDto;
import nuri.business.service.help.dto.PublicHpcmDto;
import nuri.business.service.help.dto.PublicOnlineManualDto;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.http.MediaType;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@ExtendWith(MockitoExtension.class)
@DisplayName("HelpApiController 단위 테스트")
class HelpApiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private HelpService helpService;

    @InjectMocks
    private HelpApiController helpApiController;

    @BeforeEach
    void setUp() {
        objectMapper = JsonMapper.builder().configureForJackson2().build();
        
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

        mockMvc = MockMvcBuilders.standaloneSetup(helpApiController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver(), principalResolver)
                .build();
    }

    @Test
    @DisplayName("도움말(Hpcm) 목록 조회 테스트")
    void getHpcmListTest() throws Exception {
        Page<HpcmDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(helpService.getHpcmList(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/help/hpcm")
                        .param("keyword", "test")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("도움말 상세 조회")
    void getHpcmTest() throws Exception {
        HpcmDto dto = HpcmDto.builder().hlpSn(1L).build();
        when(helpService.getHpcm(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/help/hpcm/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("도움말 등록")
    void insertHpcmTest() throws Exception {
        HpcmDto dto = HpcmDto.builder().hlpSeCd("H01").hlpDfn("Def").hlpExpln("Expln").build();
        when(helpService.createHpcm(anyString(), any(HpcmDto.class))).thenReturn(1L);

        mockMvc.perform(post("/api/v1/help/hpcm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @DisplayName("도움말 수정")
    void updateHpcmTest() throws Exception {
        HpcmDto dto = HpcmDto.builder().hlpSn(1L).hlpSeCd("H01").hlpDfn("Def").hlpExpln("Expln").build();
        doNothing().when(helpService).updateHpcm(eq(1L), anyString(), any(HpcmDto.class));

        mockMvc.perform(put("/api/v1/help/hpcm/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("도움말 삭제")
    void deleteHpcmTest() throws Exception {
        doNothing().when(helpService).deleteHpcm(1L);

        mockMvc.perform(delete("/api/v1/help/hpcm/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("온라인 매뉴얼 목록 조회 테스트")
    void getManualsTest() throws Exception {
        Page<OnlineManualDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(helpService.getOnlineManualList(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/help/manuals")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("온라인 매뉴얼 상세 조회")
    void getManualTest() throws Exception {
        OnlineManualDto dto = OnlineManualDto.builder().onlnMnlSn(1L).build();
        when(helpService.getOnlineManual(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/help/manuals/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("온라인 매뉴얼 등록")
    void createManualTest() throws Exception {
        OnlineManualDto dto = OnlineManualDto.builder().onlnMnlNm("Manual").onlnMnlSeCd("S01").build();
        when(helpService.createOnlineManual(anyString(), any(OnlineManualDto.class))).thenReturn(1L);

        mockMvc.perform(post("/api/v1/help/manuals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @DisplayName("온라인 매뉴얼 수정")
    void updateManualTest() throws Exception {
        OnlineManualDto dto = OnlineManualDto.builder().onlnMnlSn(1L).onlnMnlNm("Manual").onlnMnlSeCd("S01").build();
        doNothing().when(helpService).updateOnlineManual(eq(1L), anyString(), any(OnlineManualDto.class));

        mockMvc.perform(put("/api/v1/help/manuals/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("온라인 매뉴얼 삭제")
    void deleteManualTest() throws Exception {
        doNothing().when(helpService).deleteOnlineManual(1L);

        mockMvc.perform(delete("/api/v1/help/manuals/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    /**
     * [2026-10-19] 도움말 센터가 읽는 열람 목록. 등록자 ID·등록 일시를 싣지 않는 공개용 DTO 를 그대로 돌려준다.
     */
    @Test
    @DisplayName("도움말·온라인 매뉴얼 열람 목록은 공개용 필드만 돌려준다")
    void publicListsReturnTheReaderProjection() throws Exception {
        when(helpService.getPublicHpcmList(eq("결재"), any())).thenReturn(new PageImpl<>(
                java.util.List.of(new PublicHpcmDto(3L, "결재 도움말", "설명")), PageRequest.of(0, 10), 1));
        when(helpService.getPublicOnlineManualList(any(), any())).thenReturn(new PageImpl<>(
                java.util.List.of(new PublicOnlineManualDto(7L, "결재 매뉴얼", "/docs/approval", null)), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/help/public-hpcm").param("keyword", "결재"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].hlpDfn").value("결재 도움말"))
                .andExpect(jsonPath("$.data.list[0].hlpExpln").value("설명"))
                .andExpect(jsonPath("$.data.list[0].frstRgtrId").doesNotExist())
                .andExpect(jsonPath("$.data.list[0].hlpSeCd").doesNotExist())
                .andExpect(jsonPath("$.data.total").value(1));
        mockMvc.perform(get("/api/v1/help/public-manuals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].onlnMnlNm").value("결재 매뉴얼"))
                .andExpect(jsonPath("$.data.list[0].onlnMnlDfn").value("/docs/approval"))
                .andExpect(jsonPath("$.data.list[0].frstRgtrId").doesNotExist());
    }

    /**
     * [2026-10-19 H3] 도움말·매뉴얼은 로그인한 사용자 누구나 읽는 안내다 — 열람 목록은 권한 없이 로그인만으로 통과하고, 관리 목록
     * (등록자 ID 포함)은 HELP_READ 그대로다. 실행 시 인가가 읽는 권한 원장(authorization/operation-bindings.json)으로 판정한다.
     */
    @Test
    @DisplayName("열람 목록은 로그인만으로, 관리 목록은 HELP_READ 로만 열린다")
    void readerListsNeedSignInWhileAdministrativeListsKeepHelpRead() {
        var policy = new nuri.business.security.authorization.PermissionPolicy();
        var user = nuri.business.support.AuthorizationTestPrincipal.authentication("user_test", "USR_001", "USER");
        var admin = nuri.business.support.AuthorizationTestPrincipal.authentication("admin_test", "USR_999", "ADMIN");
        var anonymous = new org.springframework.security.authentication.AnonymousAuthenticationToken("key", "anonymousUser",
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ANONYMOUS")));
        String handler = "nuri.api.controller.business.help.HelpApiController#";
        for (String reader : java.util.List.of("getPublicHpcmList", "getPublicManuals")) {
            org.assertj.core.api.Assertions.assertThat(policy.allowed(user, handler + reader)).as(reader + " — 일반 사용자").isTrue();
            org.assertj.core.api.Assertions.assertThat(policy.allowed(admin, handler + reader)).as(reader + " — 관리자").isTrue();
            org.assertj.core.api.Assertions.assertThat(policy.allowed(anonymous, handler + reader)).as(reader + " — 익명").isFalse();
        }
        for (String administrative : java.util.List.of("getHpcmList", "getManuals")) {
            org.assertj.core.api.Assertions.assertThat(policy.allowed(user, handler + administrative)).as(administrative + " — 일반 사용자").isFalse();
            org.assertj.core.api.Assertions.assertThat(policy.allowed(admin, handler + administrative)).as(administrative + " — 관리자").isTrue();
        }
    }
}
