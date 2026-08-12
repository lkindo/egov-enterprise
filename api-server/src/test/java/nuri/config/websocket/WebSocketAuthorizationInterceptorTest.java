package nuri.config.websocket;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class WebSocketAuthorizationInterceptorTest {

    private final WebSocketAuthorizationInterceptor interceptor = new WebSocketAuthorizationInterceptor();

    @Test
    @DisplayName("익명 STOMP CONNECT는 HTTP 경계를 우회하더라도 거부")
    void anonymousConnectIsDenied() {
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(message(StompCommand.CONNECT, null, false), mock(org.springframework.messaging.MessageChannel.class)));
    }

    @Test
    @DisplayName("인증 사용자는 개인 큐와 대시보드 통계만 구독 가능")
    void authenticatedUserCanSubscribeOnlyToExplicitDestinations() {
        var channel = mock(org.springframework.messaging.MessageChannel.class);

        assertDoesNotThrow(() -> interceptor.preSend(
                message(StompCommand.SUBSCRIBE, "/user/queue/notifications", true), channel));
        assertDoesNotThrow(() -> interceptor.preSend(
                message(StompCommand.SUBSCRIBE, "/topic/dashboard/stats", true), channel));
    }

    @Test
    @DisplayName("공용·타사용자·broker 직접 구독 공격 경로는 모두 거부")
    void crossUserAndPublicSubscriptionsAreDenied() {
        var channel = mock(org.springframework.messaging.MessageChannel.class);
        for (String destination : List.of(
                "/topic/public",
                "/topic/notifications",
                "/queue/notifications",
                "/user/victim/queue/notifications",
                "/user/**")) {
            assertThrows(AccessDeniedException.class,
                    () -> interceptor.preSend(message(StompCommand.SUBSCRIBE, destination, true), channel),
                    destination);
        }
    }

    @Test
    @DisplayName("인증 사용자도 SEND로 접속자 수나 broker 메시지를 조작할 수 없음")
    void allClientSendsAreDenied() {
        var channel = mock(org.springframework.messaging.MessageChannel.class);
        for (String destination : List.of("/app/user.connect", "/topic/dashboard/stats", "/user/queue/notifications")) {
            assertThrows(AccessDeniedException.class,
                    () -> interceptor.preSend(message(StompCommand.SEND, destination, true), channel),
                    destination);
        }
    }

    private static Message<byte[]> message(StompCommand command, String destination, boolean authenticated) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setSessionId("session-1");
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (authenticated) {
            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    "USR_001",
                    "",
                    List.of(new SimpleGrantedAuthority("ROLE_USER"))));
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
