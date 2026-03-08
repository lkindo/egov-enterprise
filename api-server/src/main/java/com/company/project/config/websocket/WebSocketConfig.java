package com.company.project.config.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@Profile("!test")
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

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

    public void registerStompEndpoints(StompEndpointRegistry registry) {

        // Register the /ws endpoint, enabling the SockJS fallback options

        registry.addEndpoint("/ws")

                .setAllowedOriginPatterns("*") // In production, replace with specific origins

                .withSockJS();

    }

}
