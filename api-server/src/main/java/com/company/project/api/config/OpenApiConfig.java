package com.company.project.api.config;

import io.swagger.v3.oas.models.Components;

import io.swagger.v3.oas.models.OpenAPI;

import io.swagger.v3.oas.models.info.Info;

import io.swagger.v3.oas.models.security.SecurityRequirement;

import io.swagger.v3.oas.models.security.SecurityScheme;

import org.springframework.context.annotation.Bean;

import org.springframework.context.annotation.Configuration;

@Configuration

public class OpenApiConfig {

    @Bean

    public OpenAPI openAPI() {

        String securityJwtName = "JWT";

        SecurityRequirement securityRequirement = new SecurityRequirement().addList(securityJwtName);

        Components components = new Components()

                .addSecuritySchemes(securityJwtName, new SecurityScheme()

                        .name(securityJwtName)

                        .type(SecurityScheme.Type.HTTP)

                        .scheme("bearer")

                        .bearerFormat("JWT"));

        return new OpenAPI()

                .info(new Info()

                        .title("Egov Enterprise API")

                        .description("?         ?   ? ????         ?         ??            ??        ?         ??       API             ??")

                        .version("1.0.0"))

                .addSecurityItem(securityRequirement)

                .components(components);

    }

}