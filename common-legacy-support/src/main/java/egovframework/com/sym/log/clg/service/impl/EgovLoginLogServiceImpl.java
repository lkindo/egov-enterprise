package egovframework.com.sym.log.clg.service.impl;

import java.time.LocalDateTime;
import java.util.HashMap;
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
 * ?????? ? ????? ?????
 * 
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version 1.0
 **/
@Service("EgovLoginLogService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovLoginLogServiceImpl extends EgovAbstractServiceImpl implements EgovLoginLogService {

	private final LoginLogRepository loginLogRepository;

	/** ID Generation **/
	@Resource(name = "egovLoginLogIdGnrService")
	private EgovIdGnrService egovLoginLogIdGnrService;

	/**
	 * ?????.
	 *
	 * @param loinLog
	 **/
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
	 * ??????.
	 *
	 * @param loginLog
	 * @return loginLog
	 * @throws Exception
	 **/
	@Override
	public LoginLog selectLoginLog(LoginLog loginLog) throws Exception {
		return loginLogRepository.findById(loginLog.getLogId())
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * ????????.
	 *
	 * @param loinLog
	 **/
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

	@Override
	@Transactional
	public void logInsertLoginLogSummary() throws Exception {
		loginLogRepository.insertLogSummary();
		loginLogRepository.deleteOldLogs(210); // Matches legacy logic
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
