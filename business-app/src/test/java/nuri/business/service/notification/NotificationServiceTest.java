package nuri.business.service.notification;

import nuri.business.domain.notification.Notification;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.notification.dto.NotificationDispatchRequest;
import nuri.business.service.notification.dto.NotificationDto;
import nuri.business.service.user.UserContactService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
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

    @Mock
    private UserContactService userContactService;

    @Mock
    private nuri.foundation.core.job.DurableWorkPort durableWork;

    @org.mockito.Spy
    tools.jackson.databind.ObjectMapper objectMapper = new tools.jackson.databind.ObjectMapper();

    @org.mockito.Spy
    nuri.business.service.notification.dto.NotificationMapper notificationMapper = new nuri.business.service.notification.dto.NotificationMapperImpl();

    @InjectMocks
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        lenient().when(durableWork.enqueueOnce(any(), anyString(), any())).thenAnswer(call ->
                new nuri.foundation.core.job.DurableWork(call.getArgument(0), call.getArgument(1),
                        call.<java.util.function.Supplier<String>>getArgument(2).get()));
    }

    private Notification createMockEntity(Long id) {
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
        when(notificationRepository.searchNotificationsByReceiver("user123", "test", null, pageable))
                .thenReturn(new PageImpl<>(List.of(createMockEntity(1L))));

        Page<NotificationDto> result = notificationService.getNotificationList("user123", " test ", "", pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(notificationRepository).searchNotificationsByReceiver("user123", "test", null, pageable);
    }

    @Test
    @DisplayName("[DIP B4 P2] 읽음 조건이 Y·N 이 아니면 조건을 버리지 않고 거부한다")
    void getNotificationList_rejectsUnknownReadFilter() {
        PageRequest pageable = PageRequest.of(0, 10);
        BusinessException error = assertThrows(BusinessException.class,
                () -> notificationService.getNotificationList("user123", null, "unread", pageable));
        assertEquals(CommonErrorCode.INVALID_INPUT_VALUE, error.getErrorCode());
        verify(notificationRepository, never()).searchNotificationsByReceiver(any(), any(), any(), any());
    }

    @Test
    @DisplayName("알림 상세 조회 - 성공 및 실패(404)")
    void getNotification_test() {
        Notification entity = createMockEntity(1L);
        when(notificationRepository.findByNotiSnAndRcvrId(1L, "user123")).thenReturn(Optional.of(entity));
        when(notificationRepository.findByNotiSnAndRcvrId(99L, "user123")).thenReturn(Optional.empty());

        // Success
        NotificationDto result = notificationService.getNotification(1L, "user123");
        assertEquals("Test Subject", result.getNotiTtlNm());

        // Not Found
        assertThrows(BusinessException.class,
                () -> notificationService.getNotification(99L, "user123"));
    }

    @Test
    @DisplayName("알림 생성은 행과 전달 의도를 저장하고 WebSocket은 호출하지 않는다")
    void createNotification_success() {
        NotificationDto dto = NotificationDto.builder()
                .notiTtlNm("Title")
                .notiCn("Body")
                .build();
        when(notificationRepository.save(any(Notification.class)))
                .thenReturn(createMockEntity(1L));

        // When
        Long id = notificationService.createNotification("user123", dto);

        // Then
        assertNotNull(id);
        assertEquals(1L, id);
        verify(notificationRepository).save(any(Notification.class));
        verify(durableWork).enqueueOnce(any(), eq(NotificationDeliveryWorkHandler.TYPE), any());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    @DisplayName("전달 의도 저장 실패는 호출자까지 전파된다")
    void createNotification_intentPersistenceFailureIsPropagated() {
        NotificationDto dto = NotificationDto.builder().notiTtlNm("Title").build();
        doThrow(new IllegalStateException("intent storage unavailable")).when(durableWork).enqueueOnce(any(), anyString(), any());

        // When
        assertThrows(IllegalStateException.class, () -> notificationService.createNotification("user123", dto));
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    @DisplayName("알림 생성 - 인증 사용자 ID가 없으면 저장·전송하지 않고 거부")
    void createNotification_nullUser_rejected() {
        NotificationDto dto = NotificationDto.builder().notiTtlNm("Title").build();

        assertThrows(BusinessException.class, () -> notificationService.createNotification(null, dto));

        verify(notificationRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test void replayReturnsExistingIdWithoutRecreatingRowAndChecksOriginalRequestFingerprint() {
        var event = new nuri.foundation.core.event.NotificationRequestedEvent("user123", "title", "content", "/note");
        var stored = new nuri.foundation.core.job.DurableWork(NotificationDeliveryIntent.key(event), NotificationDeliveryWorkHandler.TYPE,
                objectMapper.writeValueAsString(new NotificationDeliveryIntent(77L, "user123", NotificationDeliveryIntent.fingerprint(event))));
        doReturn(stored).when(durableWork).enqueueOnce(any(), anyString(), any());
        assertEquals(77L, notificationService.createForEvent(event));
        var different = new nuri.foundation.core.event.NotificationRequestedEvent(event.eventId(), "user123", "changed", "content", "/note");
        assertThrows(IllegalStateException.class, () -> notificationService.createForEvent(different));
        verify(notificationRepository, never()).save(any());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    @DisplayName("알림 수정 - 성공 및 실패(404)")
    void updateNotification_test() {
        Notification entity = createMockEntity(1L);
        when(notificationRepository.findByNotiSnAndRcvrId(1L, "user123")).thenReturn(Optional.of(entity));
        when(notificationRepository.findByNotiSnAndRcvrId(99L, "user")).thenReturn(Optional.empty());

        NotificationDto dto = NotificationDto.builder()
                .notiTtlNm("New Subject")
                .build();

        // Success
        notificationService.updateNotification(1L, "user123", dto);

        // Not Found
        assertThrows(BusinessException.class, () -> notificationService.updateNotification(99L, "user", dto));
    }

    @Test
    @DisplayName("알림 삭제 - 성공")
    void deleteNotification_success() {
        Notification entity = createMockEntity(1L);
        when(notificationRepository.findByNotiSnAndRcvrId(1L, "user123"))
                .thenReturn(Optional.of(entity));

        notificationService.deleteNotification(1L, "user123");

        verify(notificationRepository).delete(entity);
    }

    @Test
    @Disabled("페이지네이션 버전으로 변경됨")
    @DisplayName("활성 알림 목록 조회 - 성공")
    void getActiveNotifications_success() {
        when(notificationRepository.findAll()).thenReturn(List.of(createMockEntity(1L)));

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
        Notification entity = org.mockito.Mockito.spy(createMockEntity(1L));
        when(notificationRepository.findByNotiSnAndRcvrId(1L, "user123")).thenReturn(Optional.of(entity));

        notificationService.markAsRead(1L, "user123");

        verify(entity).markAsRead();

        when(notificationRepository.findByNotiSnAndRcvrId(99L, "user123")).thenReturn(Optional.empty());
        assertThrows(BusinessException.class,
                () -> notificationService.markAsRead(99L, "user123"));
    }

    @Test
    @DisplayName("다른 사용자의 알림 ID는 상세·읽음·삭제 모두 404로 은닉")
    void foreignNotification_isNeverAccessibleById() {
        Notification foreign = Notification.builder()
                .notiSn(77L)
                .rcvrId("victim")
                .notiTtlNm("victim-only")
                .build();
        when(notificationRepository.findByNotiSnAndRcvrId(77L, "attacker"))
                .thenReturn(Optional.empty());
        lenient().when(notificationRepository.findById(77L)).thenReturn(Optional.of(foreign));

        BusinessException read = assertThrows(BusinessException.class,
                () -> notificationService.getNotification(77L, "attacker"));
        BusinessException mark = assertThrows(BusinessException.class,
                () -> notificationService.markAsRead(77L, "attacker"));
        BusinessException delete = assertThrows(BusinessException.class,
                () -> notificationService.deleteNotification(77L, "attacker"));

        assertEquals(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND, read.getErrorCode());
        assertEquals(read.getErrorCode(), mark.getErrorCode());
        assertEquals(read.getErrorCode(), delete.getErrorCode());
        verify(notificationRepository, never()).findById(77L);
        verify(notificationRepository, never()).delete(any(Notification.class));
    }

    // ---------------------------------------------------------------------------------------------
    // [2026-09-06 DEC-OPS-042] 관리자 알림 발송 — 인가·수신자 존재 확인·건수.
    // ---------------------------------------------------------------------------------------------

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private static void authenticateAs(String loginId, String role) {
        CustomUserDetails principal = nuri.business.support.AuthorizationTestPrincipal.principal(loginId, "ESNTL_" + loginId, role);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);
    }

    private static NotificationDispatchRequest dispatchRequest(String... esntlIds) {
        return NotificationDispatchRequest.builder()
                .recipients(java.util.Arrays.stream(esntlIds)
                        .map(id -> NotificationDispatchRequest.Recipient.builder().esntlId(id).build())
                        .toList())
                .notiTtlNm("점검 안내")
                .notiCn("9월 7일 02:00 시스템 점검")
                .linkUrl("/admin/notifications")
                .build();
    }

    @Test
    @DisplayName("관리자 발송은 해석된 수신자마다 알림 행을 만들고 건수를 돌려준다")
    void dispatchToUsers_createsOnePerRecipient() {
        authenticateAs("admin_actor", "ADMIN");
        when(userContactService.resolve(List.of("U1", "U2"))).thenReturn(List.of(
                new UserContactService.UserContact("U1", "홍길동", null, null),
                new UserContactService.UserContact("U2", "김철수", null, null)));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification entity = invocation.getArgument(0);
            return Notification.builder()
                    .notiSn(1L)
                    .notiTtlNm(entity.getNotiTtlNm())
                    .notiCn(entity.getNotiCn())
                    .rcvrId(entity.getRcvrId())
                    .linkUrl(entity.getLinkUrl())
                    .build();
        });

        int created = notificationService.dispatchToUsers(dispatchRequest("U1", "U2"));

        assertEquals(2, created);
        org.mockito.ArgumentCaptor<Notification> captor = org.mockito.ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(2)).save(captor.capture());
        assertEquals(List.of("U1", "U2"), captor.getAllValues().stream().map(Notification::getRcvrId).toList());
        assertTrue(captor.getAllValues().stream().allMatch(n -> "점검 안내".equals(n.getNotiTtlNm())));
    }

    @Test
    @DisplayName("수신자 중 하나라도 존재하지 않으면 전체를 거부하고 아무 행도 만들지 않는다")
    void dispatchToUsers_rejectsAllWhenAnyRecipientIsUnknown() {
        authenticateAs("admin_actor", "ADMIN");
        when(userContactService.resolve(any())).thenThrow(
                new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "수신자로 지정한 사용자를 찾을 수 없습니다."));

        BusinessException error = assertThrows(BusinessException.class,
                () -> notificationService.dispatchToUsers(dispatchRequest("U1", "NOPE")));

        assertEquals(CommonErrorCode.RESOURCE_NOT_FOUND, error.getErrorCode());
        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("일반 사용자는 관리자 URL 을 우회해도 서비스에서 발송할 수 없다")
    void dispatchToUsers_rejectsNonAdmin() {
        authenticateAs("ordinary_user", "USER");

        BusinessException error = assertThrows(BusinessException.class,
                () -> notificationService.dispatchToUsers(dispatchRequest("U1")));

        assertEquals(CommonErrorCode.ACCESS_DENIED, error.getErrorCode());
        verify(userContactService, never()).resolve(any());
        verify(notificationRepository, never()).save(any());
    }
}
