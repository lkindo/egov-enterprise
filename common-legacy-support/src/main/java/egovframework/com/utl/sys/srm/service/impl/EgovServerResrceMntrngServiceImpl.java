package egovframework.com.utl.sys.srm.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.monitoring.ServerResrceMntrngLog;
import com.company.project.domain.monitoring.ServerResrceMntrngLogRepository;

import egovframework.com.utl.sys.srm.service.EgovServerResrceMntrngService;
import egovframework.com.utl.sys.srm.service.ServerResrceMntrng;
import egovframework.com.utl.sys.srm.service.ServerResrceMntrngVO;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * ??
 * - ????????????ServiceImpl ?????? ???.
 *
 * ???
 * - ?????????????, ?????????.
 * 
 * @author lee.m.j
 * @version 1.0
 * @created 06-9-2010 ?? 11:23:59
 **/
@Service("egovServerResrceMntrngService")
@RequiredArgsConstructor
public class EgovServerResrceMntrngServiceImpl extends EgovAbstractServiceImpl
		implements EgovServerResrceMntrngService {

	private final ServerResrceMntrngLogRepository serverResrceMntrngLogRepository;

	/** ID Generation **/
	@Resource(name = "egovServerResrceMntrngLogIdGnrService")
	private EgovIdGnrService egovServerResrceMntrngLogIdGnrService;

	/**
	 * ?????????? ?????.
	 * 
	 * @param serverResrceMntrngVO - ?????? Vo
	 * @return List - ???????????
	 **/
	@Override
	public List<ServerResrceMntrngVO> selectServerResrceMntrngList(ServerResrceMntrngVO serverResrceMntrngVO)
			throws Exception {
		Pageable pageable = PageRequest.of(
				serverResrceMntrngVO.getFirstIndex() / serverResrceMntrngVO.getRecordCountPerPage(),
				serverResrceMntrngVO.getRecordCountPerPage());
		Page<Object[]> page = serverResrceMntrngLogRepository.selectServerResrceMntrngList(
				serverResrceMntrngVO.getStrServerNm(),
				serverResrceMntrngVO.getStrStartDt(),
				serverResrceMntrngVO.getStrEndDt(),
				pageable);
		return page.getContent().stream().map(this::mapToVO).collect(Collectors.toList());
	}

	/**
	 * ?????????? ????????.
	 * 
	 * @param serverResrceMntrngVO - ?????? Vo
	 * @return int - ???????????????
	 **/
	@Override
	public int selectServerResrceMntrngListTotCnt(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		Pageable pageable = PageRequest.of(0, 1);
		Page<Object[]> page = serverResrceMntrngLogRepository.selectServerResrceMntrngList(
				serverResrceMntrngVO.getStrServerNm(),
				serverResrceMntrngVO.getStrStartDt(),
				serverResrceMntrngVO.getStrEndDt(),
				pageable);
		return (int) page.getTotalElements();
	}

	/**
	 * ?????? ??????????.
	 * 
	 * @param serverResrceMntrngVO - ?????? Vo
	 * @return ServerResrceMntrngVO - ?????? Vo
	 **/
	@Override
	public ServerResrceMntrngVO selectServerResrceMntrng(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return serverResrceMntrngLogRepository.findById(serverResrceMntrngVO.getLogId())
				.map(this::mapToVO)
				.orElse(null);
	}

	/**
	 * ?????? ?????????.
	 * 
	 * @param serverResrceMntrng - ?????? model
	 **/
	@Override
	@Transactional
	public void insertServerResrceMntrng(ServerResrceMntrng serverResrceMntrng) throws Exception {
		ServerResrceMntrngLog entity = ServerResrceMntrngLog.builder()
				.logId(egovServerResrceMntrngLogIdGnrService.getNextStringId())
				.serverId(serverResrceMntrng.getServerId())
				.serverEqpmnId(serverResrceMntrng.getServerEqpmnId())
				.cpuUseRt(serverResrceMntrng.getCpuUseRt())
				.moryUseRt(serverResrceMntrng.getMoryUseRt())
				.svcSttus(serverResrceMntrng.getSvcSttus())
				.logInfo(serverResrceMntrng.getLogInfo())
				.creatDt(LocalDateTime.now())
				.frstRegisterId(serverResrceMntrng.getFrstRegisterId())
				.frstRegisterPnttm(LocalDateTime.now())
				.lastUpdusrId(serverResrceMntrng.getLastUpdusrId())
				.lastUpdusrPnttm(LocalDateTime.now())
				.build();
		serverResrceMntrngLogRepository.save(entity);
	}

	/**
	 * ??????? ??????????.
	 * 
	 * @param serverResrceMntrngVO - ?????? Vo
	 * @return ServerResrceMntrngVO - ?????? Vo
	 **/
	@Override
	public List<ServerResrceMntrngVO> selectMntrngServerList(ServerResrceMntrngVO serverResrceMntrngVO)
			throws Exception {
		List<Object[]> results = serverResrceMntrngLogRepository
				.selectMntrngServerList(serverResrceMntrngVO.getStrServerNm());
		return results.stream().map(this::mapToMntrngServerVO).collect(Collectors.toList());
	}

	/**
	 * ??????? ????????????.
	 * 
	 * @param serverResrceMntrngVO - ?????? Vo
	 * @return int - ?????? ??????????
	 **/
	@Override
	public int selectMntrngServerListTotCnt(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return selectMntrngServerList(serverResrceMntrngVO).size();
	}

	private ServerResrceMntrngVO mapToVO(ServerResrceMntrngLog entity) {
		ServerResrceMntrngVO vo = new ServerResrceMntrngVO();
		vo.setLogId(entity.getLogId());
		vo.setServerId(entity.getServerId());
		vo.setServerEqpmnId(entity.getServerEqpmnId());
		vo.setCpuUseRt(entity.getCpuUseRt());
		vo.setMoryUseRt(entity.getMoryUseRt());
		vo.setSvcSttus(entity.getSvcSttus());
		vo.setLogInfo(entity.getLogInfo());
		vo.setCreatDt(entity.getCreatDt() != null ? entity.getCreatDt().toString() : null);
		vo.setFrstRegisterPnttm(
				entity.getFrstRegisterPnttm() != null ? entity.getFrstRegisterPnttm().toString() : null);
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm() != null ? entity.getLastUpdusrPnttm().toString() : null);
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private ServerResrceMntrngVO mapToVO(Object[] row) {
		ServerResrceMntrngVO vo = new ServerResrceMntrngVO();
		vo.setServerId((String) row[0]);
		vo.setServerEqpmnId((String) row[1]);
		vo.setLogId((String) row[2]);
		vo.setServerNm((String) row[3]);
		vo.setServerEqpmnIp((String) row[4]);
		vo.setCpuUseRt((String) row[5]);
		vo.setMoryUseRt((String) row[6]);
		vo.setSvcSttus((String) row[7]);
		vo.setSvcSttusNm((String) row[8]);
		vo.setLogInfo((String) row[9]);
		vo.setMngrEamilAddr((String) row[10]);
		vo.setCreatDt(row[11] != null ? row[11].toString() : null);
		vo.setFrstRegisterPnttm(row[12] != null ? row[12].toString() : null);
		vo.setFrstRegisterId((String) row[13]);
		vo.setLastUpdusrPnttm(row[14] != null ? row[14].toString() : null);
		vo.setLastUpdusrId((String) row[15]);
		return vo;
	}

	private ServerResrceMntrngVO mapToMntrngServerVO(Object[] row) {
		ServerResrceMntrngVO vo = new ServerResrceMntrngVO();
		vo.setServerId((String) row[0]);
		vo.setServerEqpmnId((String) row[1]);
		vo.setServerNm((String) row[2]);
		vo.setServerEqpmnIp((String) row[3]);
		vo.setMngrEamilAddr((String) row[4]);
		return vo;
	}
}
