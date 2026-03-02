package com.company.project.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

@TestConfiguration
@Profile("test")
public class TestContextConfig {

  @Bean
  @Primary
  @ConfigurationProperties(prefix = "spring.datasource")
  public org.springframework.boot.autoconfigure.jdbc.DataSourceProperties dataSourceProperties() {
    return new org.springframework.boot.autoconfigure.jdbc.DataSourceProperties();
  }

  @Bean
  @Primary
  public DataSource dataSource(org.springframework.boot.autoconfigure.jdbc.DataSourceProperties properties) {
    return properties.initializeDataSourceBuilder().build();
  }

  @Bean(name = "egov.dataSource")
  @Primary
  public DataSource egovDataSource(DataSource dataSource) {
    return dataSource;
  }

  @Bean(name = "entityManagerFactory")
  @Primary
  public org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean entityManagerFactory(
      DataSource dataSource) {
    org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean em = new org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean();
    em.setDataSource(dataSource);
    em.setPackagesToScan("com.company.project", "egovframework");

    org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter vendorAdapter = new org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter();
    em.setJpaVendorAdapter(vendorAdapter);

    java.util.Properties properties = new java.util.Properties();
    properties.put("hibernate.hbm2ddl.auto", "create-drop");
    properties.put("hibernate.dialect", "org.hibernate.dialect.H2Dialect");
    properties.put("hibernate.show_sql", "true");
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

}
