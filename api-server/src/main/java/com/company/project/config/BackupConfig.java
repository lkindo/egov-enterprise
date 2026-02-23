package com.company.project.config;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * 백업 ID 생성 서비스 설정
 * - BackupScheduler(Quartz) 제거: 레거시 sym.bak 의존성 삭제로 함께 제거됨
 */
@Configuration
public class BackupConfig {

    @Bean(name = "egovBackupOpertIdGnrService")
    public EgovIdGnrService egovBackupOpertIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl service = new EgovTableIdGnrServiceImpl();
        service.setDataSource(dataSource);
        service.setStrategy(backupOpertIdStrategy());
        service.setBlockSize(1);
        service.setTable("COMTECOPSEQ");
        service.setTableName("BACKUP_OPERT_ID");
        return service;
    }

    @Bean
    public EgovIdGnrStrategyImpl backupOpertIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("BAK");
        strategy.setCipers(17);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(name = "egovBackupResultIdGnrService")
    public EgovIdGnrService egovBackupResultIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl service = new EgovTableIdGnrServiceImpl();
        service.setDataSource(dataSource);
        service.setStrategy(backupResultIdStrategy());
        service.setBlockSize(1);
        service.setTable("COMTECOPSEQ");
        service.setTableName("BACKUP_RESULT_ID");
        return service;
    }

    @Bean
    public EgovIdGnrStrategyImpl backupResultIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("BRT");
        strategy.setCipers(17);
        strategy.setFillChar('0');
        return strategy;
    }

}
