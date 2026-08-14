package nuri.business.domain.notification;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

class NotificationDomainTest {

    @Test
    @DisplayName("Notification Entity Creation and Initialization Test")
    void notification_builder_test() {
        // Given
        LocalDateTime before = LocalDateTime.now();
        
        // When - use builder to trigger custom constructor logic
        Notification ntfc = Notification.builder()
                .notiSn(1L)
                .notiTtlNm("Title")
                .notiCn("Content")
                .rcvrId("user1")
                .linkUrl("/home")
                .build();
        ntfc.setCrtDt(LocalDateTime.now());
        ntfc.setMdfcnDt(LocalDateTime.now());
        
        // Then
        assertEquals(1L, ntfc.getNotiSn());
        assertEquals("Title", ntfc.getNotiTtlNm());
        assertEquals("Content", ntfc.getNotiCn());
        assertEquals("user1", ntfc.getRcvrId());
        assertEquals("/home", ntfc.getLinkUrl());
        assertEquals("N", ntfc.getReadYn());
        assertNotNull(ntfc.getCrtDt());
        assertNotNull(ntfc.getMdfcnDt());
        assertTrue(ntfc.getCrtDt().isAfter(before.minusSeconds(1)));
    }

    @Test
    @DisplayName("Notification Status Update and Read Processing Test")
    void notification_update_test() {
        // Given
        Notification ntfc = Notification.builder()
                .notiSn(1L)
                .build();
        
        // When - mark as read
        ntfc.markAsRead();
        assertEquals("Y", ntfc.getReadYn());
        
        // When - update content
        ntfc.update("New Sj", "New Cn", null, null);
        assertEquals("New Sj", ntfc.getNotiTtlNm());
        assertEquals("New Cn", ntfc.getNotiCn());
    }
}
