package nuri.api.controller.foundation.controller.menu;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.business.service.menu.MenuService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("MenuUserApiController 테스트")
class MenuUserApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MenuService menuService;

    @Mock
    private nuri.business.service.menu.MenuBookmarkService menuBookmarkService;

    private static final nuri.foundation.security.service.CustomUserDetails PRINCIPAL =
            nuri.foundation.security.service.CustomUserDetails.builder()
                    .userId("staff01").esntlId("USR_STAFF_0001").enabled(true)
                    .groups(java.util.List.of("GROUP_STAFF")).permissions(java.util.List.of()).build();

    @InjectMocks
    private MenuUserApiController menuUserApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(menuUserApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new nuri.business.security.resolver.LoginUserArgumentResolver())
                .build();
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        PRINCIPAL, null, PRINCIPAL.getAuthorities()));
    }

    @org.junit.jupiter.api.AfterEach
    void clearSecurityContext() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("[DIP B5 F2] 즐겨찾기 목록·추가·빼기는 대상을 인증 주체의 esntlId 로 고정한다")
    void bookmarksAreBoundToPrincipal() throws Exception {
        given(menuBookmarkService.getMyBookmarks("USR_STAFF_0001"))
                .willReturn(java.util.List.of(new nuri.business.service.menu.dto.MenuBookmarkDto(10L, "공지")));

        mockMvc.perform(get("/api/v1/menus/bookmarks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].menuNo").value(10))
                .andExpect(jsonPath("$.data[0].menuNm").value("공지"));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/menus/bookmarks/10"))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/menus/bookmarks/10"))
                .andExpect(status().isOk());

        org.mockito.Mockito.verify(menuBookmarkService).addBookmark("USR_STAFF_0001", 10L);
        org.mockito.Mockito.verify(menuBookmarkService).removeBookmark("USR_STAFF_0001", 10L);
    }

    @Test
    @DisplayName("[DIP B5 F2] 볼 수 없는 메뉴 즐겨찾기는 404, 상한 초과는 409 다")
    void bookmarkErrorsKeepServerStatus() throws Exception {
        org.mockito.Mockito.doThrow(new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND, "즐겨찾기할 수 있는 메뉴가 아닙니다."))
                .when(menuBookmarkService).addBookmark("USR_STAFF_0001", 99L);
        org.mockito.Mockito.doThrow(new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.RESOURCE_IN_USE, "즐겨찾기는 30개까지 둘 수 있습니다."))
                .when(menuBookmarkService).addBookmark("USR_STAFF_0001", 31L);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/menus/bookmarks/99"))
                .andExpect(status().isNotFound());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/menus/bookmarks/31"))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("즐겨찾기 정리는 확인한 권한·개수·후보가 없는 요청을 저장 전에 거부한다")
    void cleanupRequiresAnExplicitValidatedConfirmation() throws Exception {
        String version = "a".repeat(64);
        for (String body : java.util.List.of(
                "{}",
                "{\"expectedAuthorizationVersion\":\"\",\"expectedServerUnavailableCount\":0,\"uiUnavailableMenuNos\":[]}",
                "{\"expectedAuthorizationVersion\":\"" + version + "\",\"expectedServerUnavailableCount\":-1,\"uiUnavailableMenuNos\":[]}",
                "{\"expectedAuthorizationVersion\":\"" + version + "\",\"expectedServerUnavailableCount\":0,\"uiUnavailableMenuNos\":null}",
                "{\"expectedAuthorizationVersion\":\"" + version + "\",\"expectedServerUnavailableCount\":0,\"uiUnavailableMenuNos\":[null]}")) {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/menus/bookmarks/cleanup")
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .content(body))
                    .andExpect(status().isBadRequest());
        }
        org.mockito.Mockito.verifyNoInteractions(menuBookmarkService);
    }

    @Test
    void statusReturnsVisibleBookmarksAndOnlyTheUnavailableCount() throws Exception {
        given(menuBookmarkService.getMyBookmarkStatus("USR_STAFF_0001"))
                .willReturn(new nuri.business.service.menu.dto.MenuBookmarkStatusDto(java.util.List.of(
                        new nuri.business.service.menu.dto.MenuBookmarkDto(10L, "공지")), 2));

        var response = mockMvc.perform(get("/api/v1/menus/bookmarks/status").param("esntlId", "OTHER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookmarks[0].menuNo").value(10))
                .andExpect(jsonPath("$.data.bookmarks[0].menuNm").value("공지"))
                .andExpect(jsonPath("$.data.unavailableCount").value(2))
                .andReturn().getResponse().getContentAsString();

        var data = tools.jackson.databind.json.JsonMapper.builder().build().readTree(response).get("data");
        org.assertj.core.api.Assertions.assertThat(data.propertyNames()).containsExactlyInAnyOrder("bookmarks", "unavailableCount");
        org.assertj.core.api.Assertions.assertThat(data.get("bookmarks").get(0).propertyNames())
                .containsExactlyInAnyOrder("menuNo", "menuNm");
        org.mockito.Mockito.verify(menuBookmarkService).getMyBookmarkStatus("USR_STAFF_0001");
    }

    @Test
    void cleanupBindsTheConfirmedRequestToTheAuthenticatedOwner() throws Exception {
        var request = new nuri.business.service.menu.dto.MenuBookmarkCleanupRequest("a".repeat(64), 2, java.util.List.of(10L));
        given(menuBookmarkService.cleanupUnavailableBookmarks("USR_STAFF_0001", request))
                .willReturn(new nuri.business.service.menu.dto.MenuBookmarkCleanupResult(3));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/menus/bookmarks/cleanup")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"expectedAuthorizationVersion\":\"" + "a".repeat(64)
                                + "\",\"expectedServerUnavailableCount\":2,\"uiUnavailableMenuNos\":[10],\"esntlId\":\"OTHER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.removedCount").value(3));

        org.mockito.Mockito.verify(menuBookmarkService).cleanupUnavailableBookmarks("USR_STAFF_0001", request);
    }

    @Test
    void cleanupKeepsServerConflictStatus() throws Exception {
        var request = new nuri.business.service.menu.dto.MenuBookmarkCleanupRequest("a".repeat(64), 1, java.util.List.of());
        given(menuBookmarkService.cleanupUnavailableBookmarks("USR_STAFF_0001", request))
                .willThrow(new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION,
                        "즐겨찾기 상태가 변경되었습니다. 다시 확인해 주세요."));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/menus/bookmarks/cleanup")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"expectedAuthorizationVersion\":\"" + "a".repeat(64)
                                + "\",\"expectedServerUnavailableCount\":1,\"uiUnavailableMenuNos\":[]}"))
                .andExpect(status().isConflict());
    }

    @Test
    void cleanupRejectsDuplicateNonPositiveAndOversizedCandidatesBeforeService() throws Exception {
        var oversized = java.util.stream.LongStream.rangeClosed(1, 31).mapToObj(Long::toString)
                .collect(java.util.stream.Collectors.joining(",", "[", "]"));
        for (String candidates : java.util.List.of("[10,10]", "[0]", "[-1]", oversized)) {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/menus/bookmarks/cleanup")
                            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                            .content("{\"expectedAuthorizationVersion\":\"" + "a".repeat(64)
                                    + "\",\"expectedServerUnavailableCount\":0,\"uiUnavailableMenuNos\":" + candidates + "}"))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/menus/bookmarks/cleanup")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"expectedAuthorizationVersion\":\"" + "a".repeat(65)
                                + "\",\"expectedServerUnavailableCount\":0,\"uiUnavailableMenuNos\":[]}"))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(menuBookmarkService);
    }

    @Test
    @DisplayName("GNB 메인 메뉴 목록 조회 성공")
    void getHeadMenu_Success() throws Exception {
        given(menuService.getMenuHierarchy()).willReturn(new ArrayList<>());

        mockMvc.perform(get("/api/v1/menus/head"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").exists());
    }

    @Test
    @DisplayName("특정 메뉴의 하위 메뉴 목록 조회 성공")
    void getLeftMenu_Success() throws Exception {
        given(menuService.getSubMenus(anyLong())).willReturn(new ArrayList<>());

        mockMvc.perform(get("/api/v1/menus/left").param("menuNo", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("[보안] 권한 필터를 우회하던 디버그 덤프 핸들러가 컨트롤러에 존재하지 않는다")
    void debugDumpEndpoints_Removed() {
        // /test/raw·/test/programs 는 인증만 통과하면 비활성 메뉴·관리자 전용 라우트와 전체 프로그램을
        // 그대로 덤프해 정찰 창구가 됐다. 재추가 방지 가드.
        // (standalone MockMvc 는 미매핑 경로에 404 가 아닌 500 을 내므로 요청이 아니라 매핑 자체를 검사한다)
        boolean hasDebugMapping = java.util.Arrays.stream(MenuUserApiController.class.getDeclaredMethods())
                .map(m -> m.getAnnotation(org.springframework.web.bind.annotation.GetMapping.class))
                .filter(java.util.Objects::nonNull)
                .flatMap(a -> java.util.Arrays.stream(a.value()))
                .anyMatch(path -> path.contains("/test"));

        org.assertj.core.api.Assertions.assertThat(hasDebugMapping)
                .as("컨트롤러 매핑 경로에 /test 세그먼트가 있으면 디버그 엔드포인트가 되살아난 것이다")
                .isFalse();
    }
}
