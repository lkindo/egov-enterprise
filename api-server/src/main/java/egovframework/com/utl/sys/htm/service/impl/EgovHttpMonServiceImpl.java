package egovframework.com.utl.sys.htm.service.impl;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.monitoring.HttpMonitoring;
import com.company.project.domain.monitoring.HttpMonitoringLog;
import com.company.project.domain.monitoring.HttpMonitoringLogRepository;
import com.company.project.domain.monitoring.HttpMonitoringRepository;

import egovframework.com.utl.sys.htm.service.EgovHttpMonService;
import egovframework.com.utl.sys.htm.service.HttpMon;
import egovframework.com.utl.sys.htm.service.HttpMonLog;
import egovframework.com.utl.sys.htm.service.HttpMonLogVO;
import egovframework.com.utl.sys.htm.service.HttpMonVO;
import lombok.RequiredArgsConstructor;

/**
 * HTTP서비스모니터링관리에 대한 ServiceImpl 클래스
 * 
 * @author 김진만
 * @since 2010.06.21
 * @version 1.1
 */
@Service("EgovHttpMonService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovHttpMonServiceImpl extends EgovAbstractServiceImpl implements EgovHttpMonService {

	private final HttpMonitoringRepository httpMonitoringRepository;
	private final HttpMonitoringLogRepository httpMonitoringLogRepository;

	@Override
	@Transactional
	public void deleteHttpMon(HttpMon vo) throws Exception {
		httpMonitoringRepository.findById(vo.getSysId()).ifPresent(HttpMonitoring::delete);
	}

	@Override
	@Transactional
	public void insertHttpMon(HttpMon vo) throws Exception {
		HttpMonitoring entity = HttpMonitoring.builder()
				.sysId(vo.getSysId())
				.webKind(vo.getWebKind())
				.siteUrl(vo.getSiteUrl())
				.httpSttusCd(vo.getHttpSttusCd())
				.mngrNm(vo.getMngrNm())
				.mngrEmailAddr(vo.getMngrEmailAddr())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
		httpMonitoringRepository.save(entity);
	}

	@Override
	@Transactional
	public void insertHttpMonLog(HttpMonLog vo) throws Exception {
		HttpMonitoringLog entity = HttpMonitoringLog.builder()
				.logId(vo.getLogId())
				.sysId(vo.getSysId())
				.webKind(vo.getWebKind())
				.siteUrl(vo.getSiteUrl())
				.httpSttusCd(vo.getHttpSttusCd())
				.creatDt(vo.getCreatDt() != null ? java.time.LocalDateTime.parse(vo.getCreatDt())
						: java.time.LocalDateTime.now())
				.logInfo(vo.getLogInfo())
				.mngrNm(vo.getMngrNm())
				.mngrEmailAddr(vo.getMngrEmailAddr())
				.frstRegisterId(vo.getFrstRegisterId())
				.frstRegisterPnttm(
						vo.getFrstRegisterPnttm() != null ? java.time.LocalDateTime.parse(vo.getFrstRegisterPnttm())
								: java.time.LocalDateTime.now())
				.build();
		httpMonitoringLogRepository.save(entity);
	}

	@Override
	public HttpMonVO selectHttpMonDetail(HttpMon vo) throws Exception {
		return httpMonitoringRepository.findById(vo.getSysId())
				.map(this::toVO)
				.orElse(null);
	}

	@Override
	public HttpMonLogVO selectHttpMonDetailLog(HttpMonLog vo) throws Exception {
		return httpMonitoringLogRepository.findById(vo.getLogId())
				.map(this::toLogVO)
				.orElse(null);
	}

	@Override
	public List<HttpMonVO> selectHttpMonList(HttpMonVO searchVO) throws Exception {
		return httpMonitoringRepository
				.findAll(PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage(),
						Sort.by("createdDate").descending()))
				.getContent().stream()
				.filter(e -> "N".equals(e.getDeleteAt()))
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	public Map<String, Object> selectHttpMonLogList(HttpMonLogVO httpMonLogVO) throws Exception {
		List<HttpMonLogVO> result = httpMonitoringLogRepository
				.findAll(PageRequest.of(httpMonLogVO.getPageIndex() - 1, httpMonLogVO.getRecordCountPerPage(),
						Sort.by("createdDate").descending()))
				.getContent().stream()
				.map(this::toLogVO)
				.collect(Collectors.toList());

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", result);
		map.put("resultCnt", httpMonitoringLogRepository.count());
		return map;
	}

	public int selectHttpMonLogTotCnt(HttpMonLogVO searchVO) throws Exception {
		return (int) httpMonitoringLogRepository.count();
	}

	@Override
	public int selectHttpMonTotCnt(HttpMonVO searchVO) throws Exception {
		return (int) httpMonitoringRepository.count(); // TBD: filter deleteAt if needed
	}

	@Override
	@Transactional
	public void updateHttpMon(HttpMon vo) throws Exception {
		httpMonitoringRepository.findById(vo.getSysId()).ifPresent(e -> {
			e.update(vo.getWebKind(), vo.getSiteUrl(), vo.getMngrNm(), vo.getMngrEmailAddr(), vo.getLastUpdusrId());
		});
	}

	@Override
	@Transactional
	public void updateHttpMonSttus(HttpMon vo) throws Exception {
		httpMonitoringRepository.findById(vo.getSysId()).ifPresent(e -> {
			e.updateStatus(vo.getHttpSttusCd(), vo.getCreatDt() != null ? java.time.LocalDateTime.parse(vo.getCreatDt())
					: java.time.LocalDateTime.now(), vo.getLastUpdusrId());
		});
	}

	private HttpMonVO toVO(HttpMonitoring entity) {
		HttpMonVO vo = new HttpMonVO();
		vo.setSysId(entity.getSysId());
		vo.setWebKind(entity.getWebKind());
		vo.setSiteUrl(entity.getSiteUrl());
		vo.setHttpSttusCd(entity.getHttpSttusCd());
		vo.setMngrNm(entity.getMngrNm());
		vo.setMngrEmailAddr(entity.getMngrEmailAddr());
		return vo;
	}

	private HttpMonLogVO toLogVO(HttpMonitoringLog entity) {
		HttpMonLogVO vo = new HttpMonLogVO();
		vo.setLogId(entity.getLogId());
		vo.setSysId(entity.getSysId());
		vo.setWebKind(entity.getWebKind());
		vo.setSiteUrl(entity.getSiteUrl());
		vo.setHttpSttusCd(entity.getHttpSttusCd());
		vo.setLogInfo(entity.getLogInfo());
		vo.setMngrNm(entity.getMngrNm());
		vo.setMngrEmailAddr(entity.getMngrEmailAddr());
		return vo;
	}
}
