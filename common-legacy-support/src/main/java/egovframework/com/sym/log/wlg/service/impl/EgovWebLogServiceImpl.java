package egovframework.com.sym.log.wlg.service.impl;

import java.util.HashMap;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import com.company.project.domain.log.WebLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.annotation.Transactional;

import egovframework.com.sym.log.wlg.service.EgovWebLogService;
import egovframework.com.sym.log.wlg.service.WebLog;
import jakarta.annotation.Resource;

import java.time.LocalDateTime;

/**
 * @Class Name : EgovWebLogServiceImpl.java
 * @Description : ????? ? ????? ?????
 * @Modification Information
 *
 *               ????????????
 *               ------- ------- -------------------
 *               2009. 3. 11. ???????
 *               2011. 7. 01. ??????? ???sym.log -> sym.log.wlg)
 *
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 **/
@Service("EgovWebLogService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovWebLogServiceImpl extends EgovAbstractServiceImpl implements EgovWebLogService {

	private final WebLogRepository webLogRepository;

	/** ID Generation **/
	@Resource(name = "egovWebLogIdGnrService")
	private EgovIdGnrService egovWebLogIdGnrService;

	@Override
	@Transactional
	@Async("taskExecutor")
	public void logInsertWebLog(WebLog webLog) throws Exception {
		String requstId = egovWebLogIdGnrService.getNextStringId();
		webLog.setRequstId(requstId);

		com.company.project.domain.log.WebLog entity = com.company.project.domain.log.WebLog.builder()
				.requstId(webLog.getRequstId())
				.url(webLog.getUrl())
				.rqesterId(webLog.getRqesterId())
				.rqesterIp(webLog.getRqesterIp())
				.occrrncDe(LocalDateTime.now())
				.build();

		webLogRepository.save(entity);
	}

	@Override
	@Transactional
	@Async("taskExecutor")
	public void logInsertWebLogSummary() throws Exception {
		webLogRepository.insertLogSummary();
		webLogRepository.deleteOldLogs(210); // Matches legacy logic
	}

	@Override
	public WebLog selectWebLog(WebLog webLog) throws Exception {
		return webLogRepository.findById(webLog.getRequstId())
				.map(this::toVO)
				.orElse(null);
	}

	@Override
	public Map<String, Object> selectWebLogInf(WebLog webLog) throws Exception {
		Pageable pageable = PageRequest.of(webLog.getPageIndex() - 1, webLog.getRecordCountPerPage());
		Page<com.company.project.domain.log.WebLog> page = webLogRepository.searchWebLogs(
				webLog.getSearchWrd(), webLog.getSearchBgnDe(), webLog.getSearchEndDe(), pageable);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", page.getContent().stream().map(this::toVO).collect(java.util.stream.Collectors.toList()));
		map.put("resultCnt", (int) page.getTotalElements());

		return map;
	}

	private WebLog toVO(com.company.project.domain.log.WebLog entity) {
		WebLog vo = new WebLog();
		vo.setRequstId(entity.getRequstId());
		vo.setUrl(entity.getUrl());
		vo.setRqesterId(entity.getRqesterId());
		vo.setRqesterIp(entity.getRqesterIp());
		if (entity.getOccrrncDe() != null) {
			vo.setOccrrncDe(entity.getOccrrncDe().toString());
		}
		return vo;
	}

}
