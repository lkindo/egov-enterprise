package com.company.project.api.config;

import egovframework.com.cmm.EgovMessageSource;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.PropertySource;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.core.io.ClassPathResource;

import javax.sql.DataSource;

@Configuration
@PropertySource("classpath:/egovframework/egovProps/globals.properties")
public class LegacyConfig {

    private final DataSource dataSource;

    public LegacyConfig(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Bean
    public static PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
        PropertySourcesPlaceholderConfigurer configurer = new PropertySourcesPlaceholderConfigurer();
        configurer.setLocations(new ClassPathResource("egovframework/egovProps/globals.properties"));
        configurer.setIgnoreUnresolvablePlaceholders(true);
        return configurer;
    }

    @Bean(name = "egov.dataSource")
    @Primary
    public DataSource egovDataSource() {
        return dataSource;
    }

    @Bean(name = "egov.sqlSessionTemplate")
    public SqlSessionTemplate egovSqlSessionTemplate(SqlSessionTemplate sqlSessionTemplate) {
        return sqlSessionTemplate;
    }

    @Bean(name = "egovMessageSource")
    public EgovMessageSource egovMessageSource() {
        ReloadableResourceBundleMessageSource messageSource = new ReloadableResourceBundleMessageSource();
        messageSource.setBasenames(
                "classpath:/egovframework/message/com/message-common",
                "classpath:/org/egovframe/rte/fdl/idgnr/messages/idgnr",
                "classpath:/org/egovframe/rte/fdl/property/messages/properties");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setCacheSeconds(60);

        EgovMessageSource egovMessageSource = new EgovMessageSource();
        egovMessageSource.setReloadableResourceBundleMessageSource(messageSource);
        return egovMessageSource;
    }
}
