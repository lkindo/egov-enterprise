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
    private com.company.project.service.log.LogManageService logManageService;

    @Resource(name = "egovSysLogIdGnrService")
    private EgovIdGnrService egovSysLogIdGnrService;

    @Override
    @Transactional
    public void logInsertSysLog(egovframework.let.sym.log.lgm.service.SysLog vo) throws Exception {
        String requstId = egovSysLogIdGnrService.getNextStringId();

        com.company.project.service.log.dto.SysLogDto dto = com.company.project.service.log.dto.SysLogDto.builder()
                .requstId(requstId)
                .srvcNm(vo.getSrvcNm())
                .methodNm(vo.getMethodNm())
                .processSeCode(vo.getProcessSeCode())
                .processTime(vo.getProcessTime())
                .rqesterId(vo.getRqesterId())
                .rqesterIp(vo.getRqesterIp())
                .build();

        logManageService.insertSysLog(dto);
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
        com.company.project.service.log.dto.SysLogDto dto = logManageService.selectSysLog(vo.getRequstId());
        return dto != null ? convertToVo(dto) : null;
    }

    @Override
    public Map<String, Object> selectSysLogInf(egovframework.let.sym.log.lgm.service.SysLog vo) throws Exception {
        egovframework.com.cmm.ComDefaultVO searchVO = new egovframework.com.cmm.ComDefaultVO();
        searchVO.setSearchKeyword(vo.getSearchWrd());
        searchVO.setPageIndex(vo.getPageIndex());
        searchVO.setPageUnit(vo.getPageUnit());

        java.util.List<com.company.project.service.log.dto.SysLogDto> list = logManageService
                .selectSysLogList(searchVO);
        int totCnt = logManageService.selectSysLogListTotCnt(searchVO);

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", list.stream().map(this::convertToVo).toList());
        map.put("resultCnt", Integer.toString(totCnt));
        return map;
    }

    private egovframework.let.sym.log.lgm.service.SysLog convertToVo(
            com.company.project.service.log.dto.SysLogDto dto) {
        egovframework.let.sym.log.lgm.service.SysLog vo = new egovframework.let.sym.log.lgm.service.SysLog();
        vo.setRequstId(dto.getRequstId());
        vo.setSrvcNm(dto.getSrvcNm());
        vo.setMethodNm(dto.getMethodNm());
        vo.setProcessSeCode(dto.getProcessSeCode());
        vo.setProcessTime(dto.getProcessTime());
        vo.setRqesterId(dto.getRqesterId());
        vo.setRqesterIp(dto.getRqesterIp());
        vo.setOccrrncDe(dto.getOccrrncDe());
        return vo;
    }
}
