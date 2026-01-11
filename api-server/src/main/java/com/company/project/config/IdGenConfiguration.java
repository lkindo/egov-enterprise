package com.company.project.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@Import(LegacyIdGenBeanRegistrar.class)
public class IdGenConfiguration {
    // Imports the registrar to define legacy ID beans.
}
