package egovframework.com.sym.log.clg.service.impl;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.log.LoginLogRepository;

import egovframework.com.sym.log.clg.service.EgovLoginLogService;
import egovframework.com.sym.log.clg.service.LoginLog;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * 접속로그 관리를 위한 서비스 구현 클래스
 * 
 * @author 공통 서비스 개발팀 이삼섭
 * @since 2009. 3. 11.
 * @version 1.0
 */
@Service("EgovLoginLogService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovLoginLogServiceImpl extends EgovAbstractServiceImpl implements EgovLoginLogService {

	private final LoginLogRepository loginLogRepository;

	/** ID Generation */
	@Resource(name = "egovLoginLogIdGnrService")
	private EgovIdGnrService egovLoginLogIdGnrService;

	/**
	 * 접속로그를 기록한다.
	 *
	 * @param loinLog
	 */
	@Override
	@Transactional
	public void logInsertLoginLog(LoginLog loinLog) throws Exception {
		String logId = egovLoginLogIdGnrService.getNextStringId();

		com.company.project.domain.log.LoginLog entity = com.company.project.domain.log.LoginLog.builder()
				.logId(logId)
				.loginId(loinLog.getLoginId())
				.loginIp(loinLog.getLoginIp())
				.loginMthd(loinLog.getLoginMthd())
				.errOccrrAt(loinLog.getErrOccrrAt())
				.errorCode(loinLog.getErrorCode())
				.creatDt(LocalDateTime.now())
				.build();

		loginLogRepository.save(entity);
	}

	/**
	 * 접속로그를 조회한다.
	 *
	 * @param loginLog
	 * @return loginLog
	 * @throws Exception
	 */
	@Override
	public LoginLog selectLoginLog(LoginLog loginLog) throws Exception {
		return loginLogRepository.findById(loginLog.getLogId())
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 접속로그 목록을 조회한다.
	 *
	 * @param loinLog
	 */
	@Override
	public Map<String, Object> selectLoginLogInf(LoginLog loinLog) throws Exception {
		Pageable pageable = PageRequest.of(loinLog.getPageIndex() - 1, loinLog.getPageUnit(),
				Sort.by("creatDt").descending());

		Page<com.company.project.domain.log.LoginLog> page = loginLogRepository.searchLoginLogs(
				loinLog.getSearchWrd(),
				loinLog.getSearchBgnDe(),
				loinLog.getSearchEndDe(),
				pageable);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
		map.put("resultCnt", (int) page.getTotalElements());

		return map;
	}

	private LoginLog toVO(com.company.project.domain.log.LoginLog entity) {
		LoginLog vo = new LoginLog();
		vo.setLogId(entity.getLogId());
		vo.setLoginId(entity.getLoginId());
		vo.setLoginIp(entity.getLoginIp());
		vo.setLoginMthd(entity.getLoginMthd());
		vo.setErrOccrrAt(entity.getErrOccrrAt());
		vo.setErrorCode(entity.getErrorCode());
		if (entity.getCreatDt() != null) {
			vo.setCreatDt(entity.getCreatDt().toString());
		}
		return vo;
	}
}
