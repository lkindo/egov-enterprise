package egovframework.let.sym.log.lgm.service.impl;

import com.company.project.domain.log.SysLog;
import com.company.project.domain.log.SysLogRepository;
import egovframework.let.sym.log.lgm.service.EgovSysLogService;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * 로그관리(시스템)를 위한 서비스 구현 클래스 (JPA 전환)
 */
@Service("EgovSysLogService")
@Transactional(readOnly = true)
public class EgovSysLogServiceImpl extends EgovAbstractServiceImpl implements EgovSysLogService {

    @Resource
    private SysLogRepository sysLogRepository;

    @Resource(name = "egovSysLogIdGnrService")
    private EgovIdGnrService egovSysLogIdGnrService;

    @Override
    @Transactional
    public void logInsertSysLog(egovframework.let.sym.log.lgm.service.SysLog vo) throws Exception {
        String requstId = egovSysLogIdGnrService.getNextStringId();

        SysLog entity = SysLog.builder()
                .requstId(requstId)
                .srvcNm(vo.getSrvcNm())
                .methodNm(vo.getMethodNm())
                .processSeCode(vo.getProcessSeCode())
                .processTime(vo.getProcessTime())
                .rqesterId(vo.getRqesterId())
                .rqesterIp(vo.getRqesterIp())
                // occrrncDe is handled in DB or Entity usually, but here VO doesn't seem to
                // pass it always?
                // Legacy SQL: INSERT ... OCCRRNC_DE ... TO_CHAR(sysdate, 'YYYYMMDD')
                // So we set it here.
                .occrrncDe(java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")))
                .build();

        sysLogRepository.save(entity);
    }

    @Override
    @Transactional
    public void logInsertSysLogSummary() throws Exception {
        // Phase 4: Summary logic involves complex SQL aggregation.
        // For now we leave this empty or throw unsupported, as indicated in plan.
        // Or we could implement it using Native Query if strongly required later.
        // "Phase 4 ... 제외하거나 Native Query로 간단히 처리" -> Leaving empty effectively.
    }

    @Override
    public egovframework.let.sym.log.lgm.service.SysLog selectSysLog(egovframework.let.sym.log.lgm.service.SysLog vo)
            throws Exception {
        return sysLogRepository.findById(vo.getRequstId())
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public Map<String, Object> selectSysLogInf(egovframework.let.sym.log.lgm.service.SysLog vo) throws Exception {
        Pageable pageable = PageRequest.of(vo.getPageIndex() - 1, vo.getPageUnit());

        Page<SysLog> page = sysLogRepository.searchSysLogs(
                vo.getSearchWrd(),
                vo.getSearchBgnDe(),
                vo.getSearchEndDe(),
                pageable);

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent().stream().map(this::convertToVo).toList());
        map.put("resultCnt", Integer.toString((int) page.getTotalElements()));
        return map;
    }

    private egovframework.let.sym.log.lgm.service.SysLog convertToVo(SysLog entity) {
        egovframework.let.sym.log.lgm.service.SysLog vo = new egovframework.let.sym.log.lgm.service.SysLog();
        vo.setRequstId(entity.getRequstId());
        vo.setSrvcNm(entity.getSrvcNm());
        vo.setMethodNm(entity.getMethodNm());
        vo.setProcessSeCode(entity.getProcessSeCode());
        vo.setProcessTime(entity.getProcessTime());
        vo.setRqesterId(entity.getRqesterId());
        vo.setRqesterIp(entity.getRqesterIp());
        vo.setOccrrncDe(entity.getOccrrncDe());
        // Note: processSeCodeNm, rqsterNm (User Name) are missing here unless joined.
        // This mirrors the LoginLog limitation.
        return vo;
    }
}
