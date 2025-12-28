package com.company.project.api.config;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

/**
 * eGovFrame ID Generation Service 설정
 * 전자정부프레임워크 표준 ID 생성기 빈 등록
 */
@Configuration
@Profile("!test")
public class IdGenConfig {

    /**
     * 접속 로그 ID 생성기
     * 형식: LOG_00000001
     */
    @Bean
    public EgovIdGnrService egovLoginLogIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setStrategy(createStrategy("LOG_", 8, '0'));
        idGnrService.setBlockSize(1);
        idGnrService.setTable("NIDSKEY");
        idGnrService.setTableName("LOGLOG");
        return idGnrService;
    }

    /**
     * 시스템 로그 ID 생성기
     * 형식: SYSLOG_00000001
     */
    @Bean
    public EgovIdGnrService egovSysLogIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setStrategy(createStrategy("SYSLOG_", 8, '0'));
        idGnrService.setBlockSize(1);
        idGnrService.setTable("NIDSKEY");
        idGnrService.setTableName("SYSLOG");
        return idGnrService;
    }

    /**
     * 사용자 ID 생성기
     * 형식: USRCNFRM_00000001
     */
    @Bean
    public EgovIdGnrService egovUsrCnfrmIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setStrategy(createStrategy("USRCNFRM_", 13, '0'));
        idGnrService.setBlockSize(1);
        idGnrService.setTable("NIDSKEY");
        idGnrService.setTableName("USRCNFRM");
        return idGnrService;
    }

    /**
     * 첨부파일 ID 생성기
     * 형식: FILE_00000001
     */
    @Bean
    public EgovIdGnrService egovFileIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setStrategy(createStrategy("FILE_", 13, '0'));
        idGnrService.setBlockSize(1);
        idGnrService.setTable("NIDSKEY");
        idGnrService.setTableName("ATCHFILE");
        return idGnrService;
    }

    /**
     * 게시판 ID 생성기
     * 형식: BBSMSTR_00000001
     */
    @Bean
    public EgovIdGnrService egovBBSMstrIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setStrategy(createStrategy("BBSMSTR_", 13, '0'));
        idGnrService.setBlockSize(1);
        idGnrService.setTable("NIDSKEY");
        idGnrService.setTableName("BBSMSTR");
        return idGnrService;
    }

    /**
     * 설문응답 ID 생성기
     * 형식: RESULT_0000000000001
     */
    @Bean
    public EgovIdGnrService qustnrRespondInfoIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setStrategy(createStrategy("RESULT_", 13, '0'));
        idGnrService.setBlockSize(1);
        idGnrService.setTable("NIDSKEY");
        idGnrService.setTableName("QRESP");
        return idGnrService;
    }

    private EgovIdGnrStrategyImpl createStrategy(String prefix, int cipers, char fillChar) {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix(prefix);
        strategy.setCipers(cipers);
        strategy.setFillChar(fillChar);
        return strategy;
    }
}
