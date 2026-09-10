package nuri.config.websocket;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebSocketConfigTest {

    private final WebSocketAuthorizationInterceptor authorization = mock(WebSocketAuthorizationInterceptor.class);
    private final WebSocketConfig config = new WebSocketConfig(List.of("https://app.example.test"), authorization);

    @Test
    void bothMessageDirectionsUseAuthorizationInterceptors() {
        ChannelRegistration inbound = mock(ChannelRegistration.class);
        ChannelRegistration outbound = mock(ChannelRegistration.class);
        ChannelInterceptor outboundGuard = mock(ChannelInterceptor.class);
        when(authorization.outboundInterceptor()).thenReturn(outboundGuard);
        config.configureClientInboundChannel(inbound);
        config.configureClientOutboundChannel(outbound);
        verify(inbound).interceptors(authorization);
        verify(outbound).interceptors(outboundGuard);
    }

    @Test
    void transportLifecycleTracksRealConnectionsAndAlwaysCleansUp() throws Exception {
        WebSocketTransportRegistration registration = mock(WebSocketTransportRegistration.class);
        config.configureWebSocketTransport(registration);
        var factory = ArgumentCaptor.forClass(WebSocketHandlerDecoratorFactory.class);
        verify(registration).addDecoratorFactory(factory.capture());
        WebSocketHandler handler = mock(WebSocketHandler.class);
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("session-1");
        WebSocketHandler decorated = factory.getValue().decorate(handler);
        decorated.afterConnectionEstablished(session);
        verify(authorization).trackTransport(session);
        verify(handler).afterConnectionEstablished(session);
        doThrow(new IllegalStateException("already closed")).when(handler)
                .afterConnectionClosed(session, CloseStatus.NORMAL);
        assertThatThrownBy(() -> decorated.afterConnectionClosed(session, CloseStatus.NORMAL))
                .isInstanceOf(IllegalStateException.class);
        verify(authorization).forgetSession("session-1");
    }
}
