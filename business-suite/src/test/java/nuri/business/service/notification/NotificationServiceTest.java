package nuri.business.service.notification;

import nuri.business.domain.notification.Notification;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.notification.dto.NotificationDto;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("NotificationService (알림 서비스) 테스트")
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private Notification createMockEntity(String id) {
        return Notification.builder()
                .ntfcNo(id)
                .ntfcSj("Test Subject")
                .ntfcCn("Test Content")
                .receiverId("user123")
                .linkUrl("/test")
                .build();
    }

    @Test
    @DisplayName("알림 목록 조회 - 성공")
    void getNotificationList_success() {
        PageRequest pageable = PageRequest.of(0, 10);
        when(notificationRepository.searchNotifications(anyString(), any()))
                .thenReturn(new PageImpl<>(List.of(createMockEntity("NT_1"))));

        Page<NotificationDto> result = notificationService.getNotificationList("test", pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(notificationRepository).searchNotifications(eq("test"), eq(pageable));
    }

    @Test
    @DisplayName("알림 상세 조회 - 성공 및 실패(404)")
    void getNotification_test() {
        Notification entity = createMockEntity("NT_1");
        when(notificationRepository.findById("NT_1")).thenReturn(Optional.of(entity));
        when(notificationRepository.findById("NOT_FOUND")).thenReturn(Optional.empty());

        // Success
        NotificationDto result = notificationService.getNotification("NT_1");
        assertEquals("Test Subject", result.getNtfcSj());

        // Not Found
        assertThrows(BusinessException.class, () -> notificationService.getNotification("NOT_FOUND"));
    }

    @Test
    @DisplayName("알림 생성 - 성공 (WebSocket 전송 포함)")
    void createNotification_success() {
        NotificationDto dto = NotificationDto.builder()
                .ntfcSj("Title")
                .ntfcCn("Body")
                .build();

        // When
        String id = notificationService.createNotification("user123", dto);

        // Then
        assertNotNull(id);
        assertTrue(id.startsWith("NTFC_"));
        verify(notificationRepository).save(any(Notification.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/public"), any(NotificationDto.class));
        verify(messagingTemplate).convertAndSendToUser(eq("user123"), eq("/queue/notifications"),
                any(NotificationDto.class));
    }

    @Test
    @DisplayName("알림 생성 - WebSocket 오류 발생 시에도 서비스는 정상 작동")
    void createNotification_webSocketError_stillSuccess() {
        NotificationDto dto = NotificationDto.builder().ntfcSj("Title").build();
        doThrow(new RuntimeException("Socket error")).when(messagingTemplate).convertAndSend(anyString(),
                any(Object.class));

        // When
        String id = notificationService.createNotification("user123", dto);

        // Then
        assertNotNull(id);
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("알림 생성 - userId가 null인 경우 ToUser 전송 생략")
    void createNotification_nullUser_skipSendToUser() {
        NotificationDto dto = NotificationDto.builder().ntfcSj("Title").build();

        notificationService.createNotification(null, dto);

        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("알림 수정 - 성공 및 실패(404)")
    void updateNotification_test() {
        Notification entity = createMockEntity("NT_1");
        when(notificationRepository.findById("NT_1")).thenReturn(Optional.of(entity));
        when(notificationRepository.findById("NOT_FOUND")).thenReturn(Optional.empty());

        NotificationDto dto = NotificationDto.builder()
                .ntfcSj("New Subject")
                .build();

        // Success
        notificationService.updateNotification("NT_1", "user123", dto);

        // Not Found
        assertThrows(BusinessException.class, () -> notificationService.updateNotification("NOT_FOUND", "user", dto));
    }

    @Test
    @DisplayName("알림 삭제 - 성공")
    void deleteNotification_success() {
        notificationService.deleteNotification("NT_1");
        verify(notificationRepository).deleteById("NT_1");
    }

    @Test
    @Disabled("페이지네이션 버전으로 변경됨")
    @DisplayName("활성 알림 목록 조회 - 성공")
    void getActiveNotifications_success() {
        when(notificationRepository.findAll()).thenReturn(List.of(createMockEntity("NT_1")));

        List<NotificationDto> result = notificationService.getActiveNotificationsAll();

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("읽지 않은 알림 수 조회 - 성공")
    void getUnreadCount_ReturnsCount() {
        when(notificationRepository.countByRcvrIdAndReadYn("USER01", "N")).thenReturn(5L);

        long count = notificationService.getUnreadCount("USER01");

        assertEquals(5L, count);
        verify(notificationRepository).countByRcvrIdAndReadYn("USER01", "N");
    }

    @Test
    @DisplayName("알림 읽음 처리 - 성공")
    void markAsRead_success() {
        Notification entity = org.mockito.Mockito.spy(createMockEntity("NT_1"));
        when(notificationRepository.findById("NT_1")).thenReturn(Optional.of(entity));

        notificationService.markAsRead("NT_1");

        verify(entity).markAsRead();

        // When not found - should not throw, just nothing happens
        when(notificationRepository.findById("MISSING")).thenReturn(Optional.empty());
        notificationService.markAsRead("MISSING");
    }
}
