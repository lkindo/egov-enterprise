package com.company.project.api.config;

import egovframework.com.ext.oauth.service.OAuthVO;

import org.springframework.context.annotation.Bean;

import org.springframework.context.annotation.Configuration;

@Configuration

public class EgovOAuthConfig {

    @Bean

    public OAuthVO naverAuthVO() {

        return new OAuthVO("naver", "dummy-client-id", "dummy-client-secret",

                "http://localhost:8080/auth/naver/callback", "profile");

    }

    @Bean

    public OAuthVO googleAuthVO() {

        return new OAuthVO("google", "dummy-client-id", "dummy-client-secret",

                "http://localhost:8080/auth/google/callback", "profile");

    }

    @Bean

    public OAuthVO kakaoAuthVO() {

        return new OAuthVO("kakao", "dummy-client-id", "dummy-client-secret",

                "http://localhost:8080/auth/kakao/callback", "profile");

    }

}

