package com.company.project.core.config;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration
public class EgovIdGnrConfig {

    @Bean
    public EgovIdGnrStrategyImpl fileIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("FILE_");
        strategy.setCipers(15);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(name = "egovFileIdGnrService")
    public EgovIdGnrService egovFileIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setStrategy(fileIdStrategy());
        idGnrService.setBlockSize(10);
        idGnrService.setTable("ids");
        idGnrService.setTableName("FILE_ID");
        return idGnrService;
    }

    @Bean
    public EgovIdGnrStrategyImpl bbsMstrIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("BBSMSTR_");
        strategy.setCipers(12);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(name = "egovBBSMstrIdGnrService")
    public EgovIdGnrService egovBBSMstrIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setStrategy(bbsMstrIdStrategy());
        idGnrService.setBlockSize(10);
        idGnrService.setTable("ids");
        idGnrService.setTableName("BBS_ID");
        return idGnrService;
    }
}
