package nuri.api.controller.business.notification;

import nuri.business.test.BaseControllerTest;

import nuri.business.service.notification.NotificationService;
import nuri.business.service.notification.dto.NotificationDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import nuri.business.security.service.CustomUserDetails;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import java.util.Collections;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class NotificationApiControllerTest extends BaseControllerTest {

    private NotificationService notificationService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        notificationService = mock(NotificationService.class);
        return new NotificationApiController(notificationService);
    }

    @Override
    protected HandlerMethodArgumentResolver[] getCustomArgumentResolvers() {
        HandlerMethodArgumentResolver userDetailsResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().equals(CustomUserDetails.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                         NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                CustomUserDetails user = mock(CustomUserDetails.class);
                when(user.getUsername()).thenReturn("testUser");
                return user;
            }
        };

        return new HandlerMethodArgumentResolver[] { userDetailsResolver, new PageableHandlerMethodArgumentResolver() };
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
