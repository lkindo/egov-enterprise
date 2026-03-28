package com.company.project.api.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "eGov Enterprise 5.0 API Documentation",
        version = "1.0.0",
        description = "전자정부 표준프레임워크 5.0 기반의 2계층(Foundation & Business Suite) 비즈니스 솔루션 API 문서입니다."
    ),
    security = @SecurityRequirement(name = "Bearer Authentication")
)
@SecurityScheme(
    name = "Bearer Authentication",
    type = SecuritySchemeType.HTTP,
    bearerFormat = "JWT",
    scheme = "bearer"
)
public class OpenApiConfig {

    @Bean
    public GroupedOpenApi foundationApi() {
        return GroupedOpenApi.builder()
            .group("1-foundation")
            .pathsToMatch("/api/v1/auth/**", "/api/v1/users/**", "/api/v1/codes/**")
            .build();
    }

    @Bean
    public GroupedOpenApi businessApi() {
        return GroupedOpenApi.builder()
            .group("2-business-suite")
            .pathsToMatch("/api/v1/**")
            .pathsToExclude("/api/v1/auth/**", "/api/v1/users/**", "/api/v1/codes/**")
            .build();
    }
}
