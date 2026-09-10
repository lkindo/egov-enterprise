package nuri.config.websocket;

import java.util.List;

import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WebSocketAuthorizationInterceptorTest {

    private final UserDetailsService userDetailsService = mock(UserDetailsService.class);
    private final WebSocketAuthorizationInterceptor interceptor = new WebSocketAuthorizationInterceptor(userDetailsService);
    private final MessageChannel channel = mock(MessageChannel.class);

    @Test
    void anonymousConnectIsDenied() {
        assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.CONNECT, null, false), channel))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(userDetailsService);
    }

    @Test
    void genericAuthenticatedNameCannotImpersonateCanonicalHttpPrincipal() throws Exception {
        var accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-1");
        accessor.setUser(new UsernamePasswordAuthenticationToken("USR_001", "", List.of()));
        WebSocketSession transport = trackTransport();
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        assertThatThrownBy(() -> interceptor.preSend(message, channel)).isInstanceOf(AccessDeniedException.class);
        verify(transport).close(CloseStatus.POLICY_VIOLATION);
        verifyNoInteractions(userDetailsService);
    }

    @Test
    void authenticatedUserCanSubscribeOnlyToExplicitDestinations() {
        connect(current("v1", true, "N"));
        for (String destination : List.of("/user/queue/notifications", "/topic/dashboard/stats")) {
            Message<?> message = message(StompCommand.SUBSCRIBE, destination, true);
            assertThat(interceptor.preSend(message, channel)).isSameAs(message);
        }
    }

    @Test
    void crossUserAndPublicSubscriptionsAreDenied() {
        connect(current("v1", true, "N"));
        for (String destination : List.of("/topic/public", "/topic/notifications", "/queue/notifications",
                "/user/victim/queue/notifications", "/user/**")) {
            assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.SUBSCRIBE, destination, true), channel))
                    .as(destination).isInstanceOf(AccessDeniedException.class);
        }
    }

    @Test
    void allClientSendsAreDenied() {
        connect(current("v1", true, "N"));
        for (String destination : List.of("/app/user.connect", "/topic/dashboard/stats", "/user/queue/notifications")) {
            assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.SEND, destination, true), channel))
                    .as(destination).isInstanceOf(AccessDeniedException.class);
        }
    }

    @Test
    void activeAccountWithoutGroupsRetainsExplicitAuthenticatedOnlySubscriptions() {
        CustomUserDetails current = CustomUserDetails.builder().esntlId("USR_001")
                .groups(List.of()).permissions(List.of()).enabled(true).authorizationVersion("empty-v1").build();
        Message<?> connected = connect(current);
        var auth = (UsernamePasswordAuthenticationToken) StompHeaderAccessor.wrap(connected).getUser();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isSameAs(current);
        assertThat(auth.getAuthorities()).isEmpty();
        assertThat(interceptor.preSend(message(StompCommand.SUBSCRIBE, "/user/queue/notifications", true), channel))
                .isNotNull();
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNotNull();
    }

    @Test
    void handshakeAuthenticationCannotBypassCurrentDisabledStateOrMissingVersion() throws Exception {
        WebSocketSession transport = trackTransport();
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(current("v1", false, "N"));
        assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.CONNECT, null, true), channel))
                .isInstanceOf(DisabledException.class);
        verify(transport).close(CloseStatus.POLICY_VIOLATION);
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(current(null, true, "N"));
        assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.CONNECT, null, true), channel))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
    }

    @Test
    void changedVersionDeniesInboundClosesTransportAndRequiresFreshConnect() throws Exception {
        connect(current("v1", true, "N"));
        WebSocketSession transport = trackTransport();
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(current("v2", true, "N"));
        assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.SUBSCRIBE, "/user/queue/notifications", true), channel))
                .isInstanceOf(AccessDeniedException.class);
        verify(transport).close(CloseStatus.POLICY_VIOLATION);
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
        connect(current("v2", true, "N"));
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNotNull();
    }

    @Test
    void outboundRechecksRevocationWithoutWaitingForClientMessage() throws Exception {
        connect(current("v1", true, "N"));
        WebSocketSession transport = trackTransport();
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(current("v2", true, "N"));
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
        verify(transport).close(CloseStatus.POLICY_VIOLATION);
    }

    @Test
    void lockedDisabledOrUnavailableAccountNeverReceivesPublishedData() throws Exception {
        for (CustomUserDetails rejected : List.of(current("v1", true, "Y"), current("v1", false, "N"))) {
            connect(current("v1", true, "N"));
            WebSocketSession transport = trackTransport();
            when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(rejected);
            assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
            verify(transport).close(CloseStatus.POLICY_VIOLATION);
        }
        connect(current("v1", true, "N"));
        WebSocketSession transport = trackTransport();
        when(userDetailsService.loadUserByUsername("USR_001"))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("unavailable"));
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
        verify(transport).close(CloseStatus.POLICY_VIOLATION);
    }

    @Test
    void unknownOrDisconnectedSessionCannotReceiveData() {
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
        connect(current("v1", true, "N"));
        interceptor.preSend(message(StompCommand.DISCONNECT, null, true), channel);
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
    }

    @Test
    void subscriptionCannotSkipConnectEvenWithAuthenticatedHttpPrincipal() {
        assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.SUBSCRIBE, "/user/queue/notifications", true), channel))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(userDetailsService);
    }

    @Test
    void connectPreservesSpringSessionPrincipalUpdateCallback() {
        CustomUserDetails current = current("v2", true, "N");
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(current);
        var accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-1");
        accessor.setUser(new UsernamePasswordAuthenticationToken(current("v1", true, "N"), "", List.of()));
        var updated = new java.util.concurrent.atomic.AtomicReference<java.security.Principal>();
        accessor.setUserChangeCallback(updated::set);
        accessor.setLeaveMutable(true);
        interceptor.preSend(MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()), channel);
        assertThat(updated.get()).isInstanceOf(UsernamePasswordAuthenticationToken.class);
        assertThat(((UsernamePasswordAuthenticationToken) updated.get()).getPrincipal()).isSameAs(current);
    }

    @Test
    void anonymousDisconnectClosesTransportWithoutPublishingData() throws Exception {
        WebSocketSession transport = trackTransport();
        interceptor.preSend(message(StompCommand.DISCONNECT, null, false), channel);
        verify(transport).close(CloseStatus.NORMAL);
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
        verifyNoInteractions(userDetailsService);
    }

    private Message<?> connect(CustomUserDetails current) {
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(current);
        return interceptor.preSend(message(StompCommand.CONNECT, null, true), channel);
    }

    private WebSocketSession trackTransport() {
        WebSocketSession transport = mock(WebSocketSession.class);
        when(transport.getId()).thenReturn("session-1");
        interceptor.trackTransport(transport);
        return transport;
    }

    private static CustomUserDetails current(String version, boolean enabled, String lockAt) {
        return CustomUserDetails.builder().esntlId("USR_001").enabled(enabled).lockAt(lockAt)
                .groups(List.of("CONTENT")).permissions(List.of("CONTENT_EDIT"))
                .authorizationVersion(version).build();
    }

    private static Message<byte[]> outbound() {
        var accessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
        accessor.setSessionId("session-1");
        accessor.setDestination("/queue/notifications-session-1");
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static Message<byte[]> message(StompCommand command, String destination, boolean authenticated) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setSessionId("session-1");
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (authenticated) {
            accessor.setUser(new UsernamePasswordAuthenticationToken(current("v1", true, "N"), "", List.of()));
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
