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

    @org.mockito.Spy
    nuri.business.service.notification.dto.NotificationMapper notificationMapper = new nuri.business.service.notification.dto.NotificationMapperImpl();

    @InjectMocks
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private Notification createMockEntity(String id) {
        return Notification.builder()
                .notiSn(id)
                .notiTtlNm("Test Subject")
                .notiCn("Test Content")
                .rcvrId("user123")
                .linkUrl("/test")
                .build();
    }

    @Test
    @DisplayName("알림 목록 조회 - 성공")
    void getNotificationList_success() {
        PageRequest pageable = PageRequest.of(0, 10);
        when(notificationRepository.searchNotificationsByReceiver("user123", "test", pageable))
                .thenReturn(new PageImpl<>(List.of(createMockEntity("NT_1"))));

        Page<NotificationDto> result = notificationService.getNotificationList("user123", "test", pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(notificationRepository).searchNotificationsByReceiver("user123", "test", pageable);
    }

    @Test
    @DisplayName("알림 상세 조회 - 성공 및 실패(404)")
    void getNotification_test() {
        Notification entity = createMockEntity("NT_1");
        when(notificationRepository.findByNotiSnAndRcvrId("NT_1", "user123")).thenReturn(Optional.of(entity));
        when(notificationRepository.findByNotiSnAndRcvrId("NOT_FOUND", "user123")).thenReturn(Optional.empty());

        // Success
        NotificationDto result = notificationService.getNotification("NT_1", "user123");
        assertEquals("Test Subject", result.getNotiTtlNm());

        // Not Found
        assertThrows(BusinessException.class,
                () -> notificationService.getNotification("NOT_FOUND", "user123"));
    }

    @Test
    @DisplayName("알림 생성 - 성공 (WebSocket 전송 포함)")
    void createNotification_success() {
        NotificationDto dto = NotificationDto.builder()
                .notiTtlNm("Title")
                .notiCn("Body")
                .build();

        // When
        String id = notificationService.createNotification("user123", dto);

        // Then
        assertNotNull(id);
        assertTrue(id.startsWith("NTFC_"));
        verify(notificationRepository).save(any(Notification.class));
        verify(messagingTemplate).convertAndSendToUser(eq("user123"), eq("/queue/notifications"),
                any(NotificationDto.class));
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/public"), any(NotificationDto.class));
    }

    @Test
    @DisplayName("알림 생성 - WebSocket 오류 발생 시에도 서비스는 정상 작동")
    void createNotification_webSocketError_stillSuccess() {
        NotificationDto dto = NotificationDto.builder().notiTtlNm("Title").build();
        doThrow(new RuntimeException("Socket error")).when(messagingTemplate)
                .convertAndSendToUser(eq("user123"), eq("/queue/notifications"), any(Object.class));

        // When
        String id = notificationService.createNotification("user123", dto);

        // Then
        assertNotNull(id);
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("알림 생성 - 인증 사용자 ID가 없으면 저장·전송하지 않고 거부")
    void createNotification_nullUser_rejected() {
        NotificationDto dto = NotificationDto.builder().notiTtlNm("Title").build();

        assertThrows(BusinessException.class, () -> notificationService.createNotification(null, dto));

        verify(notificationRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("알림 수정 - 성공 및 실패(404)")
    void updateNotification_test() {
        Notification entity = createMockEntity("NT_1");
        when(notificationRepository.findByNotiSnAndRcvrId("NT_1", "user123")).thenReturn(Optional.of(entity));
        when(notificationRepository.findByNotiSnAndRcvrId("NOT_FOUND", "user")).thenReturn(Optional.empty());

        NotificationDto dto = NotificationDto.builder()
                .notiTtlNm("New Subject")
                .build();

        // Success
        notificationService.updateNotification("NT_1", "user123", dto);

        // Not Found
        assertThrows(BusinessException.class, () -> notificationService.updateNotification("NOT_FOUND", "user", dto));
    }

    @Test
    @DisplayName("알림 삭제 - 성공")
    void deleteNotification_success() {
        Notification entity = createMockEntity("NT_1");
        when(notificationRepository.findByNotiSnAndRcvrId("NT_1", "user123"))
                .thenReturn(Optional.of(entity));

        notificationService.deleteNotification("NT_1", "user123");

        verify(notificationRepository).delete(entity);
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
        when(notificationRepository.findByNotiSnAndRcvrId("NT_1", "user123")).thenReturn(Optional.of(entity));

        notificationService.markAsRead("NT_1", "user123");

        verify(entity).markAsRead();

        when(notificationRepository.findByNotiSnAndRcvrId("MISSING", "user123")).thenReturn(Optional.empty());
        assertThrows(BusinessException.class,
                () -> notificationService.markAsRead("MISSING", "user123"));
    }

    @Test
    @DisplayName("다른 사용자의 알림 ID는 상세·읽음·삭제 모두 404로 은닉")
    void foreignNotification_isNeverAccessibleById() {
        Notification foreign = Notification.builder()
                .notiSn("FOREIGN")
                .rcvrId("victim")
                .notiTtlNm("victim-only")
                .build();
        when(notificationRepository.findByNotiSnAndRcvrId("FOREIGN", "attacker"))
                .thenReturn(Optional.empty());
        lenient().when(notificationRepository.findById("FOREIGN")).thenReturn(Optional.of(foreign));

        BusinessException read = assertThrows(BusinessException.class,
                () -> notificationService.getNotification("FOREIGN", "attacker"));
        BusinessException mark = assertThrows(BusinessException.class,
                () -> notificationService.markAsRead("FOREIGN", "attacker"));
        BusinessException delete = assertThrows(BusinessException.class,
                () -> notificationService.deleteNotification("FOREIGN", "attacker"));

        assertEquals(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND, read.getErrorCode());
        assertEquals(read.getErrorCode(), mark.getErrorCode());
        assertEquals(read.getErrorCode(), delete.getErrorCode());
        verify(notificationRepository, never()).findById("FOREIGN");
        verify(notificationRepository, never()).delete(any(Notification.class));
    }
}
