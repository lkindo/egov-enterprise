package com.company.project.api.config;

import org.springframework.context.annotation.Bean;

import org.springframework.context.annotation.Configuration;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.context.annotation.Profile;
import java.util.Arrays;
import java.util.List;

@Configuration
@Profile("!test")
public class EgovConfig {

    // [context-whitelist.xml] Whitelists
    @Bean
    public List<String> egovRSSWhitelist() {
        return Arrays.asList("bbs", "board");
    }

    @Bean
    public List<String> egovNextUrlWhitelist() {
        return Arrays.asList("/");
    }

    @Bean
    public List<String> egovPageLinkWhitelist() {
        return Arrays.asList("main/mainPage");
    }

    // [context-email.xml] Email Configuration
    @Bean
    public JavaMailSenderImpl mntrngMailSender() {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost("smtp.test.com");
        sender.setPort(587);
        sender.setUsername("test");
        sender.setPassword("test");
        return sender;
    }

    @Bean
    public SimpleMailMessage mntrngMessage() {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("no-reply@test.com");
        message.setSubject("Monitoring Alert");
        message.setText("System Alert");
        return message;
    }

}

