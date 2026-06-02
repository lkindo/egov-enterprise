package nuri.business.domain.notification;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

class NotificationDomainTest {

    @Test
    @DisplayName("Notification ?îÌã∞???ùÏÑ± Î∞?Ï¥àÍ∏∞???åÏä§??)
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
                .crtDt(LocalDateTime.now())
                .mdfcnDt(LocalDateTime.now())
                .build();
        
        // Then
        assertEquals("NT1", ntfc.getNtfcNo());
        assertEquals("Title", ntfc.getNtfcSj());
        assertEquals("Content", ntfc.getNtfcCn());
        assertEquals("user1", ntfc.getReceiverId());
        assertEquals("/home", ntfc.getLinkUrl());
        assertEquals("N", ntfc.getIsRead());
        assertNotNull(ntfc.getCrtDt());
        assertNotNull(ntfc.getMdfcnDt());
        assertTrue(ntfc.getCrtDt().isAfter(before.minusSeconds(1)));
    }

    @Test
    @DisplayName("Notification ?ÅÌÉú ?ÖÎç∞?¥Ìä∏ Î∞??ΩÏùå Ï≤òÎ¶¨ ?åÏä§??)
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
