package com.company.project.web.board.collaboration;

import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.service.board.EgovBoardMasterService;
import com.company.project.service.board.dto.BoardMasterDto;
import com.company.project.service.mail.EgovMailService;
import com.company.project.service.mail.dto.SentMailDto;
import com.company.project.web.board.LegacyCollaborationController;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import egovframework.com.cmm.service.EgovUserDetailsService;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@WebMvcTest(LegacyCollaborationController.class)
@ActiveProfiles("test")
class CollaborationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private EgovUserDetailsService egovUserDetailsService;

    @MockBean
    private EgovBoardMasterService egovBoardMasterService;

    @MockBean
    private EgovMailService egovMailService;

    // GlobalMenuAdvice dependency
    @MockBean
    private com.company.project.service.menu.MenuService menuService;

    @MockBean(name = "propertiesService")
    private EgovPropertyService propertyService;

    @BeforeEach
    void setUp() {
        // Explicitly inject the mock into the static helper
        new EgovUserDetailsHelper().setEgovUserDetailsService(egovUserDetailsService);

        // Ensure stubbing
        when(egovUserDetailsService.isAuthenticated()).thenReturn(true);
        LoginVO user = new LoginVO();
        when(egovUserDetailsService.getAuthenticatedUser()).thenReturn(user);
    }

    @Test
    @DisplayName("게시판 사용정보 목록 조회 Test")
    @WithMockUser
    void testSelectBBSUseInfs() throws Exception {
        // Given
        Page<BoardMasterDto> emptyPage = new PageImpl<>(Collections.emptyList());
        when(egovBoardMasterService.getBoardMasterList(any(), any(), any(Pageable.class))).thenReturn(emptyPage);
        when(propertyService.getInt("pageUnit")).thenReturn(10);
        when(propertyService.getInt("pageSize")).thenReturn(10);

        // When & Then
        mockMvc.perform(get("/cop/com/selectBBSUseInfs.do")
                .with(csrf()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(view().name("egovframework/com/cop/com/EgovBBSUseInfList"))
                .andExpect(model().attributeExists("resultList"));
    }

    @Test
    @DisplayName("발송메일 내역 목록 조회 Test")
    @WithMockUser
    void testSelectSndngMailList() throws Exception {
        // Given
        SentMailDto mailDto = SentMailDto.builder().build();

        Page<SentMailDto> emptyPage = new PageImpl<>(Collections.singletonList(mailDto));
        when(egovMailService.getSentMailList(any(), any(Pageable.class))).thenReturn(emptyPage);
        when(propertyService.getInt("pageUnit")).thenReturn(10);
        when(propertyService.getInt("pageSize")).thenReturn(10);

        // When & Then
        mockMvc.perform(get("/cop/ems/selectSndngMailList.do")
                .with(csrf()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(view().name("egovframework/com/cop/ems/EgovSndngMailList"))
                .andExpect(model().attributeExists("resultList"));
    }
}
