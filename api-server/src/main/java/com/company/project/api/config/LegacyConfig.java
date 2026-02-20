package com.company.project.api.config;

import egovframework.com.cmm.EgovMessageSource;

// SqlSessionTemplate, ObjectProvider - ??               ???            ???      

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

    // MyBatis Auto-configuration????       ??      ??SqlSessionFactory??         ??????

    // ?          ???         ??? ??               ?      ??         ??       ??      ??

    // @Bean(name = "egov.sqlSessionTemplate")

    // @Bean(name = "egov.sqlSession")

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

    @Bean

    public com.company.project.core.config.ApplicationContextProvider applicationContextProvider() {

        return new com.company.project.core.config.ApplicationContextProvider();

    }

    // ID Generation Services for BBS Master

    // org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl and related

    // strategies

    @Bean

    public org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl bbsMasterIdStrategy() {

        org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl strategy = new org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl();

        strategy.setPrefix("BBSMSTR_");

        strategy.setCipers(20);

        strategy.setFillChar('0');

        return strategy;

    }

    @Bean

    public org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl egovBBSMstrIdGnrService(

            @org.springframework.beans.factory.annotation.Qualifier("dataSource") DataSource dataSource,

            @org.springframework.beans.factory.annotation.Qualifier("bbsMasterIdStrategy") org.egovframe.rte.fdl.idgnr.EgovIdGnrStrategy strategy) {

        org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl idGnrService = new org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl();

        idGnrService.setDataSource(dataSource);

        idGnrService.setStrategy(strategy);

        idGnrService.setBlockSize(10);

        idGnrService.setTable("COMTECOPSEQ");

        idGnrService.setTableName("BBS_ID");

        return idGnrService;

    }

    @Bean

    public org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl blogIdStrategy() {

        org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl strategy = new org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl();

        strategy.setPrefix("BLOG_");

        strategy.setCipers(15);

        strategy.setFillChar('0');

        return strategy;

    }

    @Bean

    public org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl egovBlogIdGnrService(

            @org.springframework.beans.factory.annotation.Qualifier("dataSource") DataSource dataSource,

            @org.springframework.beans.factory.annotation.Qualifier("blogIdStrategy") org.egovframe.rte.fdl.idgnr.EgovIdGnrStrategy strategy) {

        org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl idGnrService = new org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl();

        idGnrService.setDataSource(dataSource);

        idGnrService.setStrategy(strategy);

        idGnrService.setBlockSize(10);

        idGnrService.setTable("COMTECOPSEQ");

        idGnrService.setTableName("BLOG_ID");

        return idGnrService;

    }

    // Answer No ID Generation Service for Article Comments

    @Bean

    public org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl answerNoStrategy() {

        org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl strategy = new org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl();

        // strategy.setPrefix(""); // No prefix in XML

        strategy.setCipers(20);

        strategy.setFillChar('0');

        return strategy;

    }

    @Bean

    public org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl egovAnswerNoGnrService(

            @org.springframework.beans.factory.annotation.Qualifier("dataSource") DataSource dataSource,

            @org.springframework.beans.factory.annotation.Qualifier("answerNoStrategy") org.egovframe.rte.fdl.idgnr.EgovIdGnrStrategy strategy) {

        org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl idGnrService = new org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl();

        idGnrService.setDataSource(dataSource);

        idGnrService.setStrategy(strategy);

        idGnrService.setBlockSize(10);

        idGnrService.setTable("COMTECOPSEQ");

        idGnrService.setTableName("ANSWER_NO");

        return idGnrService;

    }

    // Satisfaction No ID Generation Service

    @Bean

    public org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl stsfdgNoStrategy() {

        org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl strategy = new org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl();

        // strategy.setPrefix(""); // No prefix in XML

        strategy.setCipers(20);

        strategy.setFillChar('0');

        return strategy;

    }

    @Bean

    public org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl egovStsfdgNoGnrService(

            @org.springframework.beans.factory.annotation.Qualifier("dataSource") DataSource dataSource,

            @org.springframework.beans.factory.annotation.Qualifier("stsfdgNoStrategy") org.egovframe.rte.fdl.idgnr.EgovIdGnrStrategy strategy) {

        org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl idGnrService = new org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl();

        idGnrService.setDataSource(dataSource);

        idGnrService.setStrategy(strategy);

        idGnrService.setBlockSize(10);

        idGnrService.setTable("COMTECOPSEQ");

        idGnrService.setTableName("STSFDG_NO");

        return idGnrService;

    }

}

