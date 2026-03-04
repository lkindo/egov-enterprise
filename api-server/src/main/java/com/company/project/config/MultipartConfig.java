package com.company.project.config;

import org.springframework.boot.autoconfigure.web.servlet.MultipartProperties;

import org.springframework.boot.context.properties.EnableConfigurationProperties;

import org.springframework.context.annotation.Bean;

import org.springframework.context.annotation.Configuration;

import org.springframework.web.multipart.MultipartResolver;

import org.springframework.web.multipart.support.StandardServletMultipartResolver;

import jakarta.servlet.MultipartConfigElement;

@Configuration

@EnableConfigurationProperties(MultipartProperties.class)

public class MultipartConfig {

    private final MultipartProperties multipartProperties;

    public MultipartConfig(MultipartProperties multipartProperties) {

        this.multipartProperties = multipartProperties;

    }

    @Bean

    public MultipartResolver multipartResolver() {

        StandardServletMultipartResolver multipartResolver = new StandardServletMultipartResolver();

        multipartResolver.setResolveLazily(false);

        return multipartResolver;

    }

    @Bean

    public MultipartConfigElement multipartConfigElement() {

        return this.multipartProperties.createMultipartConfig();

    }

}