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
                                // NOTE: sym 패키지 활성화 - IdGnrService 빈 등록 완료 (2026-01-05)
                                // 1. 기술적 문제(Quartz)로 인한 제외 (전체 제외 유지)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.bat\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.sym\\.bak\\..*"),

                                // 2. 모던 컨트롤러와 충돌나는 컨트롤러만 제외 (.web 패키지 한정)
                                // CCM: zip, ccc, cca, cde
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.ccm\\.zip\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.ccm\\.ccc\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.ccm\\.cca\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.ccm\\.cde\\.web\\..*"),

                                // LOG: clg(로그인)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.log\\.clg\\.web\\..*"),

                                // MNU: mpm(메뉴관리), mcm(메뉴생성)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.mpm\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.mcm\\.web\\..*"),

                                // PRM: prm(프로그램)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.prm\\.web\\..*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sts\\.cst\\.web\\..*"),
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
