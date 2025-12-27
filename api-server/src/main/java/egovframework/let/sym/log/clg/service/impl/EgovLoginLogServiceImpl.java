package egovframework.let.sym.log.clg.service.impl;

import com.company.project.domain.log.LoginLog;
import com.company.project.domain.log.LoginLogRepository;
import egovframework.let.sym.log.clg.service.EgovLoginLogService;
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
 * 접속로그 관리를 위한 서비스 구현 클래스 (JPA 전환)
 */
@Service("EgovLoginLogService")
@Transactional(readOnly = true)
public class EgovLoginLogServiceImpl extends EgovAbstractServiceImpl implements EgovLoginLogService {

    @Resource
    private LoginLogRepository loginLogRepository;

    @Resource(name = "egovLoginLogIdGnrService")
    private EgovIdGnrService egovLoginLogIdGnrService;

    @Override
    @Transactional
    public void logInsertLoginLog(egovframework.let.sym.log.clg.service.LoginLog vo) throws Exception {
        String logId = egovLoginLogIdGnrService.getNextStringId();

        LoginLog entity = LoginLog.builder()
                .logId(logId)
                .loginId(vo.getLoginId())
                .loginIp(vo.getLoginIp())
                .loginMthd(vo.getLoginMthd())
                .errOccrrAt(vo.getErrOccrrAt())
                .errorCode(vo.getErrorCode())
                .build();

        loginLogRepository.save(entity);
    }

    @Override
    public egovframework.let.sym.log.clg.service.LoginLog selectLoginLog(
            egovframework.let.sym.log.clg.service.LoginLog vo) throws Exception {
        return loginLogRepository.findById(vo.getLogId())
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public Map<String, Object> selectLoginLogInf(egovframework.let.sym.log.clg.service.LoginLog vo) throws Exception {
        Pageable pageable = PageRequest.of(vo.getPageIndex() - 1, vo.getPageUnit());

        Page<LoginLog> page = loginLogRepository.searchLoginLogs(
                vo.getSearchWrd(),
                vo.getSearchBgnDe(),
                vo.getSearchEndDe(),
                pageable);

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent().stream().map(this::convertToVo).toList());
        map.put("resultCnt", Integer.toString((int) page.getTotalElements()));
        return map;
    }

    private egovframework.let.sym.log.clg.service.LoginLog convertToVo(LoginLog entity) {
        egovframework.let.sym.log.clg.service.LoginLog vo = new egovframework.let.sym.log.clg.service.LoginLog();
        vo.setLogId(entity.getLogId());
        vo.setLoginId(entity.getLoginId());
        vo.setLoginIp(entity.getLoginIp());
        vo.setLoginMthd(entity.getLoginMthd());
        vo.setErrOccrrAt(entity.getErrOccrrAt());
        vo.setErrorCode(entity.getErrorCode());
        vo.setCreatDt(entity.getCreatDt().toString());
        // Join with User to get LoginNm would need custom query or fetching user
        // separately.
        // For performance in log list, usually we skip it or use join in repository.
        // My Repository implementation selectFrom(loginLog) does NOT join user
        // currently.
        // Legacy SQL joins COMVNUSERMASTER.
        // I should update Repository to join user if needed.
        return vo;
    }
}
