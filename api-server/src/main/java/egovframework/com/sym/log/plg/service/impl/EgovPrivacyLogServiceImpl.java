package egovframework.com.sym.log.plg.service.impl;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.log.PrivacyLogRepository;

import egovframework.com.sym.log.plg.service.EgovPrivacyLogService;
import egovframework.com.sym.log.plg.service.PrivacyLog;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * @Class Name : EgovPrivacyLogServiceImpl.java
 * @Description : 개인정보 조회 이력 관리를 위한 구현 클래스
 * @Modification Information
 *
 *               수정일 수정자 수정내용
 *               ------- ------- -------------------
 *               2014.09.11 표준프레임워크 최초생성
 *               2026.02.11 antigravity JPA/QueryDSL migration
 * @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 */
@Service("egovPrivacyLogService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovPrivacyLogServiceImpl extends EgovAbstractServiceImpl implements EgovPrivacyLogService {

	private final PrivacyLogRepository privacyLogRepository;

	/** ID Generation */
	@Resource(name = "egovPrivacyLogIdGnrService")
	private EgovIdGnrService egovPrivacyLogIdGnrService;

	/**
	 * 개인정보조회 로그정보를 생성한다.
	 *
	 * @param privacyLog
	 */
	@Override
	@Transactional
	public void innerInsertPrivacyLog(PrivacyLog privacyLog) throws Exception {

		privacyLog.setRequestId(egovPrivacyLogIdGnrService.getNextStringId());

		com.company.project.domain.log.PrivacyLog entity = com.company.project.domain.log.PrivacyLog.builder()
				.requestId(privacyLog.getRequestId())
				.inquiryDatetime(LocalDateTime.now())
				.serviceName(privacyLog.getServiceName())
				.inquiryInfo(privacyLog.getInquiryInfo())
				.requesterId(privacyLog.getRequesterId())
				.requesterIp(privacyLog.getRequesterIp())
				.build();

		privacyLogRepository.save(entity);
	}

	/**
	 * 개인정보조회 로그정보 상제정보를 조회한다.
	 *
	 * @param privacyLog
	 * @return privacyLog
	 * @throws Exception
	 */
	@Override
	public Map<String, Object> selectPrivacyLogList(PrivacyLog privacyLog) throws Exception {
		Pageable pageable = PageRequest.of(privacyLog.getPageIndex() - 1, privacyLog.getRecordCountPerPage());
		Page<com.company.project.domain.log.PrivacyLog> page = privacyLogRepository.searchPrivacyLogs(
				privacyLog.getSearchWord(), privacyLog.getSearchBeginDate(), privacyLog.getSearchEndDate(), pageable);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", page.getContent().stream().map(this::toVO).collect(Collectors.toList()));
		map.put("resultCnt", Long.toString(page.getTotalElements()));

		return map;
	}

	/**
	 * 개인정보조회 로그정보 목록을 조회한다.
	 *
	 * @param privacyLog
	 */
	@Override
	public PrivacyLog selectPrivacyLog(PrivacyLog privacyLog) throws Exception {
		return privacyLogRepository.findById(privacyLog.getRequestId())
				.map(this::toVO)
				.orElse(null);
	}

	private PrivacyLog toVO(com.company.project.domain.log.PrivacyLog entity) {
		PrivacyLog vo = new PrivacyLog();
		vo.setRequestId(entity.getRequestId());
		if (entity.getInquiryDatetime() != null) {
			vo.setInquiryDatetime(
					entity.getInquiryDatetime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
		}
		vo.setServiceName(entity.getServiceName());
		vo.setInquiryInfo(entity.getInquiryInfo());
		vo.setRequesterId(entity.getRequesterId());
		vo.setRequesterIp(entity.getRequesterIp());
		return vo;
	}

}
