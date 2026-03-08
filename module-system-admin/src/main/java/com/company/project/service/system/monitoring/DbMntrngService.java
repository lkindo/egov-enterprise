package com.company.project.service.system.monitoring;

import com.company.project.domain.system.monitoring.DbMntrng;
import com.company.project.domain.system.monitoring.DbMntrngLog;
import com.company.project.domain.system.monitoring.DbMntrngLogRepository;
import com.company.project.domain.system.monitoring.DbMntrngRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.system.monitoring.dto.DbMntrngDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DbMntrngService extends EgovAbstractServiceImpl {

    private final DbMntrngRepository dbMntrngRepository;
    private final DbMntrngLogRepository dbMntrngLogRepository;
    private final EgovCommonCodeService commonCodeService;
    private final EgovIdGnrService egovDbMntrngLogIdGnrService;
    private final DataSource dataSource;

    @Transactional(readOnly = true)
    public Page<DbMntrngDto> getDbMntrngList(String dataSourcNm, Pageable pageable) {
        Page<DbMntrng> page = dbMntrngRepository.findByDataSourcNmContaining(dataSourcNm == null ? "" : dataSourcNm,
                pageable);

        List<CommonCodeDto> dbmsCodes = commonCodeService.getCodesByGroup("COM048");
        Map<String, String> dbmsMap = dbmsCodes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        List<CommonCodeDto> sttusCodes = commonCodeService.getCodesByGroup("COM046");
        Map<String, String> sttusMap = sttusCodes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            DbMntrngDto dto = DbMntrngDto.from(entity);
            dto.setDbmsKindNm(dbmsMap.getOrDefault(dto.getDbmsKind(), ""));
            dto.setMntrngSttusNm(sttusMap.getOrDefault(dto.getMntrngSttus(), ""));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public DbMntrngDto getDbMntrng(String dataSourcNm) {
        DbMntrng entity = dbMntrngRepository.findById(Objects.requireNonNull(dataSourcNm))
                .orElseThrow(() -> new RuntimeException("DB monitoring not found"));
        return DbMntrngDto.from(entity);
    }

    @Transactional
    public void createDbMntrng(DbMntrngDto dto) {
        DbMntrng entity = DbMntrng.builder()
                .dataSourcNm(dto.getDataSourcNm())
                .serverNm(dto.getServerNm())
                .dbmsKind(dto.getDbmsKind())
                .ceckSql(dto.getCeckSql())
                .mngrNm(dto.getMngrNm())
                .mngrEmailAddr(dto.getMngrEmailAddr())
                .mntrngSttus("02") // Default to abnormal
                .creatDt(LocalDateTime.now())
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdtPnttm(LocalDateTime.now())
                .build();
        dbMntrngRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateDbMntrng(DbMntrngDto dto) {
        DbMntrng entity = dbMntrngRepository.findById(Objects.requireNonNull(dto.getDataSourcNm()))
                .orElseThrow(() -> new RuntimeException("DB monitoring not found"));

        entity.setServerNm(dto.getServerNm());
        entity.setDbmsKind(dto.getDbmsKind());
        entity.setCeckSql(dto.getCeckSql());
        entity.setMngrNm(dto.getMngrNm());
        entity.setMngrEmailAddr(dto.getMngrEmailAddr());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdtPnttm(LocalDateTime.now());
    }

    @Transactional
    public void deleteDbMntrng(String dataSourcNm) {
        dbMntrngRepository.deleteById(Objects.requireNonNull(dataSourcNm));
    }

    @Transactional
    public void checkAndRecordDbStatus(String dataSourcNm, String userId) throws Exception {
        DbMntrng entity = dbMntrngRepository.findById(Objects.requireNonNull(dataSourcNm))
                .orElseThrow(() -> new RuntimeException("DB monitoring not found"));

        String sttus = "02"; // Abnormal
        String logInfo = "";

        // Check using default data source for prototype.
        // In real legacy, it might try to connect to the specific dataSourcNm using
        // JNDI or specific config.
        try (Connection conn = dataSource.getConnection();
                Statement stmt = conn.createStatement()) {

            stmt.execute(entity.getCeckSql());
            sttus = "01"; // Normal
            logInfo = "Connection check successful with SQL: " + entity.getCeckSql();
        } catch (Exception e) {
            logInfo = "Connection check failed: " + e.getMessage();
        }

        entity.setMntrngSttus(sttus);
        entity.setLastUpdusrId(userId);
        entity.setLastUpdtPnttm(LocalDateTime.now());

        String logId = egovDbMntrngLogIdGnrService.getNextStringId();
        DbMntrngLog log = DbMntrngLog.builder()
                .logId(logId)
                .dataSourcNm(dataSourcNm)
                .serverNm(entity.getServerNm())
                .dbmsKind(entity.getDbmsKind())
                .ceckSql(entity.getCeckSql())
                .mngrNm(entity.getMngrNm())
                .mngrEmailAddr(entity.getMngrEmailAddr())
                .mntrngSttus(sttus)
                .logInfo(logInfo)
                .creatDt(LocalDateTime.now())
                .frstRegisterId(userId)
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(userId)
                .lastUpdtPnttm(LocalDateTime.now())
                .build();

        dbMntrngLogRepository.save(Objects.requireNonNull(log));
    }
}
