package com.company.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import org.springframework.context.annotation.ImportResource;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

@EnableJpaAuditing
@EntityScan(basePackages = "com.company.project")
@EnableJpaRepositories(basePackages = "com.company.project")
@SpringBootApplication
@ComponentScan(basePackages = { "com.company.project", "egovframework",
                "org.egovframe" }, excludeFilters = {
                                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                                                org.egovframe.rte.fdl.security.config.EgovSecurityConfiguration.class }),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "org\\.egovframe\\.rte\\.fdl\\.crypto\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\..*\\.web\\..*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uat\\.uap\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\..*\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sts\\..*\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.cop\\..*\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\..*\\.web\\..*")
                })
@ImportResource({ "classpath*:egovframework/spring/com/**/context-*.xml" })
public class ApiServerApplication {

        public static void main(String[] args) {
                SpringApplication app = new SpringApplication(ApiServerApplication.class);
                app.setAllowCircularReferences(true);
                app.run(args);
        }
}
