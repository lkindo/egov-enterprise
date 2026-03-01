package com.company.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.boot.builder.SpringApplicationBuilder;
import com.company.project.config.FullBeanNameGenerator;

/**
 * ?�로?�트 메인 ?�플리�??�션 ?�래?? */
@SpringBootApplication
@ComponentScan(basePackages = { "com.company.project", "egovframework",
                "org.egovframe" }, nameGenerator = FullBeanNameGenerator.class, excludeFilters = {
                                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                                                org.egovframe.rte.fdl.security.config.EgovSecurityConfiguration.class,
                                                org.egovframe.rte.fdl.crypto.config.EgovCryptoConfiguration.class
                                }),

                                // 보안 �?권한 관�?(web ?�키지 ?�외)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.ram\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.gmt\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.rmt\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uat\\.uap\\.web\\..*"),

                                // ?�스??관�?sym) 모듈 - 배치 �?백업 ?�외 (modern 컨트롤러 ?�용)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.bat\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.sym\\.bak\\..*"),

                                // 공통코드 관�?(sym.ccm)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.ccm\\..*"),

                                // 로그 관�?(sym.log)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.log\\..*"),

                                // 메뉴 관�?(sym.mnu)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.mpm\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.mcm\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.bmm\\.web\\..*"),

                                // ?�로그램 관�?(sym.prm)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.prm\\.web\\..*"),

                                // ?�업 관�?(cop) - 메일 �?게시??관???�외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.cop\\.com\\.web\\..*"),

                                // ?�용??권한 관�?(uss) - ?�거??컨트롤러 ?�외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.umt\\.web\\.EgovUserManageController"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.uas\\.web\\.EgovUserAbsnceController"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.uas\\.web\\.EgovUserAbsenceManageController.*"),

                                // ?�문 �?기�? 관�?(uss.olp, uss.olh ??
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.olp\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.olh\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.rss\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.rsm\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.ntr\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.ntm\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.noi\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.ctn\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.evt\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.nts\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\..*")
                })
public class ApiServerApplication extends SpringBootServletInitializer {

        @Override
        protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
                return application.sources(ApiServerApplication.class);
        }

        public static void main(String[] args) {
                SpringApplication app = new SpringApplication(ApiServerApplication.class);
                app.setAllowCircularReferences(true);
                app.setAllowBeanDefinitionOverriding(true);
                app.run(args);
        }

        @org.springframework.context.annotation.Bean
        public org.egovframe.rte.fdl.crypto.EgovEnvCryptoService egovEnvCryptoService() {
                return new org.egovframe.rte.fdl.crypto.impl.EgovEnvCryptoServiceImpl();
        }
}
