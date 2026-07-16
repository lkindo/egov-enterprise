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

    @InjectMocks
    private MenuUserApiController menuUserApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(menuUserApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
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
    @DisplayName("메뉴 목록 테스트 - DTO 반환 성공")
    void getRawMenus_Success() throws Exception {
        given(menuService.getAllMenus()).willReturn(new ArrayList<>());

        mockMvc.perform(get("/api/v1/menus/test/raw"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.code").exists())
                .andExpect(jsonPath("$.data.count").value(0))
                .andExpect(jsonPath("$.data.menus").exists());
    }

    @Test
    @DisplayName("메뉴 목록 테스트 - DTO 반환 실패")
    void getRawMenus_Fail() throws Exception {
        given(menuService.getAllMenus()).willThrow(new RuntimeException("Error"));

        mockMvc.perform(get("/api/v1/menus/test/raw"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    @DisplayName("프로그램 목록 테스트 - DTO 반환 성공")
    void getPrograms_Success() throws Exception {
        given(menuService.getAllPrograms()).willReturn(new ArrayList<>());

        mockMvc.perform(get("/api/v1/menus/test/programs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.code").exists())
                .andExpect(jsonPath("$.data.count").value(0))
                .andExpect(jsonPath("$.data.programs").exists());
    }

    @Test
    @DisplayName("프로그램 목록 테스트 - DTO 반환 실패")
    void getPrograms_Fail() throws Exception {
        given(menuService.getAllPrograms()).willThrow(new RuntimeException("Error"));

        mockMvc.perform(get("/api/v1/menus/test/programs"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").exists());
    }
}
