package com.company.project.config;

import com.company.project.security.jwt.JwtTokenProvider;
import org.mockito.Mockito;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;

import javax.sql.DataSource;
import java.util.Properties;

@TestConfiguration
@Profile("test")
@org.springframework.web.servlet.config.annotation.EnableWebMvc
@org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
@org.springframework.context.annotation.Import({
    EgovSymIdGnrConfig.class,
    org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration.class,
    org.springframework.boot.autoconfigure.http.HttpMessageConvertersAutoConfiguration.class
})
@ComponentScan(basePackages = {
        "com.company.project.service",
        "com.company.project.domain",
        "com.company.project.core"
}, nameGenerator = com.company.project.core.config.FullBeanNameGenerator.class, excludeFilters = {
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Scheduling.*"),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\..*"),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Interceptor.*")
})
@EnableJpaRepositories(basePackages = "com.company.project.domain")
@EntityScan(basePackages = { "com.company.project.domain", "egovframework.com" })
public class MinimalTestConfig {

    @Bean
    @Primary
    public DataSourceProperties dataSourceProperties() {
        DataSourceProperties properties = new DataSourceProperties();
        properties.setUrl("jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE");
        properties.setDriverClassName("org.h2.Driver");
        properties.setUsername("sa");
        properties.setPassword("");
        return properties;
    }

    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }

    @Bean(name = "egov.dataSource")
    public DataSource egovDataSource(
            @org.springframework.beans.factory.annotation.Qualifier("dataSource") DataSource dataSource) {
        return dataSource;
    }

    @Bean
    @Primary
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    @Bean(name = "entityManagerFactory")
    @Primary
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.company.project.domain", "egovframework.com");
        em.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Properties properties = new Properties();
        properties.put("hibernate.hbm2ddl.auto", "create-drop");
        properties.put("hibernate.dialect", "org.hibernate.dialect.H2Dialect");
        em.setJpaProperties(properties);
        return em;
    }

    @Bean(name = "transactionManager")
    @Primary
    public PlatformTransactionManager transactionManager(
            jakarta.persistence.EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }

    @Bean
    @Primary
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @Primary
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable).authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    public static org.springframework.beans.factory.config.BeanFactoryPostProcessor mockIdGnrServicePostProcessor() {
        return beanFactory -> {
            org.springframework.beans.factory.support.DefaultListableBeanFactory factory = 
                (org.springframework.beans.factory.support.DefaultListableBeanFactory) beanFactory;
            
            String[] commonIdGnrNames = {
                    "egovEventManageIdGnrService", "egovBackupOpertIdGnrService", "egovAdbkUserIdGnrService",
                    "egovBBSMstrIdGnrService", "egovMenuManageIdGnrService", "egovFileIdGnrService",
                    "egovCmmntyIdGnrService", "egovAdbkIdGnrService", "egovBBSUseIdGnrService",
                    "egovDeptSchdulManageIdGnrService", "egovDietIdGnrService", "egovEventInfoIdGnrService",
                    "egovEventRecptnIdGnrService", "egovExtrlHrIdGnrService", "egovFaqManageIdGnrService",
                    "egovGuidanceManageIdGnrService", "egovHpcmIdGnrService", "egovIndvdlSchdulManageIdGnrService",
                    "egovIntrfcManageIdGnrService", "egovJrdcIDGnrService", "egovLoginLogIdGnrService",
                    "egovLoginPolicyIdGnrService", "egovLoginScrinIdGnrService", "egovManageIemIdGnrService",
                    "egovMeetingIdGnrService", "egovMeetingManageIdGnrService", "egovMemoReprtIdGnrService",
                    "egovMemoTodoIdGnrService", "egovNcrdIdGnrService", "egovNcrdUserIdGnrService"
            };
            
            for (String name : commonIdGnrNames) {
                if (!factory.containsBeanDefinition(name)) {
                    factory.registerSingleton(name, Mockito.mock(org.egovframe.rte.fdl.idgnr.EgovIdGnrService.class));
                }
            }
        };
    }

    @Bean
    @Primary
    public org.springframework.messaging.simp.SimpMessagingTemplate simpMessagingTemplate() {
        return Mockito.mock(org.springframework.messaging.simp.SimpMessagingTemplate.class);
    }

    @Bean
    public JwtTokenProvider jwtTokenProvider() {
        return Mockito.mock(JwtTokenProvider.class);
    }

    @Bean
    public org.springframework.security.authentication.AuthenticationManager authenticationManager() {
        return Mockito.mock(org.springframework.security.authentication.AuthenticationManager.class);
    }

    @Bean
    public org.egovframe.rte.fdl.idgnr.EgovIdGnrService egovIdGnrService() {
        return Mockito.mock(org.egovframe.rte.fdl.idgnr.EgovIdGnrService.class);
    }

    @Bean(name = "loginUserAuditorAware")
    public org.springframework.data.domain.AuditorAware<String> loginUserAuditorAware() {
        return () -> java.util.Optional.of("testUser");
    }

    @Bean
    public static org.springframework.beans.factory.config.BeanFactoryPostProcessor debugBeanSourcePostProcessor() {
        return beanFactory -> {
            String[] filterChainNames = beanFactory.getBeanNamesForType(org.springframework.security.web.SecurityFilterChain.class);
            for (String name : filterChainNames) {
                org.springframework.beans.factory.config.BeanDefinition bd = beanFactory.getBeanDefinition(name);
                System.out.println("DEBUG SECURITY CHAIN: " + name + " [Resource: " + bd.getResourceDescription() + "]");
            }
        };
    }
}
