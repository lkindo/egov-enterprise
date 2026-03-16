package com.company.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.boot.builder.SpringApplicationBuilder;
import com.company.project.core.config.FullBeanNameGenerator;

/**
 * 프로젝트 메인 애플리케이션 클래스
 */
@SpringBootApplication(nameGenerator = FullBeanNameGenerator.class)
@ComponentScan(basePackages = { "com.company.project", "egovframework",
                "org.egovframe" }, nameGenerator = FullBeanNameGenerator.class, excludeFilters = {
                                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                                                org.egovframe.rte.fdl.security.config.EgovSecurityConfiguration.class,
                                                org.egovframe.rte.fdl.crypto.config.EgovCryptoConfiguration.class,
                                                org.egovframe.rte.fdl.access.config.EgovAccessConfiguration.class
                                }),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Test$"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*TestConfig.*"),

                                // 보안 및 권한 관리 (web 패키지 제외)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.ram\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.gmt\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.rmt\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uat\\.uap\\.web\\..*"),

                                // 시스템 관리 (sym) 모듈 - 배치 및 백업 제외 (modern 컨트롤러 사용)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.bat\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.sym\\.bak\\..*"),

                                // 공통코드 관리 (sym.ccm)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.ccm\\..*"),

                                // 로그 관리 (sym.log)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.log\\..*"),

                                // 메뉴 관리 (sym.mnu)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.mpm\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.mcm\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.bmm\\.web\\..*"),

                                // 프로그램 관리 (sym.prm)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.prm\\.web\\..*"),

                                // 협업 관리 (cop) - 메일 및 게시판 관리 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.cop\\.com\\.web\\..*"),

                                // 사용자 권한 관리 (uss) - 레거시 컨트롤러 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.umt\\.web\\.EgovUserManageController"),
                                // 설문 및 기타 관리 (uss.olp, uss.olh 등)
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
