package egovframework.com.sym.log.lgm.service.impl;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import com.company.project.domain.log.SysLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import egovframework.com.sym.log.lgm.service.EgovSysLogService;
import egovframework.com.sym.log.lgm.service.SysLog;
import jakarta.annotation.Resource;

/**
 * 로그관리(시스템)를 위한 서비스 구현 클래스
 * 
 * @author 공통 서비스 개발팀 이삼섭
 * @since 2009.03.11
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 개정이력(Modification Information) ==
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.03.11  이삼섭          최초 생성
 *   2025.07.11  이백행          2025년 컨트리뷰션 PMD로 소프트웨어 보안약점 진단하고 제거하기-LocalVariableNamingConventions(final이 아닌 변수는 밑줄을 포함할 수 없음)
 *
 *      </pre>
 */
@Service("EgovSysLogService")
@RequiredArgsConstructor
public class EgovSysLogServiceImpl extends EgovAbstractServiceImpl implements EgovSysLogService {

	private final SysLogRepository sysLogRepository;

	/** ID Generation */
	@Resource(name = "egovSysLogIdGnrService")
	private EgovIdGnrService egovSysLogIdGnrService;

	@Override
	@Transactional
	public void logInsertSysLog(SysLog sysLog) throws Exception {
		String requstId = egovSysLogIdGnrService.getNextStringId();
		sysLog.setRequstId(requstId);

		com.company.project.domain.log.SysLog entity = com.company.project.domain.log.SysLog.builder()
				.requstId(sysLog.getRequstId())
				.srvcNm(sysLog.getSrvcNm())
				.methodNm(sysLog.getMethodNm())
				.processSeCode(sysLog.getProcessSeCode())
				.processTime(sysLog.getProcessTime())
				.rqesterIp(sysLog.getRqesterIp())
				.rqesterId(sysLog.getRqesterId())
				.occrrncDe(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")))
				.rspnsCode(sysLog.getRspnsCode())
				.errorCode(sysLog.getErrorCode())
				.errorSe(sysLog.getErrorSe())
				.build();

		sysLogRepository.save(entity);
	}

	@Override
	@Transactional
	public void logInsertSysLogSummary() throws Exception {
		sysLogRepository.insertLogSummary();
		sysLogRepository.deleteOldLogs(210); // Matches legacy logic
	}

	@Override
	public Map<String, Object> selectSysLogInf(SysLog sysLog) throws Exception {
		Pageable pageable = PageRequest.of(sysLog.getPageIndex() - 1, sysLog.getRecordCountPerPage());
		Page<com.company.project.domain.log.SysLog> page = sysLogRepository.searchSysLogs(
				sysLog.getSearchWrd(), sysLog.getSearchBgnDe(), sysLog.getSearchEndDe(), pageable);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
		map.put("resultCnt", (int) page.getTotalElements());

		return map;
	}

	@Override
	public SysLog selectSysLog(SysLog sysLog) throws Exception {
		return sysLogRepository.findById(sysLog.getRequstId())
				.map(this::toVO)
				.orElse(null);
	}

	private SysLog toVO(com.company.project.domain.log.SysLog entity) {
		SysLog vo = new SysLog();
		vo.setRequstId(entity.getRequstId());
		vo.setSrvcNm(entity.getSrvcNm());
		vo.setMethodNm(entity.getMethodNm());
		vo.setProcessSeCode(entity.getProcessSeCode());
		vo.setProcessTime(entity.getProcessTime());
		vo.setRqesterIp(entity.getRqesterIp());
		vo.setRqesterId(entity.getRqesterId());
		if (entity.getOccrrncDe() != null) {
			vo.setOccrrncDe(entity.getOccrrncDe());
		}
		vo.setRspnsCode(entity.getRspnsCode());
		vo.setErrorCode(entity.getErrorCode());
		vo.setErrorSe(entity.getErrorSe());
		return vo;
	}

}