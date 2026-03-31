package com.company.apiserver.config;

import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;

/**
 * OpenAPI 3.0 (Swagger) 설정
 * 
 * API 문서를 자동 생성하고, JWT 인증을 지원합니다.
 * - http://localhost:8080/swagger-ui.html
 */
@Configuration
public class OpenApiConfig {

    /**
     * 전체 API 그룹 (v1)
     */
    @Bean
    public GroupedOpenApi allApi() {
        return GroupedOpenApi.builder()
                .group("all")
                .pathsToMatch("/api/v1/**")
                .build();
    }

    /**
     * 관리자 API 그룹
     */
    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
                .group("admin")
                .pathsToMatch("/api/v1/admin/**")
                .build();
    }

    /**
     * 공통코드 API 그룹
     */
    @Bean
    public GroupedOpenApi commonCodeApi() {
        return GroupedOpenApi.builder()
                .group("common-code")
                .pathsToMatch("/api/v1/common-codes/**")
                .build();
    }

    /**
     * 사용자 API 그룹
     */
    @Bean
    public GroupedOpenApi userApi() {
        return GroupedOpenApi.builder()
                .group("user")
                .pathsToMatch("/api/v1/users/**")
                .build();
    }

    /**
     * 게시판 API 그룹
     */
    @Bean
    public GroupedOpenApi boardApi() {
        return GroupedOpenApi.builder()
                .group("board")
                .pathsToMatch("/api/v1/boards/**")
                .build();
    }

    /**
     * OpenAPI 커스텀 설정
     */
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("eGov Enterprise API")
                        .description("""
                                ### 전자정부 프레임워크 모더니제이션 API 문서
                                
                                본 API 는 Next.js 15 + Spring Boot 3.4 기반의 전자정부 표준프레임워크 공통 컴포넌트를 제공합니다.
                                
                                #### 주요 기능
                                - 시스템 관리 (공통코드, 메뉴, 권한)
                                - 협업 (게시판, 동호회, 주소록)
                                - 운영 지원 (일정, 보고서, 설문)
                                - 통계 및 분석
                                
                                #### 인증
                                - JWT 토큰 기반 인증
                                - Bearer 토큰을 Authorization 헤더에 추가
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("eGov Enterprise Team")
                                .email("support@egovframe.go.kr")
                                .url("https://www.egovframe.go.kr"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")))
                .addServersItem(new Server()
                        .url("/api/v1")
                        .description("Current environment"))
                .addServersItem(new Server()
                        .url("http://localhost:8080/api/v1")
                        .description("Local Development"))
                .addSecurityItem(new SecurityRequirement()
                        .addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .in(SecurityScheme.In.HEADER)
                                        .name("Authorization")
                                        .description("JWT 토큰을 입력하세요 (Bearer 제외)")));
    }
}
