package nuri.business.service.notification;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/** [Wave 4] 외부 Pub/Sub 어댑터 — 이 노드 전달은 늘 하고, 외부 발행은 HMAC 서명으로 덧붙이며, 실패해도 전달을 깨지 않는다. */
class ExternalPubSubNotificationPushAdapterTest {

    private static final String SECRET = "s".repeat(32);
    private HttpServer server;
    private final List<String> bodies = new CopyOnWriteArrayList<>();
    private final List<String> signatures = new CopyOnWriteArrayList<>();
    private final AtomicInteger status = new AtomicInteger(202);

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/publish", exchange -> {
            bodies.add(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            signatures.add(exchange.getRequestHeaders().getFirst("X-Nuri-Signature"));
            exchange.sendResponseHeaders(status.get(), -1);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    private ExternalPubSubNotificationPushAdapter adapter(SimpMessagingTemplate messaging, String url) {
        return new ExternalPubSubNotificationPushAdapter(messaging, new ObjectMapper(), HttpClient.newHttpClient(), url, SECRET);
    }

    @Test
    @DisplayName("이 노드에 보내고 같은 알림을 서명한 봉투로 외부에 발행한다")
    void deliversLocallyAndPublishesSignedEnvelope() {
        SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
        var adapter = adapter(messaging, "http://127.0.0.1:" + server.getAddress().getPort() + "/publish");

        adapter.pushToUser("ESNTL_1", "/queue/notifications", Map.of("notiSn", 7));

        verify(messaging).convertAndSendToUser("ESNTL_1", "/queue/notifications", Map.of("notiSn", 7));
        assertThat(bodies).singleElement().satisfies(body -> assertThat(body)
                .contains("\"receiver\":\"ESNTL_1\"").contains("\"destination\":\"/queue/notifications\"").contains("\"notiSn\":7"));
        assertThat(signatures).singleElement()
                .isEqualTo("sha256=" + adapter.sign(bodies.getFirst().getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @DisplayName("외부 발행이 거부되거나 닿지 않아도 이 노드 전달은 이미 끝났고 예외를 던지지 않는다")
    void publishFailureDoesNotBreakLocalDelivery() {
        SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
        status.set(500);
        adapter(messaging, "http://127.0.0.1:" + server.getAddress().getPort() + "/publish")
                .pushToUser("ESNTL_1", "/queue/notifications", Map.of("notiSn", 8));
        adapter(messaging, "http://127.0.0.1:9/unreachable").pushToUser("ESNTL_1", "/queue/notifications", Map.of("notiSn", 9));
        verify(messaging).convertAndSendToUser("ESNTL_1", "/queue/notifications", Map.of("notiSn", 8));
        verify(messaging).convertAndSendToUser("ESNTL_1", "/queue/notifications", Map.of("notiSn", 9));
    }

    @Test
    @DisplayName("external 설정이면 스프링 문맥이 외부 어댑터 하나를, 비우면 기본 STOMP 어댑터 하나를 포트로 만든다")
    void springContextSelectsExactlyOneAdapterByProperty() {
        var runner = new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                .withBean(SimpMessagingTemplate.class, () -> mock(SimpMessagingTemplate.class))
                .withBean(ObjectMapper.class, ObjectMapper::new)
                .withUserConfiguration(ExternalPubSubNotificationPushAdapter.class, StompNotificationPushAdapter.class);
        runner.withPropertyValues("nuri.notification.push.type=external",
                        "nuri.notification.push.external.publish-url=https://broker.example.com/publish",
                        "nuri.notification.push.external.secret=" + SECRET)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(nuri.foundation.core.notification.NotificationPushPort.class))
                            .isInstanceOf(ExternalPubSubNotificationPushAdapter.class);
                });
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean(nuri.foundation.core.notification.NotificationPushPort.class))
                    .isInstanceOf(StompNotificationPushAdapter.class);
        });
        runner.withPropertyValues("nuri.notification.push.type=external",
                        "nuri.notification.push.external.publish-url=http://broker.example.com/publish",
                        "nuri.notification.push.external.secret=" + SECRET)
                .run(context -> assertThat(context).as("https 가 아니면 기동을 멈춘다").hasFailed());
    }

    @Test
    @DisplayName("발행 주소는 https(루프백 http 는 시험용)이고 서명 비밀은 32자 이상이어야 만든다")
    void rejectsInsecureUrlAndShortSecret() {
        SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
        assertThatThrownBy(() -> adapter(messaging, "http://broker.example.com/publish")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> adapter(messaging, "")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new ExternalPubSubNotificationPushAdapter(messaging, new ObjectMapper(), HttpClient.newHttpClient(),
                "https://broker.example.com/publish", "short")).isInstanceOf(IllegalStateException.class);
    }
}
