package nuri.config.websocket;

import java.security.Principal;
import java.util.Set;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AccountStatusUserDetailsChecker;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

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

    private final UserDetailsService userDetailsService;
    private final Map<String, SessionAuthorization> sessions = new ConcurrentHashMap<>();
    private final Map<String, WebSocketSession> transports = new ConcurrentHashMap<>();

    public WebSocketAuthorizationInterceptor(UserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor original = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        // Spring keeps its session-principal update callback on the accessor, outside the header map.
        // Preserve that callback when the inbound accessor is mutable; wrap only immutable test/messages.
        StompHeaderAccessor accessor = original != null && original.isMutable()
                ? original : StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        // STOMP heartbeat는 command/destination이 없고 상태를 바꾸거나 데이터를 읽지 않는다.
        if (command == null) {
            return message;
        }

        String sessionId = accessor.getSessionId();
        if (sessionId == null || sessionId.isBlank()) {
            throw new AccessDeniedException("WebSocket session is required");
        }
        if (command == StompCommand.DISCONNECT) {
            closeSession(sessionId, CloseStatus.NORMAL);
            return message;
        }
        Authentication authentication = authenticated(accessor.getUser());
        if (authentication == null) {
            closeRevokedSession(sessionId);
            throw new AccessDeniedException("Authenticated WebSocket principal required");
        }
        if (command == StompCommand.CONNECT) {
            try {
                CustomUserDetails current = loadCurrent(authentication.getName());
                sessions.put(sessionId, new SessionAuthorization(current.getUsername(), current.getAuthorizationVersion()));
                accessor.setUser(new UsernamePasswordAuthenticationToken(current, null, current.getAuthorities()));
                return MessageBuilder.createMessage(message.getPayload(), accessor.getMessageHeaders());
            } catch (RuntimeException denied) {
                closeRevokedSession(sessionId);
                throw denied;
            }
        }

        // HTTP 인증 당시 principal이나 연결 시점의 permission을 계속 신뢰하지 않는다.
        requireUnchangedAuthorization(sessionId);
        return switch (command) {
            case UNSUBSCRIBE, ACK, NACK -> message;
            case SUBSCRIBE -> authorizeSubscription(accessor.getDestination(), message);
            // 클라이언트의 broker/app 직접 SEND는 이전과 같이 전부 거부한다.
            default -> throw new AccessDeniedException("STOMP command is not allowed: " + command);
        };
    }

    /** 서버에서 보내는 개인 알림·topic 데이터도 수신 세션별 현재 권한을 확인한다. */
    public ChannelInterceptor outboundInterceptor() {
        return new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                if (SimpMessageHeaderAccessor.getMessageType(message.getHeaders()) != SimpMessageType.MESSAGE) {
                    return message;
                }
                String sessionId = SimpMessageHeaderAccessor.getSessionId(message.getHeaders());
                try {
                    requireUnchangedAuthorization(sessionId);
                    return message;
                } catch (RuntimeException denied) {
                    // 한 수신자의 회수/저장소 장애가 다른 수신자에게 보내는 publish를 실패시키지 않는다.
                    // 메시지는 전달하지 않고 해당 연결을 종료한다. 재연결은 현재 권한으로 다시 인증한다.
                    return null;
                }
            }
        };
    }

    public void trackTransport(WebSocketSession session) {
        transports.put(session.getId(), session);
    }

    public void forgetSession(String sessionId) {
        if (sessionId != null) {
            sessions.remove(sessionId);
            transports.remove(sessionId);
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        forgetSession(event.getSessionId());
    }

    private void requireUnchangedAuthorization(String sessionId) {
        try {
            SessionAuthorization connected = sessionId == null ? null : sessions.get(sessionId);
            if (connected == null) {
                throw new AccessDeniedException("Authenticated WebSocket session required");
            }
            CustomUserDetails current = loadCurrent(connected.subject());
            if (!connected.version().equals(current.getAuthorizationVersion())) {
                throw new AccessDeniedException("WebSocket authorization changed; reconnect required");
            }
        } catch (RuntimeException denied) {
            closeRevokedSession(sessionId);
            throw denied;
        }
    }

    private CustomUserDetails loadCurrent(String subject) {
        var loaded = userDetailsService.loadUserByUsername(subject);
        if (!(loaded instanceof CustomUserDetails current)
                || subject == null || !subject.equals(current.getUsername())
                || current.getAuthorizationVersion() == null || current.getAuthorizationVersion().isBlank()) {
            throw new AccessDeniedException("Current WebSocket authorization is unavailable");
        }
        new AccountStatusUserDetailsChecker().check(current);
        return current;
    }

    private void closeRevokedSession(String sessionId) {
        closeSession(sessionId, CloseStatus.POLICY_VIOLATION);
    }

    private void closeSession(String sessionId, CloseStatus status) {
        if (sessionId == null) {
            return;
        }
        sessions.remove(sessionId);
        WebSocketSession transport = transports.remove(sessionId);
        if (transport != null) {
            try {
                transport.close(status);
            } catch (java.io.IOException ignored) {
                // 전송 연결이 먼저 닫혀도 session grant는 위에서 이미 제거됐다.
            }
        }
    }

    private record SessionAuthorization(String subject, String version) {}

    private static Message<?> authorizeSubscription(String destination, Message<?> message) {
        if (destination != null && ALLOWED_SUBSCRIPTIONS.contains(destination)) {
            return message;
        }
        throw new AccessDeniedException("STOMP subscription destination is not allowed");
    }

    private static Authentication authenticated(Principal principal) {
        if (!(principal instanceof Authentication authentication)
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || !(authentication.getPrincipal() instanceof CustomUserDetails current)
                || !current.isEnabled() || !current.isAccountNonLocked()) {
            return null;
        }
        return authentication;
    }
}
