package egovframework.com.utl.sys.nsm.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.monitoring.NetworkServiceId;
import com.company.project.domain.monitoring.NetworkServiceMonitoring;
import com.company.project.domain.monitoring.NetworkServiceMonitoringLog;
import com.company.project.domain.monitoring.NetworkServiceMonitoringLogRepository;
import com.company.project.domain.monitoring.NetworkServiceMonitoringRepository;

import egovframework.com.utl.sys.nsm.service.EgovNtwrkSvcMntrngService;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrng;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngLog;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngLogVO;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngVO;
import lombok.RequiredArgsConstructor;

/**
 * 네트워크서비스모니터링관리에 대한 ServiceImpl 클래스
 * 
 * @author 김진만
 * @since 2010.06.21
 * @version 1.1
 */
@Service("egovNtwrkSvcMntrngService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovNtwrkSvcMntrngServiceImpl extends EgovAbstractServiceImpl implements EgovNtwrkSvcMntrngService {

	private final NetworkServiceMonitoringRepository networkServiceMonitoringRepository;
	private final NetworkServiceMonitoringLogRepository networkServiceMonitoringLogRepository;

	@Override
	@Transactional
	public void deleteNtwrkSvcMntrng(NtwrkSvcMntrng vo) throws Exception {
		networkServiceMonitoringRepository
				.deleteById(new NetworkServiceId(vo.getSysIp(), Integer.valueOf(vo.getSysPort())));
	}

	@Override
	@Transactional
	public void insertNtwrkSvcMntrng(NtwrkSvcMntrng vo) throws Exception {
		NetworkServiceMonitoring entity = NetworkServiceMonitoring.builder()
				.sysIp(vo.getSysIp())
				.sysPort(Integer.valueOf(vo.getSysPort()))
				.sysNm(vo.getSysNm())
				.mngrNm(vo.getMngrNm())
				.mngrEmailAddr(vo.getMngrEmailAddr())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
		networkServiceMonitoringRepository.save(entity);
	}

	@Override
	@Transactional
	public void insertNtwrkSvcMntrngLog(NtwrkSvcMntrngLog vo) throws Exception {
		NetworkServiceMonitoringLog entity = NetworkServiceMonitoringLog.builder()
				.logId(vo.getLogId())
				.sysIp(vo.getSysIp())
				.sysPort(Integer.valueOf(vo.getSysPort()))
				.sysNm(vo.getSysNm())
				.mntrngSttus(vo.getMntrngSttus())
				.logInfo(vo.getLogInfo())
				.creatDt(vo.getCreatDt())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
		networkServiceMonitoringLogRepository.save(entity);
	}

	@Override
	public NtwrkSvcMntrngVO selectNtwrkSvcMntrng(NtwrkSvcMntrngVO vo) throws Exception {
		return networkServiceMonitoringRepository
				.findById(new NetworkServiceId(vo.getSysIp(), Integer.valueOf(vo.getSysPort())))
				.map(this::toVO)
				.orElse(null);
	}

	@Override
	public int selectNtwrkSvcMntrngCheck(NtwrkSvcMntrngVO vo) throws Exception {
		return networkServiceMonitoringRepository
				.existsById(new NetworkServiceId(vo.getSysIp(), Integer.valueOf(vo.getSysPort()))) ? 1 : 0;
	}

	@Override
	public NtwrkSvcMntrngLogVO selectNtwrkSvcMntrngLog(NtwrkSvcMntrngLogVO vo) throws Exception {
		return networkServiceMonitoringLogRepository.findById(vo.getLogId())
				.map(this::toLogVO)
				.orElse(null);
	}

	@Override
	public List<NtwrkSvcMntrngVO> selectNtwrkSvcMntrngList(NtwrkSvcMntrngVO searchVO) throws Exception {
		return networkServiceMonitoringRepository
				.findAll(PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage(),
						Sort.by("createdDate").descending()))
				.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	public int selectNtwrkSvcMntrngListCnt(NtwrkSvcMntrngVO searchVO) throws Exception {
		return (int) networkServiceMonitoringRepository.count();
	}

	@Override
	public List<NtwrkSvcMntrngLogVO> selectNtwrkSvcMntrngLogList(NtwrkSvcMntrngLogVO searchVO) throws Exception {
		return networkServiceMonitoringLogRepository
				.findAll(PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage(),
						Sort.by("creatDt").descending()))
				.getContent().stream()
				.map(this::toLogVO)
				.collect(Collectors.toList());
	}

	@Override
	public int selectNtwrkSvcMntrngLogListCnt(NtwrkSvcMntrngLogVO searchVO) throws Exception {
		return (int) networkServiceMonitoringLogRepository.count();
	}

	@Override
	@Transactional
	public void updateNtwrkSvcMntrng(NtwrkSvcMntrng vo) throws Exception {
		networkServiceMonitoringRepository
				.findById(new NetworkServiceId(vo.getOldSysIp(), Integer.valueOf(vo.getOldSysPort()))).ifPresent(e -> {
					e.update(vo.getSysIp(), Integer.valueOf(vo.getSysPort()), vo.getSysNm(), vo.getMngrNm(),
							vo.getMngrEmailAddr(), vo.getLastUpdusrId());
				});
	}

	@Override
	@Transactional
	public void updateNtwrkSvcMntrngSttus(NtwrkSvcMntrng vo) throws Exception {
		networkServiceMonitoringRepository
				.findById(new NetworkServiceId(vo.getSysIp(), Integer.valueOf(vo.getSysPort()))).ifPresent(e -> {
					e.updateStatus(vo.getMntrngSttus(), vo.getCreatDt(), vo.getLastUpdusrId());
				});
	}

	private NtwrkSvcMntrngVO toVO(NetworkServiceMonitoring entity) {
		NtwrkSvcMntrngVO vo = new NtwrkSvcMntrngVO();
		vo.setSysIp(entity.getId().getSysIp());
		vo.setSysPort(String.valueOf(entity.getId().getSysPort()));
		vo.setSysNm(entity.getSysNm());
		vo.setMntrngSttus(entity.getMntrngSttus());
		vo.setMngrNm(entity.getMngrNm());
		vo.setMngrEmailAddr(entity.getMngrEmailAddr());
		return vo;
	}

	private NtwrkSvcMntrngLogVO toLogVO(NetworkServiceMonitoringLog entity) {
		NtwrkSvcMntrngLogVO vo = new NtwrkSvcMntrngLogVO();
		vo.setLogId(entity.getLogId());
		vo.setSysIp(entity.getSysIp());
		vo.setSysPort(String.valueOf(entity.getSysPort()));
		vo.setSysNm(entity.getSysNm());
		vo.setMntrngSttus(entity.getMntrngSttus());
		vo.setLogInfo(entity.getLogInfo());
		return vo;
	}
}