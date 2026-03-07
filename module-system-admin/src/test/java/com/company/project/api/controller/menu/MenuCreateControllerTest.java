package com.company.project.api.controller.menu;

import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuCreateDto;
import com.company.project.security.service.EgovAuthenticationProvider;
import egovframework.com.cmm.ComDefaultVO;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.TestPropertySource;

import java.util.Locale;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doNothing;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

@org.junit.jupiter.api.Disabled
@WebMvcTest(MenuCreateController.class)
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
public class MenuCreateControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private MenuService menuService;

  @MockitoBean(name = "propertiesService")
  private EgovPropertyService propertiesService;

  @MockitoBean(name = "messageSource")
  private MessageSource messageSource;

  @MockitoBean
  private EgovAuthenticationProvider egovAuthenticationProvider;

  @MockitoBean
  private com.company.project.security.jwt.JwtTokenProvider jwtTokenProvider;

  @Test
  public void insertMenuCreatList_unauthenticated_shouldRedirectToLogin() throws Exception {
    mockMvc.perform(post("/sym/mnu/mcm/EgovMenuCreatInsert.do")
        .param("checkedAuthorForInsert", "ROLE_USER")
        .param("checkedMenuNoForInsert", "1,2,3")
        .with(csrf()))
        .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
        .andExpect(status().is3xxRedirection())
        .andExpect(redirectedUrlPattern("**/uat/uia/egovLoginUsr.do"));
  }

  @Test
  @WithMockUser(username = "testuser", roles = "USER")
  public void insertMenuCreatList_authenticated_shouldReachController() throws Exception {
    // Setup mocks
    when(messageSource.getMessage(anyString(), any(), any(Locale.class)))
        .thenReturn("Success");
    doNothing().when(menuService).insertMenuCreatList(anyString(), anyString());

    MenuCreateDto menuCreatVO = new MenuCreateDto();
    menuCreatVO.setAuthorCode("ROLE_USER");

    mockMvc.perform(post("/sym/mnu/mcm/EgovMenuCreatInsert.do")
        .param("checkedAuthorForInsert", "ROLE_USER")
        .param("checkedMenuNoForInsert", "1,2,3")
        .param("authorCode", "ROLE_USER")
        .flashAttr("menuCreatVO", menuCreatVO)
        .flashAttr("searchVO", new ComDefaultVO())
        .with(csrf()))
        .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
        .andExpect(status().is3xxRedirection())
        .andExpect(redirectedUrlPattern("/sym/mnu/mcm/EgovMenuCreatSelect.do?**"));
  }
}
