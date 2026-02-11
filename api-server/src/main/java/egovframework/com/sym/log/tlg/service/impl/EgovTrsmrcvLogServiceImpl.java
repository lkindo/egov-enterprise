package egovframework.com.sym.log.tlg.service.impl;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.integration.TransmitReceiveLog;
import com.company.project.domain.integration.TransmitReceiveLogRepository;

import egovframework.com.sym.log.tlg.service.EgovTrsmrcvLogService;
import egovframework.com.sym.log.tlg.service.TrsmrcvLog;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * @Class Name : EgovTrsmrcvLogServiceImpl.java
 * @Description : 송수신 로그 관리를 위한 서비스 구현 클래스
 * @Modification Information
 *
 *               수정일 수정자 수정내용
 *               ------- ------- -------------------
 *               2009. 3. 11. 이삼섭 최초생성
 *               2011. 7. 01. 이기하 패키지 분리(sym.log -> sym.log.tlg)
```java
 *               2026. 02. 11. antigravity JPA migration (QueryDSL)
```
 *
 * @author 공통 서비스 개발팀 이삼섭
 * @since 2009. 3. 11.
 * @version 1.1
 * @see
 *
 */
@Service("EgovTrsmrcvLogService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovTrsmrcvLogServiceImpl extends EgovAbstractServiceImpl implements EgovTrsmrcvLogService {

	private final TransmitReceiveLogRepository transmitReceiveLogRepository;

	/** ID Generation */
	@Resource(name = "egovTrsmrcvLogIdGnrService")
	private EgovIdGnrService egovTrsmrcvLogIdGnrService;

	/**
	 * 송수신로그 정보를 생성한다.
	 */
	@Override
	@Transactional
	public void logInsertTrsmrcvLog(TrsmrcvLog trsmrcvLog) throws Exception {
		String requstId = egovTrsmrcvLogIdGnrService.getNextStringId();
		trsmrcvLog.setRequstId(requstId);

		TransmitReceiveLog entity = TransmitReceiveLog.builder()
				.requestId(trsmrcvLog.getRequstId())
				.occurrenceDe(trsmrcvLog.getOccrrncDe())
				.transmitReceiveSeCode(trsmrcvLog.getTrsmrcvSeCode())
				.cntcId(trsmrcvLog.getcntcId())
				.provdInsttId(trsmrcvLog.getProvdInsttId())
				.provdSysId(trsmrcvLog.getProvdSysId())
				.provdSvcId(trsmrcvLog.getProvdSvcId())
				.requstInsttId(trsmrcvLog.getRequstInsttId())
				.requstSysId(trsmrcvLog.getRequstSysId())
				.requestTransmitTm(trsmrcvLog.getRequstTrnsmitTm())
				.requestRecvTm(trsmrcvLog.getRequstRecptnTm())
				.responseTransmitTm(trsmrcvLog.getRspnsTrnsmitTm())
				.responseRecvTm(trsmrcvLog.getRspnsRecptnTm())
				.resultCode(trsmrcvLog.getResultCode())
				.resultMessage(trsmrcvLog.getResultMessage())
				.frstRegisterId(trsmrcvLog.getRqesterId())
				.build();

		transmitReceiveLogRepository.save(entity);
	}

	/**
	 * 송수신 로그정보를 요약한다.
	 */
	@Override
	@Transactional
	public void logInsertTrsmrcvLogSummary() throws Exception {
		transmitReceiveLogRepository.insertLogSummary();
		transmitReceiveLogRepository.deleteOldLogs(210);
	}

	/**
	 * 송수신 로그정보를 조회한다.
	 */
	@Override
	public TrsmrcvLog selectTrsmrcvLog(TrsmrcvLog trsmrcvLog) throws Exception {
		return transmitReceiveLogRepository.findById(trsmrcvLog.getRequstId())
				.map(e -> {
					TrsmrcvLog res = new TrsmrcvLog();
					res.setRequstId(e.getRequestId());
					res.setOccrrncDe(e.getOccurrenceDe());
					res.setTrsmrcvSeCode(e.getTransmitReceiveSeCode());
					res.setcntcId(e.getCntcId());
					res.setProvdInsttId(e.getProvdInsttId());
					res.setProvdSysId(e.getProvdSysId());
					res.setProvdSvcId(e.getProvdSvcId());
					res.setRequstInsttId(e.getRequstInsttId());
					res.setRequstSysId(e.getRequstSysId());
					res.setRequstTrnsmitTm(e.getRequestTransmitTm());
					res.setRequstRecptnTm(e.getRequestRecvTm());
					res.setRspnsTrnsmitTm(e.getResponseTransmitTm());
					res.setRspnsRecptnTm(e.getResponseRecvTm());
					res.setResultCode(e.getResultCode());
					res.setResultMessage(e.getResultMessage());
					if (e.getFrstRegistPnttm() != null) {
						res.setFrstRegisterPnttm(
								e.getFrstRegistPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
					}
					res.setRqesterId(e.getFrstRegisterId());
					return res;
				}).orElse(null);
	}

	/**
	 * 송수신 로그정보 목록을 조회한다.
	 */
	@Override
	public Map<String, Object> selectTrsmrcvLogInf(TrsmrcvLog trsmrcvLog) throws Exception {
		List<TransmitReceiveLog> entities = transmitReceiveLogRepository.searchLogs(
				trsmrcvLog.getSearchWrd(),
				trsmrcvLog.getSearchBgnDe(),
				trsmrcvLog.getSearchEndDe(),
				trsmrcvLog.getFirstIndex(),
				trsmrcvLog.getRecordCountPerPage());

		List<TrsmrcvLog> resultList = entities.stream()
				.map(e -> {
					TrsmrcvLog res = new TrsmrcvLog();
					res.setRequstId(e.getRequestId());
					res.setOccrrncDe(e.getOccurrenceDe());
					res.setTrsmrcvSeCode(e.getTransmitReceiveSeCode());
					res.setcntcId(e.getCntcId());
					res.setProvdInsttId(e.getProvdInsttId());
					res.setProvdSysId(e.getProvdSysId());
					res.setProvdSvcId(e.getProvdSvcId());
					res.setRequstInsttId(e.getRequstInsttId());
					res.setRequstSysId(e.getRequstSysId());
					res.setRequstTrnsmitTm(e.getRequestTransmitTm());
					res.setRequstRecptnTm(e.getRequestRecvTm());
					res.setRspnsTrnsmitTm(e.getResponseTransmitTm());
					res.setRspnsRecptnTm(e.getResponseRecvTm());
					res.setResultCode(e.getResultCode());
					res.setResultMessage(e.getResultMessage());
					if (e.getFrstRegistPnttm() != null) {
						res.setFrstRegisterPnttm(
								e.getFrstRegistPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
					}
					res.setRqesterId(e.getFrstRegisterId());
					return res;
				}).collect(Collectors.toList());

		long totCnt = transmitReceiveLogRepository.countLogs(
				trsmrcvLog.getSearchWrd(),
				trsmrcvLog.getSearchBgnDe(),
				trsmrcvLog.getSearchEndDe());

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", resultList);
		map.put("resultCnt", (int) totCnt);

		return map;
	}

}
