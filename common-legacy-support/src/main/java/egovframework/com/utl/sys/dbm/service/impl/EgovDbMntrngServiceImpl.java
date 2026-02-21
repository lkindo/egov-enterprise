package egovframework.com.utl.sys.dbm.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.monitoring.DbMonitoring;
import com.company.project.domain.monitoring.DbMonitoringLog;
import com.company.project.domain.monitoring.DbMonitoringLogRepository;
import com.company.project.domain.monitoring.DbMonitoringRepository;

import egovframework.com.utl.sys.dbm.service.DbMntrng;
import egovframework.com.utl.sys.dbm.service.DbMntrngLog;
import egovframework.com.utl.sys.dbm.service.EgovDbMntrngService;
import lombok.RequiredArgsConstructor;

/**
 * DB???????? ????ServiceImpl ?????
 * 
 * @author ?
 * @since 2010.06.21
 * @version 1.1
 **/
@Service("EgovDbMntrngService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovDbMntrngServiceImpl extends EgovAbstractServiceImpl implements EgovDbMntrngService {

    private final DbMonitoringRepository dbMonitoringRepository;
    private final DbMonitoringLogRepository dbMonitoringLogRepository;

    @Override
    @Transactional
    public void deleteDbMntrng(DbMntrng vo) throws Exception {
        dbMonitoringRepository.deleteById(vo.getDataSourcNm());
    }

    @Override
    @Transactional
    public void insertDbMntrng(DbMntrng vo) throws Exception {
        DbMonitoring entity = DbMonitoring.builder()
                .dataSourcNm(vo.getDataSourcNm())
                .serverNm(vo.getServerNm())
                .dbmsKind(vo.getDbmsKind())
                .ceckSql(vo.getCeckSql())
                .mngrNm(vo.getMngrNm())
                .mngrEmailAddr(vo.getMngrEmailAddr())
                .mntrngSttus("01") // ???
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
        dbMonitoringRepository.save(entity);
    }

    @Override
    @Transactional
    public void insertDbMntrngLog(DbMntrngLog vo) throws Exception {
        DbMonitoringLog entity = DbMonitoringLog.builder()
                .logId(vo.getLogId())
                .dataSourcNm(vo.getDataSourcNm())
                .serverNm(vo.getServerNm())
                .dbmsKind(vo.getDbmsKind())
                .ceckSql(vo.getCeckSql())
                .mngrNm(vo.getMngrNm())
                .mngrEmailAddr(vo.getMngrEmailAddr())
                .mntrngSttus(vo.getMntrngSttus())
                .logInfo(vo.getLogInfo())
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
        dbMonitoringLogRepository.save(entity);
    }

    @Override
    public DbMntrng selectDbMntrng(DbMntrng vo) throws Exception {
        return dbMonitoringRepository.findById(vo.getDataSourcNm())
                .map(this::toVO)
                .orElse(null);
    }

    @Override
    public DbMntrngLog selectDbMntrngLog(DbMntrngLog vo) throws Exception {
        return dbMonitoringLogRepository.findById(vo.getLogId())
                .map(this::toLogVO)
                .orElse(null);
    }

    @Override
    public List<DbMntrng> selectDbMntrngList(DbMntrng searchVO) throws Exception {
        return dbMonitoringRepository
                .findAll(PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage(),
                        Sort.by("dataSourcNm").ascending()))
                .getContent().stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Override
    public int selectDbMntrngListCnt(DbMntrng searchVO) throws Exception {
        return (int) dbMonitoringRepository.count();
    }

    @Override
    public List<DbMntrngLog> selectDbMntrngLogList(DbMntrngLog searchVO) throws Exception {
        return dbMonitoringLogRepository
                .findAll(PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage(),
                        Sort.by("logId").descending()))
                .getContent().stream()
                .map(this::toLogVO)
                .collect(Collectors.toList());
    }

    @Override
    public int selectDbMntrngLogListCnt(DbMntrngLog searchVO) throws Exception {
        return (int) dbMonitoringLogRepository.count();
    }

    @Override
    @Transactional
    public void updateDbMntrng(DbMntrng vo) throws Exception {
        dbMonitoringRepository.findById(vo.getDataSourcNm()).ifPresent(e -> {
            e.update(vo.getServerNm(), vo.getDbmsKind(), vo.getCeckSql(), vo.getMngrNm(), vo.getMngrEmailAddr(),
                    vo.getMntrngSttus(), vo.getLastUpdusrId());
        });
    }

    private DbMntrng toVO(DbMonitoring entity) {
        DbMntrng vo = new DbMntrng();
        vo.setDataSourcNm(entity.getDataSourcNm());
        vo.setServerNm(entity.getServerNm());
        vo.setDbmsKind(entity.getDbmsKind());
        vo.setCeckSql(entity.getCeckSql());
        vo.setMngrNm(entity.getMngrNm());
        vo.setMngrEmailAddr(entity.getMngrEmailAddr());
        vo.setMntrngSttus(entity.getMntrngSttus());
        return vo;
    }

    private DbMntrngLog toLogVO(DbMonitoringLog entity) {
        DbMntrngLog vo = new DbMntrngLog();
        vo.setLogId(entity.getLogId());
        vo.setDataSourcNm(entity.getDataSourcNm());
        vo.setServerNm(entity.getServerNm());
        vo.setDbmsKind(entity.getDbmsKind());
        vo.setCeckSql(entity.getCeckSql());
        vo.setMngrNm(entity.getMngrNm());
        vo.setMngrEmailAddr(entity.getMngrEmailAddr());
        vo.setMntrngSttus(entity.getMntrngSttus());
        vo.setLogInfo(entity.getLogInfo());
        return vo;
    }
}
