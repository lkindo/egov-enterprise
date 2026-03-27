package com.company.project.business.api.controller.notification;

import com.company.project.business.service.notification.NotificationService;
import com.company.project.business.service.notification.dto.NotificationDto;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class NotificationApiControllerTest {

    private MockMvc mockMvc;
    private NotificationService notificationService;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        notificationService = mock(NotificationService.class);
        
        // Mock UserDetails resolver
        HandlerMethodArgumentResolver userDetailsResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().equals(UserDetails.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                        NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                UserDetails user = mock(UserDetails.class);
                when(user.getUsername()).thenReturn("testUser");
                return user;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(new NotificationApiController(notificationService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(userDetailsResolver, new org.springframework.data.web.PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("알림 목록 조회 - 성공")
    void getNotifications_success() throws Exception {
        when(notificationService.getNotificationList(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/notifications")
                .param("searchWrd", "test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("미열람 알림 수 조회 - 성공")
    void getUnreadCount_success() throws Exception {
        when(notificationService.getUnreadCount("testUser")).thenReturn(5L);

        mockMvc.perform(get("/api/v1/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(5));
    }

    @Test
    @DisplayName("알림 상세 조회 - 성공")
    void getNotification_success() throws Exception {
        when(notificationService.getNotification("NT1")).thenReturn(NotificationDto.builder().ntfcNo("NT1").build());

        mockMvc.perform(get("/api/v1/notifications/NT1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ntfcNo").value("NT1"));
    }

    @Test
    @DisplayName("알림 읽음 처리 - 성공")
    void markAsRead_success() throws Exception {
        mockMvc.perform(post("/api/v1/notifications/NT1/read"))
                .andExpect(status().isOk());
        
        verify(notificationService).markAsRead("NT1");
    }

    @Test
    @DisplayName("알림 등록 - 성공")
    void createNotification_success() throws Exception {
        NotificationDto dto = NotificationDto.builder().ntfcSj("Title").build();
        when(notificationService.createNotification(eq("testUser"), any())).thenReturn("NT_NEW");

        mockMvc.perform(post("/api/v1/notifications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("NT_NEW"));
    }

    @Test
    @DisplayName("알림 삭제 - 성공")
    void deleteNotification_success() throws Exception {
        mockMvc.perform(delete("/api/v1/notifications/NT1"))
                .andExpect(status().isOk());
        
        verify(notificationService).deleteNotification("NT1");
    }
}
