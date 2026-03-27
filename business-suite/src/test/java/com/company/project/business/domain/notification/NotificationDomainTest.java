package com.company.project.business.domain.notification;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

class NotificationDomainTest {

    @Test
    @DisplayName("Notification 엔티티 생성 및 초기화 테스트")
    void notification_builder_test() {
        // Given
        LocalDateTime before = LocalDateTime.now();
        
        // When - use builder to trigger custom constructor logic
        Notification ntfc = Notification.builder()
                .ntfcNo("NT1")
                .ntfcSj("Title")
                .ntfcCn("Content")
                .receiverId("user1")
                .linkUrl("/home")
                .build();
        
        // Then
        assertEquals("NT1", ntfc.getNtfcNo());
        assertEquals("Title", ntfc.getNtfcSj());
        assertEquals("Content", ntfc.getNtfcCn());
        assertEquals("user1", ntfc.getReceiverId());
        assertEquals("/home", ntfc.getLinkUrl());
        assertEquals("N", ntfc.getIsRead());
        assertNotNull(ntfc.getCreatedDate());
        assertNotNull(ntfc.getLastModifiedDate());
        assertTrue(ntfc.getCreatedDate().isAfter(before.minusSeconds(1)));
    }

    @Test
    @DisplayName("Notification 상태 업데이트 및 읽음 처리 테스트")
    void notification_update_test() {
        // Given
        Notification ntfc = Notification.builder()
                .ntfcNo("NT1")
                .build();
        
        // When - mark as read
        ntfc.markAsRead();
        assertEquals("Y", ntfc.getIsRead());
        
        // When - update content
        ntfc.update("New Sj", "New Cn", null, null);
        assertEquals("New Sj", ntfc.getNtfcSj());
        assertEquals("New Cn", ntfc.getNtfcCn());
    }
}
