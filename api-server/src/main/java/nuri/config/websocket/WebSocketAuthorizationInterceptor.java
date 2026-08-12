package nuri.config.websocket;

import java.security.Principal;
import java.util.Set;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * STOMP 클라이언트 인바운드 경계.
 *
 * <p>HTTP 핸드셰이크 인증만으로는 충분하지 않다. 인증된 클라이언트도 broker destination 문자열을
 * 임의로 제시할 수 있으므로, 개인 큐 우회({@code /user/{victim}/...}), 공용 알림 topic, broker 직접
 * SEND를 모두 기본 거부한다. 서버가 발행하는 메시지는 client inbound 채널을 지나지 않는다.
 */
@Component
public class WebSocketAuthorizationInterceptor implements ChannelInterceptor {

    private static final Set<String> ALLOWED_SUBSCRIPTIONS = Set.of(
            "/user/queue/notifications",
            "/topic/dashboard/stats");

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        // STOMP heartbeat는 command/destination이 없고 상태를 바꾸거나 데이터를 읽지 않는다.
        if (command == null) {
            return message;
        }

        Authentication authentication = authenticated(accessor.getUser());
        if (authentication == null) {
            throw new AccessDeniedException("Authenticated WebSocket principal required");
        }

        return switch (command) {
            case CONNECT, DISCONNECT, UNSUBSCRIBE, ACK, NACK -> message;
            case SUBSCRIBE -> authorizeSubscription(accessor.getDestination(), message);
            // 클라이언트가 broker/app destination으로 상태를 조작하지 못하게 SEND는 전부 거부한다.
            // 접속자 통계는 SessionConnected/SessionDisconnect 이벤트로 서버가 계산한다.
            default -> throw new AccessDeniedException("STOMP command is not allowed: " + command);
        };
    }

    private static Message<?> authorizeSubscription(String destination, Message<?> message) {
        if (destination != null && ALLOWED_SUBSCRIPTIONS.contains(destination)) {
            return message;
        }
        throw new AccessDeniedException("STOMP subscription destination is not allowed");
    }

    private static Authentication authenticated(Principal principal) {
        if (!(principal instanceof Authentication authentication)
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return authentication;
    }
}
