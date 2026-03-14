package com.company.project.config;

import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.security.service.EgovPasswordEncoder;
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
import org.springframework.security.core.userdetails.UserDetailsService;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.company.project.service.user.UserService;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.domain.user.repository.EnterpriseUserRepository;
import com.company.project.domain.user.repository.GeneralUserRepository;
import com.company.project.domain.auth.UserAuthorityRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

@TestConfiguration
@Profile("test")
@org.springframework.context.annotation.Import({
        EgovSymIdGnrConfig.class,
        org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration.class,
        org.springframework.boot.autoconfigure.http.HttpMessageConvertersAutoConfiguration.class,
        org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration.class,
        org.springframework.boot.autoconfigure.web.servlet.DispatcherServletAutoConfiguration.class,
        org.springframework.boot.autoconfigure.data.web.SpringDataWebAutoConfiguration.class
})
@ComponentScan(basePackages = {
        "com.company.project.service",
        "com.company.project.domain",
        "com.company.project.core",
        "com.company.project.security",
        "com.company.project.api"
}, nameGenerator = com.company.project.core.config.FullBeanNameGenerator.class, excludeFilters = {
        @ComponentScan.Filter(type = FilterType.ANNOTATION, classes = {
                org.springframework.stereotype.Controller.class,
                org.springframework.web.bind.annotation.RestController.class
        }),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Scheduling.*"),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\..*"),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Interceptor.*")
})
@EnableJpaRepositories(basePackages = "com.company.project.domain")
@EntityScan(basePackages = { "com.company.project.domain" })
public class MinimalTestConfig {

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private UserAuthorityRepository userAuthorityRepository;

    @MockitoBean
    private EnterpriseUserRepository enterpriseUserRepository;

    @MockitoBean
    private GeneralUserRepository generalUserRepository;

    @Bean
    public MeterRegistry meterRegistry() {
        return new SimpleMeterRegistry();
    }

    @Bean
    public EgovPasswordEncoder egovPasswordEncoder() {
        return new EgovPasswordEncoder();
    }

    @Bean(name = "dataSource")
    @Primary
    public DataSource dataSource() {
        DataSourceProperties properties = new DataSourceProperties();
        properties.setUrl(
                "jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;DATABASE_TO_LOWER=TRUE");
        properties.setDriverClassName("org.h2.Driver");
        properties.setUsername("sa");
        properties.setPassword("");
        return properties.initializeDataSourceBuilder().build();
    }

    @Bean(name = "egov.dataSource")
    public DataSource egovDataSource(
            @org.springframework.beans.factory.annotation.Qualifier("dataSource") DataSource dataSource) {
        return dataSource;
    }

    @Bean
    @Primary
    public JdbcTemplate jdbcTemplate(
            @org.springframework.beans.factory.annotation.Qualifier("dataSource") DataSource dataSource) {
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
    @Profile("!security-test")
    @org.springframework.core.annotation.Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE)
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable).authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    public static org.springframework.beans.factory.config.BeanFactoryPostProcessor mockIdGnrServicePostProcessor() {
        return beanFactory -> {
            org.springframework.beans.factory.support.DefaultListableBeanFactory factory = (org.springframework.beans.factory.support.DefaultListableBeanFactory) beanFactory;

            String[] commonIdGnrNames = {
                    "egovBackupOpertIdGnrService", "egovAdbkUserIdGnrService",
                    "egovBBSMstrIdGnrService", "egovMenuManageIdGnrService", "egovFileIdGnrService",
                    "egovCmmntyIdGnrService", "egovAdbkIdGnrService", "egovBBSUseIdGnrService",
                    "egovDeptSchdulManageIdGnrService", "egovDietIdGnrService",
                    "egovFaqManageIdGnrService",
                    "egovGuidanceManageIdGnrService", "egovHpcmIdGnrService", "egovIndvdlSchdulManageIdGnrService",
                    "egovIntrfcManageIdGnrService", "egovJrdcIDGnrService", "egovLoginLogIdGnrService",
                    "egovLoginPolicyIdGnrService", "egovLoginScrinIdGnrService",
                    "egovMemoReprtIdGnrService",
                    "egovMemoTodoIdGnrService",
                    "reprtStatsIdGnrService", "egovSmsIdGnrService",
                    "egovSmsRecptnIdGnrService",
                    "egovPopupManageIdGnrService", "egovBannerIdGnrService", "egovFaqIdGnrService",
                    "egovQnaIdGnrService", "egovConsltIdGnrService", "egovWordDicaryIdGnrService",
                    "egovOnlineMnlIdGnrService", "egovHpcmDfIdGnrService",
                    "egovSchedulIdGnrService", "egovMemoIdGnrService", "egovTodoIdGnrService",
                    "egovDiaryIdGnrService", "egovScrapIdGnrService", "egovWikiIdGnrService",
                    "egovWikiMnthngReprtIdGnrService", "egovRoughmapIdGnrService",
                    "egovMailIdGnrService", "egovImageIdGnrService", "egovFileGroupIdGnrService",
                    "egovBlogIdGnrService", "egovBlogUserIdGnrService", "egovCmmntyUserIdGnrService",
                    "egovLeaderSchdulIdGnrService", "egovLeaderSttusIdGnrService",
                    "egovPollManageIdGnrService",
                    "egovPollItemIdGnrService", "egovPollResultIdGnrService", "egovQestnrInfoIdGnrService",
                    "egovQestnrQesitmIdGnrService", "egovQestnrRespondInfoIdGnrService", "egovQestnrTmplatIdGnrService",
                    "egovSiteInfoIdGnrService", "egovIndvdlPgeIdGnrService", "egovMyPageCntntsIdGnrService",
                    "egovPrivacyLogIdGnrService", "egovUserLogIdGnrService", "egovWebLogIdGnrService",
                    "egovSysLogIdGnrService", "egovStsfdgIdGnrService", "egovReprtStatsIdGnrService",
                    "egovDtaUseStatsIdGnrService", "egovNtmplIdGnrService"
            };

            for (String name : commonIdGnrNames) {
                if (!factory.containsBeanDefinition(name) && !factory.containsSingleton(name)) {
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
    @Primary
    public UserDetailsService userDetailsService() {
        return Mockito.mock(UserDetailsService.class);
    }

    @Bean
    public com.company.project.api.interceptor.OperationalAuditInterceptor operationalAuditInterceptor()
            throws Exception {
        com.company.project.api.interceptor.OperationalAuditInterceptor mock = Mockito
                .mock(com.company.project.api.interceptor.OperationalAuditInterceptor.class);
        Mockito.when(mock.preHandle(Mockito.any(), Mockito.any(), Mockito.any())).thenReturn(true);
        return mock;
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
}
