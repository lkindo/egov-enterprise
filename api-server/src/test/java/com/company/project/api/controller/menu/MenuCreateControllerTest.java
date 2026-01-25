package com.company.project.api.controller.menu;

import com.company.project.api.config.ApiSecurityConfig;
import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuCreateDto;
import com.company.project.security.service.EgovAuthenticationProvider;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.sym.mnu.mcm.service.EgovMenuCreateManageService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.TestPropertySource;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doNothing;

@WebMvcTest(MenuCreateController.class)
@Import(ApiSecurityConfig.class)
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
public class MenuCreateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MenuService menuService;

    @MockBean
    private EgovMenuCreateManageService menuCreateManageService;

    @MockBean(name = "propertiesService")
    private EgovPropertyService propertiesService;

    @MockBean(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    @MockBean
    private EgovAuthenticationProvider egovAuthenticationProvider;

    @Test
    public void insertMenuCreatList_unauthenticated_shouldRedirectToLogin() throws Exception {
        mockMvc.perform(post("/sym/mnu/mcm/EgovMenuCreatInsert.do")
                .param("checkedAuthorForInsert", "ROLE_USER")
                .param("checkedMenuNoForInsert", "1,2,3"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/uat/uia/egovLoginUsr.do"));
    }

    @Test
    @WithMockUser(username = "testuser", roles = "USER")
    public void insertMenuCreatList_authenticated_shouldReachController() throws Exception {
        // Setup mocks needed for the controller logic
        when(egovMessageSource.getMessage("success.common.insert")).thenReturn("Success");
        doNothing().when(menuService).insertMenuCreatList(any(), any());

        MenuCreateDto menuCreatVO = new MenuCreateDto();
        menuCreatVO.setAuthorCode("ROLE_USER");

        mockMvc.perform(post("/sym/mnu/mcm/EgovMenuCreatInsert.do")
                .param("checkedAuthorForInsert", "ROLE_USER")
                .param("checkedMenuNoForInsert", "1,2,3")
                .flashAttr("menuCreatVO", menuCreatVO)
                .flashAttr("searchVO", new ComDefaultVO()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("/sym/mnu/mcm/EgovMenuCreatSelect.do?**"));
    }
}
