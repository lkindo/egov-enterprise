package egovframework.com.utl.sys.trm.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.monitoring.TrsmrcvMonitoring;
import com.company.project.domain.monitoring.TrsmrcvMonitoringLog;
import com.company.project.domain.monitoring.TrsmrcvMonitoringLogRepository;
import com.company.project.domain.monitoring.TrsmrcvMonitoringRepository;

import egovframework.com.utl.sys.trm.service.CntcVO;
import egovframework.com.utl.sys.trm.service.EgovTrsmrcvMntrngService;
import egovframework.com.utl.sys.trm.service.TrsmrcvMntrng;
import egovframework.com.utl.sys.trm.service.TrsmrcvMntrngLog;
import lombok.RequiredArgsConstructor;

/**
 * 송수신모니터링관리에 대한 ServiceImpl 클래스를 정의한다.
 *
 * @author 김진만
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 오전 10:27:13
 * @see
 * 
 *      <pre>
 * == 개정이력(Modification Information) ==
 *
 *   수정일       수정자           수정내용
 *  -------     --------    ---------------------------
 *  2010.06.21   김진만     최초 생성
 *      </pre>
 */
@Service("EgovTrsmrcvMntrngService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovTrsmrcvMntrngServiceImpl extends EgovAbstractServiceImpl implements EgovTrsmrcvMntrngService {

	private final TrsmrcvMonitoringRepository trsmrcvMonitoringRepository;
	private final TrsmrcvMonitoringLogRepository trsmrcvMonitoringLogRepository;

	/**
	 * 송수신모니터링을 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng) throws Exception {
		trsmrcvMonitoringRepository.deleteById(trsmrcvMntrng.getCntcId());
	}

	/**
	 * 송수신모니터링을 등록한다.
	 */
	@Override
	@Transactional
	public void insertTrsmrcvMntrng(TrsmrcvMntrng vo) throws Exception {
		TrsmrcvMonitoring entity = TrsmrcvMonitoring.builder()
				.cntcId(vo.getCntcId())
				.testClassNm(vo.getTestClassNm())
				.mngrNm(vo.getMngrNm())
				.mngrEmailAddr(vo.getMngrEmailAddr())
				.mntrngSttus("01") // 상태 초기치
				.lastUpdusrId(vo.getLastUpdusrId())
				.lastUpdusrPnttm(LocalDateTime.now())
				.creatDt(LocalDateTime.now())
				.frstRegisterId(vo.getFrstRegisterId())
				.frstRegisterPnttm(LocalDateTime.now())
				.build();
		trsmrcvMonitoringRepository.save(entity);
	}

	/**
	 * 송수신모니터링로그를 등록한다.
	 */
	@Override
	@Transactional
	public void insertTrsmrcvMntrngLog(TrsmrcvMntrngLog vo) throws Exception {
		TrsmrcvMonitoringLog entity = TrsmrcvMonitoringLog.builder()
				.logId(vo.getLogId())
				.cntcId(vo.getCntcId())
				.testClassNm(vo.getTestClassNm())
				.mngrNm(vo.getMngrNm())
				.mngrEmailAddr(vo.getMngrEmailAddr())
				.mntrngSttus(vo.getMntrngSttus())
				.logInfo(vo.getLogInfo())
				.lastUpdusrId(vo.getLastUpdusrId())
				.lastUpdusrPnttm(LocalDateTime.now())
				.creatDt(LocalDateTime.now())
				.frstRegisterId(vo.getFrstRegisterId())
				.frstRegisterPnttm(LocalDateTime.now())
				.build();
		trsmrcvMonitoringLogRepository.save(entity);
	}

	/**
	 * 송수신모니터링을 상세조회 한다.
	 */
	@Override
	public TrsmrcvMntrng selectTrsmrcvMntrng(TrsmrcvMntrng vo) throws Exception {
		Object[] result = trsmrcvMonitoringRepository.selectTrsmrcvMntrng(vo.getCntcId());
		return result != null ? mapToTrsmrcvMntrng(result) : null;
	}

	/**
	 * 송수신모니터링로그를 상세조회 한다.
	 */
	@Override
	public TrsmrcvMntrngLog selectTrsmrcvMntrngLog(TrsmrcvMntrngLog vo) throws Exception {
		Object[] result = trsmrcvMonitoringLogRepository.selectTrsmrcvMntrngLog(vo.getLogId());
		return result != null ? mapToLogVO(result) : null;
	}

	/**
	 * 송수신모니터링의 목록을 조회 한다.
	 */
	@Override
	public List<TrsmrcvMntrng> selectTrsmrcvMntrngList(TrsmrcvMntrng searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
				searchVO.getRecordCountPerPage());
		Page<Object[]> page = trsmrcvMonitoringRepository.selectTrsmrcvMntrngList(
				String.valueOf(searchVO.getSearchCondition()), searchVO.getSearchKeyword(), pageable);
		return page.getContent().stream().map(this::mapToTrsmrcvMntrng).collect(Collectors.toList());
	}

	/**
	 * 송수신모니터링 목록 전체 건수를(을) 조회한다.
	 */
	@Override
	public int selectTrsmrcvMntrngListCnt(TrsmrcvMntrng searchVO) throws Exception {
		Pageable pageable = PageRequest.of(0, 1);
		return (int) trsmrcvMonitoringRepository.selectTrsmrcvMntrngList(
				String.valueOf(searchVO.getSearchCondition()), searchVO.getSearchKeyword(), pageable)
				.getTotalElements();
	}

	/**
	 * 송수신모니터링로그의 목록을 조회 한다.
	 */
	@Override
	public List<TrsmrcvMntrngLog> selectTrsmrcvMntrngLogList(TrsmrcvMntrngLog searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
				searchVO.getRecordCountPerPage());
		Page<Object[]> page = trsmrcvMonitoringLogRepository.selectTrsmrcvMntrngLogList(
				searchVO.getSearchKeywordFrom(), searchVO.getSearchKeywordTo(),
				String.valueOf(searchVO.getSearchCondition()), searchVO.getSearchKeyword(), pageable);
		return page.getContent().stream().map(this::mapToLogVO).collect(Collectors.toList());
	}

	/**
	 * 송수신모니터링로그 목록 전체 건수를(을) 조회한다.
	 */
	@Override
	public int selectTrsmrcvMntrngLogListCnt(TrsmrcvMntrngLog searchVO) throws Exception {
		Pageable pageable = PageRequest.of(0, 1);
		return (int) trsmrcvMonitoringLogRepository.selectTrsmrcvMntrngLogList(
				searchVO.getSearchKeywordFrom(), searchVO.getSearchKeywordTo(),
				String.valueOf(searchVO.getSearchCondition()), searchVO.getSearchKeyword(), pageable)
				.getTotalElements();
	}

	/**
	 * 송수신모니터링정보를 수정한다.
	 */
	@Override
	@Transactional
	public void updateTrsmrcvMntrng(TrsmrcvMntrng vo) throws Exception {
		trsmrcvMonitoringRepository.findById(vo.getCntcId()).ifPresent(e -> {
			e.update(vo.getTestClassNm(), vo.getMngrNm(), vo.getMngrEmailAddr(), vo.getMntrngSttus(),
					vo.getLastUpdusrId());
		});
	}

	/**
	 * 연계정보 목록을 조회한다.
	 */
	@Override
	public List<CntcVO> selectCntcList(CntcVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getFirstIndex() / searchVO.getRecordCountPerPage(),
				searchVO.getRecordCountPerPage());
		Page<Object[]> page = trsmrcvMonitoringRepository.selectCntcList(
				String.valueOf(searchVO.getSearchCondition()), searchVO.getSearchKeyword(), pageable);
		return page.getContent().stream().map(this::mapToCntcVO).collect(Collectors.toList());
	}

	/**
	 * 연계정보 목록 전체 건수를(을) 조회한다.
	 */
	@Override
	public int selectCntcListCnt(CntcVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(0, 1);
		return (int) trsmrcvMonitoringRepository.selectCntcList(
				String.valueOf(searchVO.getSearchCondition()), searchVO.getSearchKeyword(), pageable)
				.getTotalElements();
	}

	private TrsmrcvMntrng mapToTrsmrcvMntrng(Object[] row) {
		TrsmrcvMntrng vo = new TrsmrcvMntrng();
		vo.setCntcId((String) row[0]);
		vo.setTestClassNm((String) row[1]);
		vo.setMngrNm((String) row[2]);
		vo.setMngrEmailAddr((String) row[3]);
		vo.setMntrngSttus((String) row[4]);
		vo.setLastUpdusrPnttm(row[5] != null ? row[5].toString() : null);
		vo.setLastUpdusrId((String) row[6]);
		vo.setFrstRegisterId((String) row[7]);
		vo.setFrstRegisterPnttm(row[8] != null ? row[8].toString() : null);
		vo.setCreatDt(row[9] != null ? row[9].toString() : null);
		vo.setMntrngSttusNm((String) row[10]);
		vo.setCntcNm((String) row[11]);
		vo.setProvdInsttNm((String) row[12]);
		vo.setProvdSysNm((String) row[13]);
		vo.setProvdSvcNm((String) row[14]);
		vo.setRequstInsttNm((String) row[15]);
		vo.setRequstSysNm((String) row[16]);
		return vo;
	}

	private TrsmrcvMntrngLog mapToLogVO(Object[] row) {
		TrsmrcvMntrngLog vo = new TrsmrcvMntrngLog();
		vo.setLogId((String) row[0]);
		vo.setCntcId((String) row[1]);
		vo.setTestClassNm((String) row[2]);
		vo.setMngrNm((String) row[3]);
		vo.setMngrEmailAddr((String) row[4]);
		vo.setMntrngSttus((String) row[5]);
		vo.setLastUpdusrPnttm(row[6] != null ? row[6].toString() : null);
		vo.setLastUpdusrId((String) row[7]);
		vo.setFrstRegisterId((String) row[8]);
		vo.setFrstRegisterPnttm(row[9] != null ? row[9].toString() : null);
		vo.setCreatDt(row[10] != null ? row[10].toString() : null);
		vo.setLogInfo((String) row[11]);
		vo.setMntrngSttusNm((String) row[12]);
		vo.setCntcNm((String) row[13]);
		vo.setProvdInsttNm((String) row[14]);
		vo.setProvdSysNm((String) row[15]);
		vo.setProvdSvcNm((String) row[16]);
		vo.setRequstInsttNm((String) row[17]);
		vo.setRequstSysNm((String) row[18]);
		return vo;
	}

	private CntcVO mapToCntcVO(Object[] row) {
		CntcVO vo = new CntcVO();
		vo.setCntcId((String) row[0]);
		vo.setCntcNm((String) row[1]);
		// Skip indices 2-7 as they are IDs not in CntcVO result mapping
		vo.setProvdInsttNm((String) row[8]);
		vo.setProvdSysNm((String) row[9]);
		vo.setProvdSvcNm((String) row[10]);
		vo.setRequstInsttNm((String) row[11]);
		vo.setRequstSysNm((String) row[12]);
		return vo;
	}
}