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
 * 통합 테스트를 위한 최소화된 설정 클래스
 * eGovFrame 프로젝트의 설정을 테스트 환경에 맞게 커스터마이징하여 제공합니다.
 */
@org.springframework.context.annotation.Configuration
@ComponentScan(basePackages = {
    "com.company.project.service",
    "com.company.project.domain",
    "com.company.project.core",
    "com.company.project.config",
    "com.company.project.security",
    "com.company.project.api"
}, nameGenerator = com.company.project.config.FullBeanNameGenerator.class, excludeFilters = {
    // 스케줄링 관련 컴포넌트 제외
    @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Scheduling.*"),
    // egovframework 패키지 제외
    @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\..*"),
    // 인터셉터 제외
    @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Interceptor.*"),
    // WebMvcConfig 제외
    @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*WebMvcConfig.*"),
    // 주소록 서비스 제외 (ID 생성기 의존성 문제)
    @ComponentScan.Filter(type = FilterType.REGEX, pattern = "com\\.company\\.project\\.service\\.addressbook\\..*"),
    // ID 생성기 설정 제외 (모호한 의존성 문제)
    @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
        com.company.project.config.EgovSymIdGnrConfig.class
    })
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

  @Bean
  @Primary
  public org.springframework.jdbc.core.JdbcTemplate jdbcTemplate(DataSource dataSource) {
    return new org.springframework.jdbc.core.JdbcTemplate(dataSource);
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
   * eGovFrame 프로젝트의 서비스들이 비즈니스 로직에서 사용하는 빈들을 Mock 혹은 실제 빈으로 정의합니다.
   * 테스트 환경에서 데이터베이스 연동 테스트 시 ApplicationContext 로드 지연을 방지하기 위해 사용됩니다.
   */

  @Bean
  public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
    return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
  }

  @Bean(name = "logInUserAuditorAware")
  @Profile("test")
  public org.springframework.data.domain.AuditorAware<String> logInUserAuditorAware() {
    return () -> java.util.Optional.of("SYSTEM");
  }

  @Bean(name = "egovBBSMstrIdGnrService")
  public org.egovframe.rte.fdl.idgnr.EgovIdGnrService egovBBSMstrIdGnrService() {
    return org.mockito.Mockito.mock(org.egovframe.rte.fdl.idgnr.EgovIdGnrService.class);
  }

  @Bean(name = "egovMenuManageIdGnrService")
  public org.egovframe.rte.fdl.idgnr.EgovIdGnrService egovMenuManageIdGnrService() {
    return org.mockito.Mockito.mock(org.egovframe.rte.fdl.idgnr.EgovIdGnrService.class);
  }

  @Bean(name = "egovFileIdGnrService")
  public org.egovframe.rte.fdl.idgnr.EgovIdGnrService egovFileIdGnrService() {
    return org.mockito.Mockito.mock(org.egovframe.rte.fdl.idgnr.EgovIdGnrService.class);
  }

  @Bean
  public com.company.project.api.common.exception.GlobalExceptionHandler globalExceptionHandler() {
    return new com.company.project.api.common.exception.GlobalExceptionHandler();
  }
}
