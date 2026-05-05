package nuri.business.service.menu;

import nuri.foundation.service.menu.MenuService;
import nuri.foundation.service.menu.dto.MenuDto;
import nuri.foundation.service.menu.dto.MenuUIContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MenuIntegrationService 단위 테스트")
class MenuIntegrationServiceTest {

    @InjectMocks
    private MenuIntegrationService menuIntegrationService;

    @Mock
    private MenuService menuService;

    @Test
    @DisplayName("메뉴 컨텍스트 처리 - 일반 URI 및 쿼리스트링")
    void processMenuContext_WithQueryString() {
        // given
        String uri = "/selectBoardList.do";
        String queryString = "bbsId=BBSMSTR_AAAAAAAAAAAA";
        List<MenuDto> menuHierarchy = new ArrayList<>();
        menuHierarchy.add(MenuDto.builder().menuNo(1L).menuNm("Root").children(new ArrayList<>()).build());
        
        given(menuService.getMenuHierarchy()).willReturn(menuHierarchy);
        given(menuService.getRootMenuIdByUrl(anyString())).willReturn(1L);
        given(menuService.getSubMenus(1L)).willReturn(new ArrayList<>());

        // when
        MenuUIContext context = menuIntegrationService.processMenuContext(uri, queryString, null, "BBSMSTR_AAAAAAAAAAAA");

        // then
        assertThat(context.getActiveRootMenuId()).isEqualTo(1L);
        assertThat(context.getRootMenus()).isEqualTo(menuHierarchy);
        verify(menuService).getMenuHierarchy();
        verify(menuService).getRootMenuIdByUrl(uri + "?" + queryString);
    }

    @Test
    @DisplayName("메뉴 컨텍스트 처리 - ContextPath 제거 확인")
    void processMenuContext_RemoveContextPath() {
        // given
        String uri = "/context/mainPage.do";
        String contextPath = "/context";
        
        given(menuService.getMenuHierarchy()).willReturn(new ArrayList<>());
        given(menuService.getRootMenuIdByUrl("/mainPage.do")).willReturn(100L);
        given(menuService.getSubMenus(100L)).willReturn(new ArrayList<>());

        // when
        menuIntegrationService.processMenuContext(uri, null, contextPath, null);

        // then
        verify(menuService).getRootMenuIdByUrl("/mainPage.do");
    }

    @Test
    @DisplayName("메뉴 컨텍스트 처리 - URL로 못찾을 경우 프로그램명으로 찾기 (공지사항)")
    void processMenuContext_FindByProgrmFileNm_Notice() {
        // given
        String uri = "/selectBoardList.do";
        String bbsId = "BBSMSTR_AAAAAAAAAAAA";
        
        given(menuService.getMenuHierarchy()).willReturn(new ArrayList<>());
        given(menuService.getRootMenuIdByUrl(anyString())).willReturn(null);
        given(menuService.getRootMenuIdByProgrmFileNm("EgovInfoNotice")).willReturn(200L);
        given(menuService.getSubMenus(200L)).willReturn(new ArrayList<>());

        // when
        MenuUIContext context = menuIntegrationService.processMenuContext(uri, null, null, bbsId);

        // then
        assertThat(context.getActiveRootMenuId()).isEqualTo(200L);
        verify(menuService).getRootMenuIdByProgrmFileNm("EgovInfoNotice");
    }

    @Test
    @DisplayName("메뉴 컨텍스트 처리 - 업무게시판 프로그램명 매핑 확인")
    void processMenuContext_FindByProgrmFileNm_Work() {
        // given
        String uri = "/selectBoardArticle.do";
        String bbsId = "BBSMSTR_CCCCCCCCCCCC";
        
        given(menuService.getMenuHierarchy()).willReturn(new ArrayList<>());
        given(menuService.getRootMenuIdByUrl(anyString())).willReturn(null);
        given(menuService.getRootMenuIdByProgrmFileNm("EgovInfoWork")).willReturn(300L);
        given(menuService.getSubMenus(300L)).willReturn(new ArrayList<>());

        // when
        MenuUIContext context = menuIntegrationService.processMenuContext(uri, null, null, bbsId);

        // then
        assertThat(context.getActiveRootMenuId()).isEqualTo(300L);
        verify(menuService).getRootMenuIdByProgrmFileNm("EgovInfoWork");
    }

    @Test
    @DisplayName("메뉴 컨텍스트 처리 - 메인 페이지 기본값 확인")
    void processMenuContext_MainPageDefault() {
        // given
        String uri = "/mainPage.do";
        
        given(menuService.getMenuHierarchy()).willReturn(new ArrayList<>());
        given(menuService.getRootMenuIdByUrl(anyString())).willReturn(null);
        // identifyProgrmFileNm returns "MainPage" but let's assume it still returns null for rootMenuId
        given(menuService.getRootMenuIdByProgrmFileNm("MainPage")).willReturn(null);
        given(menuService.getSubMenus(1000000L)).willReturn(new ArrayList<>());

        // when
        MenuUIContext context = menuIntegrationService.processMenuContext(uri, null, null, null);

        // then
        assertThat(context.getActiveRootMenuId()).isEqualTo(1000000L);
    }

    @Test
    @DisplayName("메뉴 계층 구조 평탄화(Flatten) 확인")
    void flattenMenu_Logic() {
        // given
        List<MenuDto> children = new ArrayList<>();
        children.add(MenuDto.builder().menuNo(2L).menuNm("Child").build());
        
        List<MenuDto> menuHierarchy = new ArrayList<>();
        menuHierarchy.add(MenuDto.builder().menuNo(1L).menuNm("Root").children(children).build());
        
        given(menuService.getMenuHierarchy()).willReturn(menuHierarchy);
        given(menuService.getRootMenuIdByUrl(anyString())).willReturn(1L);
        given(menuService.getSubMenus(1L)).willReturn(new ArrayList<>());

        // when
        MenuUIContext context = menuIntegrationService.processMenuContext("/", null, null, null);

        // then
        assertThat(context.getFlatMenus()).hasSize(2);
        assertThat(context.getFlatMenus().get(0).getMenuNm()).isEqualTo("Root");
        assertThat(context.getFlatMenus().get(1).getMenuNm()).isEqualTo("Child");
    }

    @Test
    @DisplayName("메뉴 컨텍스트 처리 - 매핑 불가한 경우")
    void processMenuContext_Unknown() {
        // given
        String uri = "/unknown.do";
        
        given(menuService.getMenuHierarchy()).willReturn(new ArrayList<>());
        given(menuService.getRootMenuIdByUrl(anyString())).willReturn(null);
        // identifyProgrmFileNm will return null

        // when
        MenuUIContext context = menuIntegrationService.processMenuContext(uri, null, null, null);

        // then
        assertThat(context.getActiveRootMenuId()).isNull();
        assertThat(context.getSubMenus()).isEmpty();
    }
}
