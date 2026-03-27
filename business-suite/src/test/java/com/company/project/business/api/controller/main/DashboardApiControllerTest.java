package com.company.project.business.api.controller.main;

import com.company.project.business.service.board.EgovBoardService;
import com.company.project.business.service.informalsanction.InformalSanctionService;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import java.util.Collections;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DashboardApiControllerTest {

    private MockMvc mockMvc;
    private EgovBoardService boardService;
    private InformalSanctionService approvalService;

    @BeforeEach
    void setUp() {
        boardService = mock(EgovBoardService.class);
        approvalService = mock(InformalSanctionService.class);
        
        DashboardApiController controller = new DashboardApiController(boardService, approvalService);
        
        // Mock UserDetails resolver
        HandlerMethodArgumentResolver userDetailsResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().equals(UserDetails.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                        NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                // Return null by default, will be overridden in specific tests if needed
                return null;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver(), userDetailsResolver)
                .build();
    }

    private void setupAuthenticatedUser(String username) {
        HandlerMethodArgumentResolver userDetailsResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().equals(UserDetails.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                        NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                UserDetails user = mock(UserDetails.class);
                when(user.getUsername()).thenReturn(username);
                return user;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(new DashboardApiController(boardService, approvalService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver(), userDetailsResolver)
                .build();
    }

    @Test
    @DisplayName("대시보드 조회 - 인증 실패(401)")
    void getDashboardData_unauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("대시보드 조회 - 성공 (전체 데이터)")
    void getDashboardData_success() throws Exception {
        setupAuthenticatedUser("testUser");
        
        when(boardService.getBoardPosts(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(approvalService.getReceivedInformalSanctionList(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.taskList").isArray())
                .andExpect(jsonPath("$.data.pendingApprovalCount").value(0));
    }

    @Test
    @DisplayName("대시보드 조회 - 일부 서비스 예외 발생 시 회복성 검증")
    void getDashboardData_partialFailures() throws Exception {
        setupAuthenticatedUser("testUser");
        
        // When task board service fails
        when(boardService.getBoardPosts(eq("BBSMSTR_CCCCCCCCCCCC"), any())).thenThrow(new RuntimeException("Task DB Down"));
        // When notice board service works
        when(boardService.getBoardPosts(eq("BBSMSTR_AAAAAAAAAAAA"), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        // When approval service fails
        when(approvalService.getReceivedInformalSanctionList(anyString(), any())).thenThrow(new RuntimeException("Approval API Error"));

        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.taskList").isEmpty())
                .andExpect(jsonPath("$.data.pendingApprovalCount").value(0));
        
        verify(boardService, times(2)).getBoardPosts(anyString(), any());
        verify(approvalService).getReceivedInformalSanctionList(anyString(), any());
    }
}
