package nuri.business.service.notification;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import nuri.foundation.core.event.NotificationRequestedEvent;

/** Durable payload contains references and a request fingerprint, never notification text. */
record NotificationDeliveryIntent(Long notificationId, String receiver, String fingerprint) {
    NotificationDeliveryIntent {
        if (notificationId == null || notificationId < 1 || receiver == null || receiver.isBlank()
                || receiver.length() > 20 || fingerprint == null || !fingerprint.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Invalid notification delivery reference");
        }
    }

    static UUID key(NotificationRequestedEvent event) {
        byte[] digest = digest("nuri.notification.v1", event.eventId().toString(), event.receiverEsntlId());
        ByteBuffer bytes = ByteBuffer.wrap(digest);
        return new UUID(bytes.getLong(), bytes.getLong());
    }

    static String fingerprint(NotificationRequestedEvent event) {
        return HexFormat.of().formatHex(digest(event.receiverEsntlId(), event.title(), event.content(), event.linkUrl()));
    }

    private static byte[] digest(String... values) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            for (String value : values) {
                byte[] bytes = value == null ? null : value.getBytes(StandardCharsets.UTF_8);
                digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(bytes == null ? -1 : bytes.length).array());
                if (bytes != null) digest.update(bytes);
            }
            return digest.digest();
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required", impossible);
        }
    }
}
