package com.company.project.api.config;

import egovframework.com.cmm.EgovMessageSource;
import org.mybatis.spring.SqlSessionTemplate;
import org.mybatis.spring.boot.autoconfigure.ConfigurationCustomizer;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.PropertySource;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.core.io.ClassPathResource;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import javax.sql.DataSource;

@Configuration
@PropertySource("classpath:/egovframework/egovProps/globals.properties")
@org.springframework.context.annotation.Profile("!test")
public class LegacyConfig {

    @Bean
    public static PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
        PropertySourcesPlaceholderConfigurer configurer = new PropertySourcesPlaceholderConfigurer();
        configurer.setLocations(new ClassPathResource("egovframework/egovProps/globals.properties"));
        configurer.setIgnoreUnresolvablePlaceholders(true);
        return configurer;
    }

    @Bean(name = "dataSource")
    @Primary
    @ConfigurationProperties(prefix = "spring.datasource")
    public DataSource dataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean(name = "egov.dataSource")
    @org.springframework.context.annotation.Lazy
    public DataSource egovDataSource(DataSource dataSource) {
        return dataSource;
    }

    @Bean(name = "egov.sqlSessionTemplate")
    @org.springframework.context.annotation.Lazy
    public SqlSessionTemplate egovSqlSessionTemplate(
            org.apache.ibatis.session.SqlSessionFactory sqlSessionFactory) {
        return new SqlSessionTemplate(sqlSessionFactory);
    }

    @Bean(name = "egov.sqlSession")
    @org.springframework.context.annotation.Lazy
    public org.apache.ibatis.session.SqlSessionFactory egovSqlSession(
            org.apache.ibatis.session.SqlSessionFactory sqlSessionFactory) {
        return sqlSessionFactory;
    }

    @Bean(name = "messageSource")
    public ReloadableResourceBundleMessageSource messageSource() {
        ReloadableResourceBundleMessageSource messageSource = new ReloadableResourceBundleMessageSource();
        messageSource.setBasenames(
                "classpath:/egovframework/message/messages",
                "classpath:/egovframework/message/com/message-common",
                "classpath:/egovframework/message/com/message-validation",
                "classpath:/org/egovframe/rte/fdl/idgnr/messages/idgnr",
                "classpath:/org/egovframe/rte/fdl/property/messages/properties");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setCacheSeconds(60);
        return messageSource;
    }

    @Bean(name = "egovMessageSource")
    public EgovMessageSource egovMessageSource(ReloadableResourceBundleMessageSource messageSource) {
        EgovMessageSource egovMessageSource = new EgovMessageSource();
        egovMessageSource.setReloadableResourceBundleMessageSource(messageSource);
        return egovMessageSource;
    }

    @Bean
    public ConfigurationCustomizer mybatisConfigurationCustomizer() {
        return configuration -> {
            configuration.getTypeAliasRegistry().registerAlias("egovMap", EgovMap.class);
            configuration.getTypeAliasRegistry().registerAlias("FileVO", egovframework.com.cmm.service.FileVO.class);
            configuration.getTypeAliasRegistry().registerAlias("ComDefaultCodeVO",
                    egovframework.com.cmm.ComDefaultCodeVO.class);
            configuration.getTypeAliasRegistry().registerAlias("comDefaultVO",
                    egovframework.com.cmm.ComDefaultVO.class);
        };
    }
}
