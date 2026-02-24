package com.company.project.domain.notification;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
public class NotificationRepositoryTest {

    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    public void testFindByReceiverId() {
        Notification ntfc = Notification.builder()
            .ntfcNo("TEST-001")
            .ntfcSj("Test Notification")
            .ntfcCn("Content")
            .receiverId("webmaster")
            .linkUrl("/")
            .build();
        notificationRepository.save(ntfc);

        List<Notification> result = notificationRepository.findByReceiverIdOrderByCreatedDateDesc("webmaster");
        assertThat(result).hasSize(1);
    }
}
