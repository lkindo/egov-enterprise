package com.company.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.boot.builder.SpringApplicationBuilder;

@EnableJpaAuditing
@EntityScan(basePackages = "com.company.project")
@EnableJpaRepositories(basePackages = "com.company.project")
@SpringBootApplication
@ComponentScan(basePackages = { "com.company.project", "egovframework",
                "org.egovframe" }, excludeFilters = {
                                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                                                org.egovframe.rte.fdl.security.config.EgovSecurityConfiguration.class }),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\..*\\.web\\..*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uat\\.uap\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\..*\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sts\\..*\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.cop\\..*\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\..*\\.web\\..*")
                })

public class ApiServerApplication extends SpringBootServletInitializer {

        @Override
        protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
                return application.sources(ApiServerApplication.class);
        }

        @org.springframework.context.annotation.Bean
        public egovframework.com.cmm.util.EgovUserDetailsHelper egovUserDetailsHelper(
                        egovframework.com.cmm.service.EgovUserDetailsService egovUserDetailsService) {
                egovframework.com.cmm.util.EgovUserDetailsHelper helper = new egovframework.com.cmm.util.EgovUserDetailsHelper();
                helper.setEgovUserDetailsService(egovUserDetailsService);
                return helper;
        }

        public static void main(String[] args) {
                SpringApplication app = new SpringApplication(ApiServerApplication.class);
                app.setAllowCircularReferences(true);
                app.run(args);
        }
}
