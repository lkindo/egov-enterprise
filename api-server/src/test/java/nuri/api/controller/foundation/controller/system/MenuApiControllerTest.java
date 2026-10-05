package nuri.api.controller.foundation.controller.system;

import nuri.business.test.BaseControllerTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import nuri.business.service.menu.MenuService;
import nuri.business.service.menu.dto.MenuDto;
import nuri.business.service.menu.dto.MenuStructureDto;
import org.springframework.http.MediaType;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("MenuApiController 테스트")
class MenuApiControllerTest extends BaseControllerTest {

    private MenuService menuService;
    private tools.jackson.databind.ObjectMapper objectMapper = tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build();

    @Override
    protected Object getController() {
        menuService = mock(MenuService.class);
        return new MenuApiController(menuService);
    }

    @Override
    protected HandlerMethodArgumentResolver[] getCustomArgumentResolvers() {
        return new HandlerMethodArgumentResolver[] { new PageableHandlerMethodArgumentResolver() };
    }

    @Test
    @DisplayName("메뉴 목록 조회 성공")
    void testGetMenus() throws Exception {
        // Given
        when(menuService.selectMenuManageList(any())).thenReturn(Collections.emptyList());
        when(menuService.selectMenuManageListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("메뉴 상세 조회 성공")
    void testGetMenu() throws Exception {
        // Given
        MenuDto dto = new MenuDto();
        dto.setMenuNo(1001L);
        dto.setMenuNm("시스템 관리");
        when(menuService.selectMenuManage(1001L)).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/menus/1001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.menuNo").value(1001));
    }

    @Test
    @DisplayName("메뉴 등록 성공")
    void testCreateMenu() throws Exception {
        // Given
        MenuDto dto = new MenuDto();
        dto.setMenuNo(2001L);
        dto.setMenuNm("신규 메뉴");
        dto.setUseYn("Y");
        dto.setMenuOrdr(1);

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/menus")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(menuService, times(1)).insertMenuManage(any(MenuDto.class));
    }

    @Test
    @DisplayName("메뉴 삭제 성공")
    void testDeleteMenu() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/menus/1001"))
                .andExpect(status().isOk());

        verify(menuService, times(1)).deleteMenuManage(any(MenuDto.class));
    }

    @Test
    @DisplayName("전체 메뉴 트리 조회")
    void testGetAllMenus() throws Exception {
        when(menuService.getAllMenus()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/admin/system/menus/all"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("메뉴 수정")
    void testUpdateMenu() throws Exception {
        MenuDto dto = new MenuDto();
        dto.setMenuNm("Updated");
        dto.setUseYn("Y");
        dto.setMenuOrdr(1);
        mockMvc.perform(put("/api/v1/admin/system/menus/1001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("메뉴 순서 일괄 변경")
    void testUpdateMenuOrder() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/menus/batch-order")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Collections.emptyList())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("[D1] 메뉴 구조 조회는 서비스의 구조와 버전을 그대로 싣는다")
    void testGetMenuStructure() throws Exception {
        when(menuService.getMenuStructure()).thenReturn(new MenuStructureDto.MenuStructure("v1", List.of(
                new MenuStructureDto.MenuStructureItem(1L, "Root", null, 1, null, null, "Y"))));
        mockMvc.perform(get("/api/v1/admin/system/menus/structure"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value("v1"))
                .andExpect(jsonPath("$.data.menus[0].menuNo").value(1))
                .andExpect(jsonPath("$.data.menus[0].upMenuSn").doesNotExist());
        verify(menuService, never()).selectMenuManage(any());
    }

    @Test
    @DisplayName("[D2] 메뉴 구조 저장은 검증한 요청을 서비스에 넘기고 저장 뒤 구조를 돌려준다")
    void testSaveMenuStructure() throws Exception {
        when(menuService.saveMenuStructure(any())).thenReturn(new MenuStructureDto.MenuStructure("v2", List.of()));
        String body = """
                {"version":"v1","creations":[{"key":"new-1","menuNm":"새 메뉴","modernRoute":"/admin/new?tab=a","menuExpln":null,"useYn":"Y"}],
                 "placements":[{"ref":"new-1","parentRef":"12","menuOrdr":1},{"ref":"13","parentRef":null,"menuOrdr":2}],
                 "properties":[{"menuNo":12,"menuNm":"이름","modernRoute":"","menuExpln":"설명","useYn":"N"}],
                 "deletions":[14],
                 "grants":[{"groupCode":"ROLE_ADMIN","groupVersion":"g1","navigationAdd":["new-1","12"],"navigationRemove":[15],"operationAdd":["MENU_READ"]}]}
                """;
        mockMvc.perform(put("/api/v1/admin/system/menus/structure").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value("v2"));
        var captured = org.mockito.ArgumentCaptor.forClass(MenuStructureDto.MenuStructureSave.class);
        verify(menuService).saveMenuStructure(captured.capture());
        assertThat(captured.getValue().creations().getFirst().key()).isEqualTo("new-1");
        assertThat(captured.getValue().grants().getFirst().navigationAdd()).containsExactly("new-1", "12");
        assertThat(captured.getValue().deletions()).containsExactly(14L);
    }

    @Test
    @DisplayName("[D2] 메뉴 구조 저장 요청의 형식 오류(버전 누락·잘못된 키·허용 밖 라우트·사용 여부)는 400 이고 서비스에 닿지 않는다")
    void testSaveMenuStructureRejectsInvalidPayloads() throws Exception {
        String valid = "{\"version\":\"v1\",\"creations\":[],\"placements\":[{\"ref\":\"13\",\"parentRef\":null,\"menuOrdr\":2}],"
                + "\"properties\":[],\"deletions\":[],\"grants\":[]}";
        for (String body : List.of(
                valid.replace("\"version\":\"v1\"", "\"version\":\"\""),
                valid.replace("\"ref\":\"13\"", "\"ref\":\"new-0\""),
                valid.replace("\"ref\":\"13\"", "\"ref\":\"menu-13\""),
                valid.replace("\"menuOrdr\":2", "\"menuOrdr\":0"),
                valid.replace("\"properties\":[]", "\"properties\":[{\"menuNo\":12,\"menuNm\":\"이름\",\"modernRoute\":\"/admin/x?q=hong\",\"useYn\":\"Y\"}]"),
                valid.replace("\"properties\":[]", "\"properties\":[{\"menuNo\":12,\"menuNm\":\"이름\",\"useYn\":\"X\"}]"),
                valid.replace("\"deletions\":[]", "\"deletions\":[0]"),
                valid.replace("\"grants\":[]", "\"grants\":[{\"groupCode\":\"G\",\"groupVersion\":\"g\",\"navigationAdd\":[\"abc\"],\"navigationRemove\":[],\"operationAdd\":[]}]"),
                valid.replace(",\"grants\":[]", ""))) {
            mockMvc.perform(put("/api/v1/admin/system/menus/structure").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verify(menuService, never()).saveMenuStructure(any());
    }

    @Test
    @DisplayName("메뉴 생성 관리 목록 조회")
    void testGetMenuCreationManageList() throws Exception {
        when(menuService.selectMenuCreatManagList(any())).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/admin/system/menus/creation-manage"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("권한별 메뉴 목록 조회")
    void testGetMenuCreationList() throws Exception {
        when(menuService.selectMenuCreatList(any())).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/admin/system/menus/creation/ROLE_ADMIN"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("권한별 메뉴 할당 저장")
    void testCreateMenuCreation() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/menus/creation/ROLE_ADMIN")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(1001L, 1002L))))
                .andExpect(status().isOk());
        verify(menuService).insertMenuCreatList(eq("ROLE_ADMIN"), anyString());
    }
}