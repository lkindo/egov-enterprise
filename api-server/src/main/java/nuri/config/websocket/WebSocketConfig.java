package nuri.config.websocket;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final List<String> allowedOrigins;
    private final WebSocketAuthorizationInterceptor authorizationInterceptor;

    public WebSocketConfig(
            @Value("${cors.allowed-origins}") List<String> allowedOrigins,
            WebSocketAuthorizationInterceptor authorizationInterceptor) {
        this.allowedOrigins = allowedOrigins == null
                ? List.of()
                : allowedOrigins.stream().map(String::trim).filter(origin -> !origin.isBlank()).toList();
        if (this.allowedOrigins.isEmpty() || this.allowedOrigins.contains("*")) {
            throw new IllegalStateException("WebSocket allowed origins must be an explicit non-empty allow-list");
        }
        this.authorizationInterceptor = authorizationInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {

        // Enable a simple memory-based message broker to send messages to clients on destinations prefixed with /topic

        config.enableSimpleBroker("/topic", "/queue");

        // Designate the /app prefix for messages that are bound for methods annotated with @MessageMapping

        config.setApplicationDestinationPrefixes("/app");

        // User-specific notifications prefix

        config.setUserDestinationPrefix("/user");

    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authorizationInterceptor);
    }

    public void registerStompEndpoints(StompEndpointRegistry registry) {

        // Register the /ws endpoint, enabling the SockJS fallback options

        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOrigins.toArray(String[]::new))
                .withSockJS();

    }

}
