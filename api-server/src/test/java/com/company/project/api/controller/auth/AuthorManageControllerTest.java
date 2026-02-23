package com.company.project.api.controller.auth;

import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.AuthorManageDto;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.context.MessageSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

class AuthorManageControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthorManageService authorManageService;

    @Mock
    private EgovPropertyService propertiesService;

    @Mock
    private MessageSource messageSource;

    @InjectMocks
    private AuthorManageController authorManageController;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(authorManageController).build();
    }

    @Test
    void selectAuthor_ShouldReturnViewAndModel_WhenCalled() throws Exception {
        String authorCode = "ROLE_TEST";
        AuthorManageDto dto = new AuthorManageDto();
        dto.setAuthorCode(authorCode);
        dto.setAuthorNm("Test Role");

        when(authorManageService.selectAuthor(authorCode)).thenReturn(dto);
        when(messageSource.getMessage(anyString(), any(), any())).thenReturn("Success");

        mockMvc.perform(get("/sec/ram/EgovAuthor.do")
                .param("authorCode", authorCode))
                .andExpect(status().isOk())
                .andExpect(view().name("sec/ram/EgovAuthorUpdate"))
                .andExpect(model().attributeExists("authorManage"))
                .andExpect(model().attribute("message", "Success"));
    }
}
