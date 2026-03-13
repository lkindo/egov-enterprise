package com.company.project.api.controller.auth;

import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.AuthorManageDto;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.support.StaticMessageSource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.MessageSource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthorManageController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AuthorManageController 테스트")
class AuthorManageControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public MessageSource messageSource() {
            StaticMessageSource ms = new StaticMessageSource();
            ms.setUseCodeAsDefaultMessage(true);
            return ms;
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthorManageService authorManageService;

    @MockitoBean
    private EgovPropertyService propertiesService;

    @Test
    @DisplayName("권한 목록 조회 테스트")
    void selectAuthorListTest() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(authorManageService.selectAuthorList(any())).willReturn(Collections.emptyList());
        given(authorManageService.selectAuthorListTotCnt(any())).willReturn(0);

        mockMvc.perform(get("/sec/ram/EgovAuthorList.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("sec/ram/EgovAuthorManage"))
                .andExpect(model().attributeExists("authorList"))
                .andExpect(model().attributeExists("paginationInfo"));
    }

    @Test
    @DisplayName("권한 상세 조회 테스트")
    void selectAuthorTest() throws Exception {
        given(authorManageService.selectAuthor("ROLE_USER")).willReturn(new AuthorManageDto());

        mockMvc.perform(get("/sec/ram/EgovAuthor.do")
                .param("authorCode", "ROLE_USER"))
                .andExpect(status().isOk())
                .andExpect(view().name("sec/ram/EgovAuthorUpdate"))
                .andExpect(model().attributeExists("authorManage"));
    }

    @Test
    @DisplayName("권한 등록 뷰 이동 테스트")
    void insertAuthorViewTest() throws Exception {
        mockMvc.perform(get("/sec/ram/EgovAuthorInsertView.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("sec/ram/EgovAuthorInsert"))
                .andExpect(model().attributeExists("authorManage"));
    }

    @Test
    @DisplayName("권한 등록 성공 테스트")
    void insertAuthorSuccessTest() throws Exception {
        mockMvc.perform(post("/sec/ram/EgovAuthorInsert.do")
                .param("authorCode", "ROLE_NEW")
                .param("authorNm", "New Role"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/sec/ram/EgovAuthorList.do"));

        verify(authorManageService).insertAuthor(any(AuthorManageDto.class));
    }

    @Test
    @DisplayName("권한 수정 성공 테스트")
    void updateAuthorSuccessTest() throws Exception {
        mockMvc.perform(post("/sec/ram/EgovAuthorUpdate.do")
                .param("authorCode", "ROLE_USER")
                .param("authorNm", "Updated Role"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/sec/ram/EgovAuthorList.do"));

        verify(authorManageService).updateAuthor(any(AuthorManageDto.class));
    }

    @Test
    @DisplayName("권한 삭제 테스트")
    void deleteAuthorTest() throws Exception {
        mockMvc.perform(post("/sec/ram/EgovAuthorDelete.do")
                .param("authorCode", "ROLE_USER"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/sec/ram/EgovAuthorList.do"));

        verify(authorManageService).deleteAuthor("ROLE_USER");
    }

    @Test
    @DisplayName("권한 다중 삭제 테스트")
    void deleteAuthorListTest() throws Exception {
        mockMvc.perform(post("/sec/ram/EgovAuthorListDelete.do")
                .param("authorCodes", "ROLE1;ROLE2"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/sec/ram/EgovAuthorList.do"));

        verify(authorManageService).deleteAuthors(any(String[].class));
    }

    @Test
    @DisplayName("접근 거부 페이지 이동 테스트")
    void accessDeniedTest() throws Exception {
        mockMvc.perform(get("/sec/ram/accessDenied.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("sec/accessDenied"));
    }
}
