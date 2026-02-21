package egovframework.com.utl.sys.prm.service.impl;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.monitoring.ProcessMonitoring;
import com.company.project.domain.monitoring.ProcessMonitoringLog;
import com.company.project.domain.monitoring.ProcessMonitoringLogRepository;
import com.company.project.domain.monitoring.ProcessMonitoringRepository;

import egovframework.com.utl.sys.prm.service.EgovProcessMonService;
import egovframework.com.utl.sys.prm.service.ProcessMon;
import egovframework.com.utl.sys.prm.service.ProcessMonLog;
import egovframework.com.utl.sys.prm.service.ProcessMonLogVO;
import egovframework.com.utl.sys.prm.service.ProcessMonVO;
import lombok.RequiredArgsConstructor;

/**
 * ?????? ????ServiceImpl ?????
 * 
 * @author ?
 * @since 2010.06.21
 * @version 1.1
 **/
@Service("EgovProcessMonService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovProcessMonServiceImpl extends EgovAbstractServiceImpl implements EgovProcessMonService {

	private final ProcessMonitoringRepository processMonitoringRepository;
	private final ProcessMonitoringLogRepository processMonitoringLogRepository;

	@Override
	@Transactional
	public void deleteProcessMon(ProcessMon vo) throws Exception {
		processMonitoringRepository.deleteById(vo.getProcessId());
	}

	@Override
	@Transactional
	public void insertProcessMon(ProcessMon vo) throws Exception {
		ProcessMonitoring entity = ProcessMonitoring.builder()
				.processId(vo.getProcessId())
				.processNm(vo.getProcessNm())
				.procsSttus(vo.getProcsSttus())
				.creatDt(vo.getCreatDt() != null ? java.time.LocalDateTime.parse(vo.getCreatDt())
						: java.time.LocalDateTime.now())
				.mngrNm(vo.getMngrNm())
				.mngrEmailAddr(vo.getMngrEmailAddr())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
		processMonitoringRepository.save(entity);
	}

	@Override
	@Transactional
	public void insertProcessMonLog(ProcessMonLog vo) throws Exception {
		ProcessMonitoringLog entity = ProcessMonitoringLog.builder()
				.logId(vo.getLogId())
				.processId(vo.getProcessId())
				.processNm(vo.getProcessNm())
				.procsSttus(vo.getProcsSttus())
				.logInfo(vo.getLogInfo())
				.mngrNm(vo.getMngrNm())
				.mngrEmailAddr(vo.getMngrEmailAddr())
				.creatDt(vo.getCreatDt() != null ? java.time.LocalDateTime.parse(vo.getCreatDt())
						: java.time.LocalDateTime.now())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
		processMonitoringLogRepository.save(entity);
	}

	@Override
	public ProcessMonVO selectProcessMon(ProcessMonVO vo) throws Exception {
		return processMonitoringRepository.findById(vo.getProcessId())
				.map(this::toVO)
				.orElse(null);
	}

	@Override
	public ProcessMonLogVO selectProcessMonLog(ProcessMonLogVO vo) throws Exception {
		return processMonitoringLogRepository.findById(vo.getLogId())
				.map(this::toLogVO)
				.orElse(null);
	}

	@Override
	public List<ProcessMonVO> selectProcessMonList(ProcessMonVO processMonVO) throws Exception {
		return processMonitoringRepository
				.findAll(PageRequest.of(processMonVO.getPageIndex() - 1, processMonVO.getRecordCountPerPage(),
						Sort.by("createdDate").descending()))
				.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	public int selectProcessMonTotCnt(ProcessMonVO searchVO) throws Exception {
		return (int) processMonitoringRepository.count();
	}

	@Override
	public Map<String, Object> selectProcessMonLogList(ProcessMonLogVO processMonLogVO) throws Exception {
		List<ProcessMonLogVO> result = processMonitoringLogRepository
				.findAll(PageRequest.of(processMonLogVO.getPageIndex() - 1, processMonLogVO.getRecordCountPerPage(),
						Sort.by("creatDt").descending()))
				.getContent().stream()
				.map(this::toLogVO)
				.collect(Collectors.toList());

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", result);
		map.put("resultCnt", processMonitoringLogRepository.count());
		return map;
	}

	@Override
	@Transactional
	public void updateProcessMon(ProcessMon vo) throws Exception {
		processMonitoringRepository.findById(vo.getProcessId()).ifPresent(e -> {
			e.update(vo.getProcessNm(), vo.getMngrNm(), vo.getMngrEmailAddr(), vo.getLastUpdusrId());
		});
	}

	@Override
	@Transactional
	public void updateProcessMonSttus(ProcessMon vo) throws Exception {
		processMonitoringRepository.findById(vo.getProcessId()).ifPresent(e -> {
			e.updateStatus(vo.getProcsSttus(), vo.getCreatDt() != null ? java.time.LocalDateTime.parse(vo.getCreatDt())
					: java.time.LocalDateTime.now(), vo.getLastUpdusrId());
		});
	}

	private ProcessMonVO toVO(ProcessMonitoring entity) {
		ProcessMonVO vo = new ProcessMonVO();
		vo.setProcessId(entity.getProcessId());
		vo.setProcessNm(entity.getProcessNm());
		vo.setProcsSttus(entity.getProcsSttus());
		vo.setMngrNm(entity.getMngrNm());
		vo.setMngrEmailAddr(entity.getMngrEmailAddr());
		return vo;
	}

	private ProcessMonLogVO toLogVO(ProcessMonitoringLog entity) {
		ProcessMonLogVO vo = new ProcessMonLogVO();
		vo.setLogId(entity.getLogId());
		vo.setProcessId(entity.getProcessId());
		vo.setProcessNm(entity.getProcessNm());
		vo.setProcsSttus(entity.getProcsSttus());
		vo.setLogInfo(entity.getLogInfo());
		vo.setMngrNm(entity.getMngrNm());
		vo.setMngrEmailAddr(entity.getMngrEmailAddr());
		return vo;
	}
}
