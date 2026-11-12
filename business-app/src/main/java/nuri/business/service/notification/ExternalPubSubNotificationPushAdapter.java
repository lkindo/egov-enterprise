package nuri.business.service.notification;

import lombok.extern.slf4j.Slf4j;
import nuri.foundation.core.notification.NotificationPushPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 외부 Pub/Sub 확장 어댑터(Wave 4, {@code nuri.notification.push.type=external}). 이 노드의 STOMP 브로커로 보내고, 같은 알림을 외부
 * 발행 엔드포인트({@code publish-url})에 HMAC-SHA256 서명({@code X-Nuri-Signature: sha256=<hex>})으로 낸다 — 다른 노드·다른 소비자가
 * 외부 브로커에서 구독해 받는다.
 *
 * <p>외부 발행은 덧붙임이다: 실패해도 이 노드 전달과 알림 원장은 그대로이고(경고만 남긴다), 화면은 60초 재조회로 받는다. 그래서
 * 재시도로 이 노드에 같은 알림을 두 번 보내지 않는다. 발행 주소는 https 여야 하고(루프백 http 는 시험용) 서명 비밀은 32자 이상이어야
 * 기동한다. 본문에는 받는 사람 esntlId·목적지·알림 내용이 담기므로 외부 엔드포인트는 개인정보 처리 위탁 범위에서 운영한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "nuri.notification.push", name = "type", havingValue = "external")
public class ExternalPubSubNotificationPushAdapter implements NotificationPushPort {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper mapper;
    private final HttpClient http;
    private final URI publishUrl;
    private final byte[] secret;

    /** 운영 생성자 — 생성자가 둘이라 주입 대상을 밝힌다(시험 생성자는 HttpClient 를 받는다). */
    @org.springframework.beans.factory.annotation.Autowired
    public ExternalPubSubNotificationPushAdapter(SimpMessagingTemplate messagingTemplate, ObjectMapper mapper,
            @Value("${nuri.notification.push.external.publish-url:}") String publishUrl,
            @Value("${nuri.notification.push.external.secret:}") String secret) {
        this(messagingTemplate, mapper, HttpClient.newBuilder().connectTimeout(TIMEOUT)
                .followRedirects(HttpClient.Redirect.NEVER).build(), publishUrl, secret);
    }

    ExternalPubSubNotificationPushAdapter(SimpMessagingTemplate messagingTemplate, ObjectMapper mapper, HttpClient http,
            String publishUrl, String secret) {
        this.messagingTemplate = messagingTemplate;
        this.mapper = mapper;
        this.http = http;
        this.publishUrl = validatedUrl(publishUrl);
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("외부 알림 발행 서명 비밀은 32자 이상이어야 합니다.");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public void pushToUser(String receiver, String destination, Object payload) {
        messagingTemplate.convertAndSendToUser(receiver, destination, payload);
        try {
            Map<String, Object> envelope = new LinkedHashMap<>();
            envelope.put("receiver", receiver);
            envelope.put("destination", destination);
            envelope.put("payload", payload);
            byte[] body = mapper.writeValueAsBytes(envelope);
            HttpRequest request = HttpRequest.newBuilder(publishUrl).timeout(TIMEOUT)
                    .header("Content-Type", "application/json")
                    .header("X-Nuri-Signature", "sha256=" + sign(body))
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body)).build();
            int status = http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            if (status / 100 != 2) {
                log.warn("[NotificationPush] external publish rejected: status={}", status);
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            log.warn("[NotificationPush] external publish interrupted");
        } catch (Exception failure) {
            log.warn("[NotificationPush] external publish failed ({})", failure.getClass().getSimpleName());
        }
    }

    String sign(byte[] body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(body));
        } catch (java.security.GeneralSecurityException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private static URI validatedUrl(String value) {
        URI uri;
        try {
            uri = URI.create(value == null ? "" : value.trim());
        } catch (IllegalArgumentException invalid) {
            throw new IllegalStateException("외부 알림 발행 주소가 URL 이 아닙니다.");
        }
        boolean https = "https".equals(uri.getScheme());
        boolean loopbackHttp = "http".equals(uri.getScheme())
                && ("127.0.0.1".equals(uri.getHost()) || "localhost".equals(uri.getHost()));
        if (uri.getHost() == null || (!https && !loopbackHttp)) {
            throw new IllegalStateException("외부 알림 발행 주소는 https 여야 합니다.");
        }
        return uri;
    }
}
