package com.company.project.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.boot.autoconfigure.domain.EntityScan;

import javax.sql.DataSource;

/**
 * ?�합 ?�스?��? ?�한 최소 ?�정
 * ?�거??eGovFrame 컴포?�트�??�외?�고 ?�심 기능�?로드
 */
@org.springframework.context.annotation.Configuration
@ComponentScan(basePackages = {
        "com.company.project.service.user",
        "com.company.project.service.code",
        "com.company.project.service.menu",
        "com.company.project.service.board",
        "com.company.project.service.file",
        "com.company.project.domain",
        "com.company.project.core"
}, excludeFilters = {
        // ?��?줄링 관???�외
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Scheduling.*"),
        // ?�거????컨트롤러 ?�외
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\..*"),
        // ?�터?�터 ?�외 (?�스?�에??불필??
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Interceptor.*"),
        // WebMvcConfig ?�외 (?�터?�터 ?�존???�문??
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*WebMvcConfig.*")
})
@EnableJpaRepositories(basePackages = {
        "com.company.project.domain"
})
@EntityScan(basePackages = {
        "com.company.project.domain",
        "egovframework.com"
})
@org.springframework.data.jpa.repository.config.EnableJpaAuditing(auditorAwareRef = "logInUserAuditorAware")
@Profile("test")
public class MinimalTestConfig {

    @Bean
    @Primary
    @org.springframework.boot.context.properties.ConfigurationProperties(prefix = "spring.datasource")
    public org.springframework.boot.autoconfigure.jdbc.DataSourceProperties dataSourceProperties() {
        return new org.springframework.boot.autoconfigure.jdbc.DataSourceProperties();
    }

    @Bean
    @Primary
    public DataSource dataSource(org.springframework.boot.autoconfigure.jdbc.DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }

    @Bean(name = "entityManagerFactory")
    @Primary
    public org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean entityManagerFactory(
            DataSource dataSource) {
        org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean em = new org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.company.project.domain", "egovframework.com");

        org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter vendorAdapter = new org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter();
        em.setJpaVendorAdapter(vendorAdapter);

        java.util.Properties properties = new java.util.Properties();
        properties.put("hibernate.hbm2ddl.auto", "create-drop");
        properties.put("hibernate.dialect", "org.hibernate.dialect.H2Dialect");
        properties.put("hibernate.show_sql", "false");
        properties.put("hibernate.format_sql", "true");
        em.setJpaProperties(properties);

        return em;
    }

    @Bean(name = "transactionManager")
    @Primary
    public org.springframework.transaction.PlatformTransactionManager transactionManager(
            jakarta.persistence.EntityManagerFactory entityManagerFactory) {
        org.springframework.orm.jpa.JpaTransactionManager transactionManager = new org.springframework.orm.jpa.JpaTransactionManager();
        transactionManager.setEntityManagerFactory(entityManagerFactory);
        return transactionManager;
    }

    /**
     * ?�거??컴포?�트?�서 ?�구?�는 빈들??Mock?�로 ?�공
     * ?�제 ?�스?�에?�는 ?�용?��? ?��?�?ApplicationContext 로딩???�해 ?�요
     */

    @Bean
    public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    }

    @Bean(name = "logInUserAuditorAware")
    public org.springframework.data.domain.AuditorAware<String> auditorAware() {
        return () -> java.util.Optional.of("test-user");
    }

    @Bean
    public com.company.project.api.common.exception.GlobalExceptionHandler globalExceptionHandler() {
        return new com.company.project.api.common.exception.GlobalExceptionHandler();
    }
}
