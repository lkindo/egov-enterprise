package nuri.config.websocket;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import nuri.foundation.security.mfa.MfaSessionEvidence;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.simp.user.DefaultUserDestinationResolver;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.messaging.support.ExecutorSubscribableChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.CredentialsExpiredException;
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
    void activeAccountWithoutGroupsCanConnectButCannotSubscribeOrReceiveProtectedData() {
        CustomUserDetails current = CustomUserDetails.builder().esntlId("USR_001")
                .groups(List.of()).permissions(List.of()).enabled(true).authorizationVersion("empty-v1").build();
        Message<?> connected = connect(current);
        var auth = (UsernamePasswordAuthenticationToken) StompHeaderAccessor.wrap(connected).getUser();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isSameAs(current);
        assertThat(auth.getAuthorities()).isEmpty();
        for (String destination : List.of("/user/queue/notifications", "/topic/dashboard/stats")) {
            assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.SUBSCRIBE, destination, true), channel))
                    .isInstanceOf(AccessDeniedException.class);
        }
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
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
        subscribeNotifications();
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNotNull();
    }

    @Test
    void outboundRechecksRevocationWithoutWaitingForClientMessage() throws Exception {
        connect(current("v1", true, "N"));
        subscribeNotifications();
        WebSocketSession transport = trackTransport();
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(current("v2", true, "N"));
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
        verify(transport).close(CloseStatus.POLICY_VIOLATION);
    }

    @Test
    void lockedDisabledOrUnavailableAccountNeverReceivesPublishedData() throws Exception {
        for (CustomUserDetails rejected : List.of(current("v1", true, "Y"), current("v1", false, "N"))) {
            connect(current("v1", true, "N"));
            subscribeNotifications();
            WebSocketSession transport = trackTransport();
            when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(rejected);
            assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
            verify(transport).close(CloseStatus.POLICY_VIOLATION);
        }
        connect(current("v1", true, "N"));
        subscribeNotifications();
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

    @ParameterizedTest
    @ValueSource(strings = {"NOTI_READ", "DASHBOARD_READ"})
    void eachDestinationRequiresItsOwnCurrentPermission(String permission) {
        var principal = principal(List.of(permission), null, false, null);
        connect(principal);
        String allowed = "NOTI_READ".equals(permission) ? "/user/queue/notifications" : "/topic/dashboard/stats";
        String denied = "NOTI_READ".equals(permission) ? "/topic/dashboard/stats" : "/user/queue/notifications";
        assertThat(interceptor.preSend(message(StompCommand.SUBSCRIBE, allowed, true), channel)).isNotNull();
        assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.SUBSCRIBE, denied, true), channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void outboundChecksCurrentPermissionEvenWhenAuthorizationVersionDidNotChange() throws Exception {
        connect(current("v1", true, "N"));
        subscribeNotifications();
        var transport = trackTransport();
        when(userDetailsService.loadUserByUsername("USR_001"))
                .thenReturn(principal(List.of("DASHBOARD_READ"), null, false, null));
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
        verify(transport).close(CloseStatus.POLICY_VIOLATION);
    }

    @Test
    void connectAckCanPassButDataNeedsARegisteredSubscription() {
        connect(current("v1", true, "N"));
        var accessor = SimpMessageHeaderAccessor.create(SimpMessageType.CONNECT_ACK);
        accessor.setSessionId("session-1");
        var ack = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        assertThat(interceptor.outboundInterceptor().preSend(ack, channel)).isSameAs(ack);
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " "})
    void blankSubscriptionIdsCannotRegister(String subscriptionId) {
        connect(current("v1", true, "N"));
        assertThatThrownBy(() -> interceptor.preSend(
                message(StompCommand.SUBSCRIBE, "/user/queue/notifications", true, subscriptionId), channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void missingSubscriptionIdsCannotRegisterOrReceiveData() {
        connect(current("v1", true, "N"));
        assertThatThrownBy(() -> interceptor.preSend(
                message(StompCommand.SUBSCRIBE, "/user/queue/notifications", true, null), channel))
                .isInstanceOf(AccessDeniedException.class);
        subscribeNotifications();
        assertThat(interceptor.outboundInterceptor().preSend(outbound(null, "/queue/notifications-usersession-1"), channel)).isNull();
    }

    @Test
    void duplicateSubscriptionIdCannotReplaceItsDestination() {
        connect(current("v1", true, "N"));
        subscribeNotifications();
        for (String destination : List.of("/user/queue/notifications", "/topic/dashboard/stats")) {
            assertThatThrownBy(() -> interceptor.preSend(
                    message(StompCommand.SUBSCRIBE, destination, true, "notifications"), channel))
                    .isInstanceOf(AccessDeniedException.class);
        }
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNotNull();
        assertThat(interceptor.outboundInterceptor().preSend(outbound("notifications", "/topic/dashboard/stats"), channel)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/queue/notifications-usersession-2", "/queue/notifications-usersession-1/extra",
            "/queue/notifications-usersession-1evil", "/user/queue/notifications", "/topic/dashboard/stats"})
    void privateSubscriptionRejectsOtherPhysicalDestinations(String destination) {
        connect(current("v1", true, "N"));
        subscribeNotifications();
        assertThat(interceptor.outboundInterceptor().preSend(outbound("notifications", destination), channel)).isNull();
    }

    @Test
    void unsubscribeAndSessionCleanupRemovePreviouslyAuthorizedDelivery() {
        connect(current("v1", true, "N"));
        subscribeNotifications();
        interceptor.preSend(message(StompCommand.UNSUBSCRIBE, null, true), channel);
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();

        connect(current("v1", true, "N"));
        subscribeNotifications();
        interceptor.forgetSession("session-1");
        var nextOwner = CustomUserDetails.builder().esntlId("USR_002").enabled(true)
                .groups(List.of()).permissions(List.of("NOTI_READ")).authorizationVersion("v1").build();
        when(userDetailsService.loadUserByUsername("USR_002")).thenReturn(nextOwner);
        interceptor.preSend(connectMessage(nextOwner, null), channel);
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
    }

    @Test
    void duplicateConnectCannotReplaceAnExistingSession() throws Exception {
        connect(current("v1", true, "N"));
        subscribeNotifications();
        var transport = trackTransport();
        assertThatThrownBy(() -> connect(current("v1", true, "N"))).isInstanceOf(AccessDeniedException.class);
        verify(transport).close(CloseStatus.POLICY_VIOLATION);
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
    }

    @Test
    void connectPreservesVerifiedHttpMfaEvidenceAndAllowsValidSubscription() {
        var principal = principal(List.of("NOTI_READ"), "mfa-v1", true, null);
        var evidence = new MfaSessionEvidence("mfa-v1", Instant.now().minusSeconds(10));
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(principal);
        var connected = interceptor.preSend(connectMessage(principal, evidence), channel);
        var canonical = (UsernamePasswordAuthenticationToken) StompHeaderAccessor.wrap(connected).getUser();
        assertThat(canonical).isNotNull();
        assertThat(canonical.getDetails()).isSameAs(evidence);
        subscribeNotifications();
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNotNull();
    }

    @Test
    void missingStaleOrFutureMfaProofCannotConnectAndNativeHeadersCannotSupplyIt() {
        var principal = principal(List.of("NOTI_READ"), "mfa-v1", true, null);
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(principal);
        var forged = StompHeaderAccessor.wrap(connectMessage(principal, null));
        forged.setNativeHeader("mfa_v", "mfa-v1");
        forged.setNativeHeader("mfa_at", Long.toString(Instant.now().minusSeconds(10).getEpochSecond()));
        assertThatThrownBy(() -> interceptor.preSend(MessageBuilder.createMessage(new byte[0], forged.getMessageHeaders()), channel))
                .isInstanceOf(CredentialsExpiredException.class);
        for (var evidence : List.of(new MfaSessionEvidence("mfa-v0", Instant.now().minusSeconds(10)),
                new MfaSessionEvidence("mfa-v1", null), new MfaSessionEvidence("mfa-v1", Instant.now().plusSeconds(120)))) {
            assertThatThrownBy(() -> interceptor.preSend(connectMessage(principal, evidence), channel))
                    .isInstanceOf(CredentialsExpiredException.class);
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void mfaRecoveryOrDisableInvalidatesBothInboundAndOutbound(boolean outbound) throws Exception {
        var principal = principal(List.of("NOTI_READ"), "mfa-v1", true, null);
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(principal);
        interceptor.preSend(connectMessage(principal, new MfaSessionEvidence("mfa-v1", Instant.now().minusSeconds(10))), channel);
        subscribeNotifications();
        var transport = trackTransport();
        when(userDetailsService.loadUserByUsername("USR_001"))
                .thenReturn(principal(List.of("NOTI_READ"), "mfa-v2", true, null));
        if (outbound) {
            assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
        } else {
            assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.ACK, null, true), channel))
                    .isInstanceOf(CredentialsExpiredException.class);
        }
        verify(transport).close(CloseStatus.POLICY_VIOLATION);
    }

    @Test
    void newlyRequiredMfaCannotUpgradeAnExistingPasswordOnlyConnection() {
        connect(principal(List.of("NOTI_READ"), null, false, null));
        subscribeNotifications();
        when(userDetailsService.loadUserByUsername("USR_001"))
                .thenReturn(principal(List.of("NOTI_READ"), null, true, null));
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
    }

    @Test
    void disablingMfaInvalidatesPreviouslyVerifiedConnection() {
        var principal = principal(List.of("NOTI_READ"), "mfa-v1", true, null);
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(principal);
        interceptor.preSend(connectMessage(principal, new MfaSessionEvidence("mfa-v1", Instant.now().minusSeconds(10))), channel);
        subscribeNotifications();
        when(userDetailsService.loadUserByUsername("USR_001"))
                .thenReturn(principal(List.of("NOTI_READ"), null, false, null));
        assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
    }

    @Test
    void passwordChangeBetweenHttpHandshakeAndConnectIsDenied() {
        var before = principal(List.of("NOTI_READ"), null, false, null);
        when(userDetailsService.loadUserByUsername("USR_001"))
                .thenReturn(principal(List.of("NOTI_READ"), null, false, Instant.parse("2026-09-28T01:00:00Z")));
        assertThatThrownBy(() -> interceptor.preSend(connectMessage(before, null), channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void passwordChangeRevokesMfaConnectionEvenWithSameAuthorizationAndMfaVersion(boolean outbound) throws Exception {
        for (Instant initial : new Instant[] {null, Instant.parse("2026-09-28T00:00:00Z")}) {
            var before = principal(List.of("NOTI_READ"), "mfa-v1", true, initial);
            when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(before);
            interceptor.preSend(connectMessage(before, new MfaSessionEvidence("mfa-v1", Instant.now().minusSeconds(10))), channel);
            subscribeNotifications();
            assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNotNull();
            var transport = trackTransport();
            when(userDetailsService.loadUserByUsername("USR_001"))
                    .thenReturn(principal(List.of("NOTI_READ"), "mfa-v1", true, Instant.parse("2026-09-28T01:00:00Z")));
            if (outbound) {
                assertThat(interceptor.outboundInterceptor().preSend(outbound(), channel)).isNull();
            } else {
                assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.ACK, null, true), channel))
                        .isInstanceOf(AccessDeniedException.class);
            }
            verify(transport).close(CloseStatus.POLICY_VIOLATION);
        }
    }

    @Test
    void realSpringResolverAndBrokerPreserveSubscriptionBindingBeforeOutboundChecks() {
        var inbound = new ExecutorSubscribableChannel();
        var outbound = new ExecutorSubscribableChannel();
        var brokerChannel = new ExecutorSubscribableChannel();
        var received = new ArrayList<Message<?>>();
        outbound.addInterceptor(interceptor.outboundInterceptor());
        outbound.subscribe(received::add);
        var registry = new MessageBrokerRegistry(inbound, outbound) {
            SimpleBrokerMessageHandler broker() { return getSimpleBroker(brokerChannel); }
            String userPrefix() { return getUserDestinationPrefix(); }
        };
        new WebSocketConfig(List.of("https://app.example.test"), interceptor).configureMessageBroker(registry);
        var broker = registry.broker();
        assertThat(broker).isNotNull();
        assertThat(broker.getDestinationPrefixes()).containsExactly("/topic", "/queue");
        var resolver = new DefaultUserDestinationResolver(mock(SimpUserRegistry.class));
        resolver.setUserDestinationPrefix(registry.userPrefix());
        assertThat(resolver.getDestinationPrefix()).isEqualTo("/user/");
        // Spring keeps the leading slash for the application's slash-prefixed broker destinations.
        assertThat(resolver.isRemoveLeadingSlash()).isFalse();
        broker.start();
        try {
            broker.handleMessage(connect(current("v1", true, "N")));
            assertThat(received).hasSize(1);
            assertThat(SimpMessageHeaderAccessor.getMessageType(received.getFirst().getHeaders())).isEqualTo(SimpMessageType.CONNECT_ACK);
            received.clear();
            var subscribe = interceptor.preSend(message(StompCommand.SUBSCRIBE, "/user/queue/notifications", true), channel);
            var resolved = resolver.resolveDestination(subscribe);
            assertThat(resolved).isNotNull();
            assertThat(resolved.getTargetDestinations()).containsExactly("/queue/notifications-usersession-1");
            var translated = StompHeaderAccessor.wrap(subscribe);
            translated.setDestination(resolved.getTargetDestinations().iterator().next());
            broker.handleMessage(MessageBuilder.createMessage(subscribe.getPayload(), translated.getMessageHeaders()));
            broker.handleMessage(interceptor.preSend(message(StompCommand.SUBSCRIBE, "/topic/dashboard/stats", true), channel));
            broker.handleMessage(publication("/queue/notifications-usersession-1"));
            broker.handleMessage(publication("/topic/dashboard/stats"));
            assertThat(received).hasSize(2);
            assertThat(SimpMessageHeaderAccessor.getSubscriptionId(received.get(0).getHeaders())).isEqualTo("notifications");
            assertThat(SimpMessageHeaderAccessor.getSubscriptionId(received.get(1).getHeaders())).isEqualTo("dashboard");
            when(userDetailsService.loadUserByUsername("USR_001"))
                    .thenReturn(principal(List.of("NOTI_READ"), null, false, null));
            broker.handleMessage(publication("/topic/dashboard/stats"));
            assertThat(received).hasSize(2);
        } finally {
            broker.stop();
        }
    }

    private static Message<byte[]> publication(String destination) {
        var accessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
        accessor.setDestination(destination);
        return MessageBuilder.createMessage(new byte[] {1}, accessor.getMessageHeaders());
    }

    private static CustomUserDetails principal(List<String> permissions, String mfaVersion, boolean mfaRequired, Instant changedAt) {
        return CustomUserDetails.builder().esntlId("USR_001").enabled(true).lockAt("N").groups(List.of())
                .permissions(permissions).authorizationVersion("v1").credentialsChangedAt(changedAt)
                .mfaCredentialVersion(mfaVersion).mfaRequired(mfaRequired).build();
    }

    private Message<?> connect(CustomUserDetails current) {
        when(userDetailsService.loadUserByUsername("USR_001")).thenReturn(current);
        return interceptor.preSend(connectMessage(current, null), channel);
    }

    private WebSocketSession trackTransport() {
        WebSocketSession transport = mock(WebSocketSession.class);
        when(transport.getId()).thenReturn("session-1");
        interceptor.trackTransport(transport);
        return transport;
    }

    private static CustomUserDetails current(String version, boolean enabled, String lockAt) {
        return CustomUserDetails.builder().esntlId("USR_001").enabled(enabled).lockAt(lockAt)
                .groups(List.of("CONTENT")).permissions(List.of("NOTI_READ", "DASHBOARD_READ"))
                .authorizationVersion(version).build();
    }

    private static Message<byte[]> outbound() {
        return outbound("notifications", "/queue/notifications-usersession-1");
    }

    private static Message<byte[]> outbound(String subscriptionId, String destination) {
        var accessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
        accessor.setSessionId("session-1");
        accessor.setSubscriptionId(subscriptionId);
        accessor.setDestination(destination);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static Message<byte[]> message(StompCommand command, String destination, boolean authenticated) {
        return message(command, destination, authenticated,
                "/topic/dashboard/stats".equals(destination) ? "dashboard" : "notifications");
    }

    private static Message<byte[]> message(StompCommand command, String destination, boolean authenticated, String subscriptionId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setSessionId("session-1");
        if (command == StompCommand.SUBSCRIBE || command == StompCommand.UNSUBSCRIBE) {
            accessor.setSubscriptionId(subscriptionId);
        }
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (authenticated) {
            accessor.setUser(new UsernamePasswordAuthenticationToken(current("v1", true, "N"), "", List.of()));
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private void subscribeNotifications() {
        interceptor.preSend(message(StompCommand.SUBSCRIBE, "/user/queue/notifications", true), channel);
    }

    private static Message<byte[]> connectMessage(CustomUserDetails handshake, MfaSessionEvidence evidence) {
        var accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionId("session-1");
        var authentication = new UsernamePasswordAuthenticationToken(handshake, "", handshake.getAuthorities());
        authentication.setDetails(evidence);
        accessor.setUser(authentication);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
