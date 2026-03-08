package com.company.project.service.notification;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.notification.Notification;
import com.company.project.domain.notification.NotificationRepository;
import com.company.project.service.notification.dto.NotificationDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService 테스트")
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private NotificationService notificationService;

    @Nested
    @DisplayName("알림 목록 조회 테스트")
    class GetNotificationListTests {

        @Test
        @DisplayName("키워드로 알림 목록 페이징 조회 성공")
        void testGetNotificationList_Success() {
            // Given
            String keyword = "test";
            Pageable pageable = PageRequest.of(0, 10);

            Notification notification1 = Notification.builder()
                    .ntfcNo("NTFC_001")
                    .ntfcSj("알림 제목 1")
                    .ntfcCn("알림 내용 1")
                    .receiverId("user1")
                    .build();

            Notification notification2 = Notification.builder()
                    .ntfcNo("NTFC_002")
                    .ntfcSj("알림 제목 2")
                    .ntfcCn("알림 내용 2")
                    .receiverId("user1")
                    .build();

            Page<Notification> page = new PageImpl<>(Arrays.asList(notification1, notification2));
            when(notificationRepository.searchNotifications(keyword, pageable)).thenReturn(page);

            // When
            Page<NotificationDto> result = notificationService.getNotificationList(keyword, pageable);

            // Then
            assertNotNull(result);
            assertEquals(2, result.getContent().size());
            assertEquals("NTFC_001", result.getContent().get(0).getNtfcNo());
            verify(notificationRepository, times(1)).searchNotifications(keyword, pageable);
        }

        @Test
        @DisplayName("키워드가 null 인 경우 전체 조회")
        void testGetNotificationList_NullKeyword() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Notification> page = new PageImpl<>(List.of());
            when(notificationRepository.searchNotifications(null, pageable)).thenReturn(page);

            // When
            Page<NotificationDto> result = notificationService.getNotificationList(null, pageable);

            // Then
            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("개별 알림 조회 테스트")
    class GetNotificationTests {

        @Test
        @DisplayName("알림 번호로 단일 알림 조회 성공")
        void testGetNotification_Success() {
            // Given
            String ntfcNo = "NTFC_001";
            Notification notification = Notification.builder()
                    .ntfcNo(ntfcNo)
                    .ntfcSj("알림 제목")
                    .ntfcCn("알림 내용")
                    .receiverId("user1")
                    .build();

            when(notificationRepository.findById(ntfcNo)).thenReturn(Optional.of(notification));

            // When
            NotificationDto result = notificationService.getNotification(ntfcNo);

            // Then
            assertNotNull(result);
            assertEquals(ntfcNo, result.getNtfcNo());
            assertEquals("알림 제목", result.getNtfcSj());
        }

        @Test
        @DisplayName("존재하지 않는 알림 조회 시 예외 발생")
        void testGetNotification_NotFound() {
            // Given
            String ntfcNo = "NOT_EXIST";
            when(notificationRepository.findById(ntfcNo)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                notificationService.getNotification(ntfcNo);
            });
            assertEquals(ErrorCode.RESOURCE_NOT_FOUND,
                    assertThrows(BusinessException.class, () -> notificationService.getNotification(ntfcNo))
                            .getErrorCode());
        }

        @Test
        @DisplayName("null 알림 번호로 조회 시 NullPointerException 발생")
        void testGetNotification_NullId() {
            // When & Then
            assertThrows(NullPointerException.class, () -> {
                notificationService.getNotification(null);
            });
        }
    }

    @Nested
    @DisplayName("알림 생성 테스트")
    class CreateNotificationTests {

        @Test
        @DisplayName("새로운 알림 생성 및 WebSocket 전송 성공")
        void testCreateNotification_Success() {
            // Given
            String userId = "user1";
            NotificationDto dto = new NotificationDto();
            ReflectionTestUtils.setField(dto, "ntfcSj", "새 알림 제목");
            ReflectionTestUtils.setField(dto, "ntfcCn", "새 알림 내용");
            ReflectionTestUtils.setField(dto, "uniqId", "/link/url");

            Notification savedNotification = Notification.builder()
                    .ntfcNo("NTFC_" + String.format("%013d", System.currentTimeMillis()))
                    .ntfcSj(dto.getNtfcSj())
                    .ntfcCn(dto.getNtfcCn())
                    .receiverId(userId)
                    .linkUrl(dto.getUniqId())
                    .build();

            doReturn(savedNotification).when(notificationRepository).save(any(Notification.class));

            // When
            String result = notificationService.createNotification(userId, dto);

            // Then
            assertNotNull(result);
            assertTrue(result.startsWith("NTFC_"));
            verify(notificationRepository, times(1)).save(any(Notification.class));
            verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/public"), any(NotificationDto.class));
            verify(messagingTemplate, times(1)).convertAndSendToUser(eq(userId), eq("/queue/notifications"),
                    any(NotificationDto.class));
        }

        @Test
        @DisplayName("userId 가 null 인 경우에도 알림 생성 성공")
        void testCreateNotification_NullUserId() {
            // Given
            NotificationDto dto = new NotificationDto();
            ReflectionTestUtils.setField(dto, "ntfcSj", "제목");
            ReflectionTestUtils.setField(dto, "ntfcCn", "내용");

            Notification savedNotification = Notification.builder()
                    .ntfcNo("NTFC_001")
                    .ntfcSj("제목")
                    .ntfcCn("내용")
                    .build();

            doReturn(savedNotification).when(notificationRepository).save(any(Notification.class));

            // When
            String result = notificationService.createNotification(null, dto);

            // Then
            assertNotNull(result);
            verify(notificationRepository, times(1)).save(any(Notification.class));
            verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/public"), any(NotificationDto.class));
            // userId 가 null 이므로 convertAndSendToUser 는 호출되지 않음
            verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
        }
    }

    @Nested
    @DisplayName("알림 수정 테스트")
    class UpdateNotificationTests {

        @Test
        @DisplayName("알림 정보 수정 성공")
        void testUpdateNotification_Success() {
            // Given
            String ntfcNo = "NTFC_001";
            String userId = "user1";
            NotificationDto dto = new NotificationDto();
            ReflectionTestUtils.setField(dto, "ntfcSj", "수정된 제목");
            ReflectionTestUtils.setField(dto, "ntfcCn", "수정된 내용");

            Notification existing = Notification.builder()
                    .ntfcNo(ntfcNo)
                    .ntfcSj("원래 제목")
                    .ntfcCn("원래 내용")
                    .receiverId(userId)
                    .build();

            lenient().when(notificationRepository.findById(ntfcNo)).thenReturn(Optional.of(existing));

            // When
            notificationService.updateNotification(ntfcNo, userId, dto);

            // Then
            verify(notificationRepository, times(1)).findById(ntfcNo);
        }

        @Test
        @DisplayName("존재하지 않는 알림 수정 시 예외 발생")
        void testUpdateNotification_NotFound() {
            // Given
            String ntfcNo = "NOT_EXIST";
            NotificationDto dto = new NotificationDto();
            when(notificationRepository.findById(ntfcNo)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                notificationService.updateNotification(ntfcNo, "user1", dto);
            });
        }
    }

    @Nested
    @DisplayName("알림 삭제 테스트")
    class DeleteNotificationTests {

        @Test
        @DisplayName("알림 삭제 성공")
        void testDeleteNotification_Success() {
            // Given
            String ntfcNo = "NTFC_001";
            doNothing().when(notificationRepository).deleteById(ntfcNo);

            // When
            notificationService.deleteNotification(ntfcNo);

            // Then
            verify(notificationRepository, times(1)).deleteById(ntfcNo);
        }
    }

    @Nested
    @DisplayName("활성 알림 목록 조회 테스트")
    class GetActiveNotificationsTests {

        @Test
        @DisplayName("모든 활성 알림 조회 성공")
        void testGetActiveNotifications_Success() {
            // Given
            Notification notification1 = Notification.builder()
                    .ntfcNo("NTFC_001")
                    .ntfcSj("알림 1")
                    .build();

            Notification notification2 = Notification.builder()
                    .ntfcNo("NTFC_002")
                    .ntfcSj("알림 2")
                    .build();

            when(notificationRepository.findAll()).thenReturn(Arrays.asList(notification1, notification2));

            // When
            List<NotificationDto> result = notificationService.getActiveNotifications();

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            verify(notificationRepository, times(1)).findAll();
        }

        @Test
        @DisplayName("활성 알림이 없을 때 빈 리스트 반환")
        void testGetActiveNotifications_Empty() {
            // Given
            when(notificationRepository.findAll()).thenReturn(List.of());

            // When
            List<NotificationDto> result = notificationService.getActiveNotifications();

            // Then
            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("읽지 않은 알림 카운트 테스트")
    class GetUnreadCountTests {

        @Test
        @DisplayName("사용자의 읽지 않은 알림 수 조회 성공")
        void testGetUnreadCount_Success() {
            // Given
            String userId = "user1";
            long expectedCount = 5L;
            when(notificationRepository.countByReceiverIdAndIsRead(userId, "N"))
                    .thenReturn(expectedCount);

            // When
            long result = notificationService.getUnreadCount(userId);

            // Then
            assertEquals(expectedCount, result);
            verify(notificationRepository, times(1)).countByReceiverIdAndIsRead(userId, "N");
        }

        @Test
        @DisplayName("읽지 않은 알림이 없을 때 0 반환")
        void testGetUnreadCount_Zero() {
            // Given
            String userId = "user1";
            when(notificationRepository.countByReceiverIdAndIsRead(userId, "N")).thenReturn(0L);

            // When
            long result = notificationService.getUnreadCount(userId);

            // Then
            assertEquals(0, result);
        }
    }

    @Nested
    @DisplayName("알림 읽음 처리 테스트")
    class MarkAsReadTests {

        @Test
        @DisplayName("알림을 읽음으로 성공적으로 표시")
        void testMarkAsRead_Success() {
            // Given
            String ntfcNo = "NTFC_001";
            Notification notification = Notification.builder()
                    .ntfcNo(ntfcNo)
                    .ntfcSj("알림 제목")
                    .build();
            // isRead 는 기본값 "N" 으로 설정됨

            when(notificationRepository.findById(ntfcNo)).thenReturn(Optional.of(notification));

            // When
            notificationService.markAsRead(ntfcNo);

            // Then
            verify(notificationRepository, times(1)).findById(ntfcNo);
            assertEquals("Y", notification.getIsRead());
        }

        @Test
        @DisplayName("존재하지 않는 알림을 읽음 처리 시 아무 작업도 하지 않음")
        void testMarkAsRead_NotFound() {
            // Given
            String ntfcNo = "NOT_EXIST";
            when(notificationRepository.findById(ntfcNo)).thenReturn(Optional.empty());

            // When
            notificationService.markAsRead(ntfcNo);

            // Then
            verify(notificationRepository, times(1)).findById(ntfcNo);
            // 예외 발생 없이 조용히 종료
        }
    }
}
