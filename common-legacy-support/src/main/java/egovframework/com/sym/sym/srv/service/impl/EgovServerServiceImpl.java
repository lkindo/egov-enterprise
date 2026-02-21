package egovframework.com.sym.sym.srv.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.system.ServerEqpmnRelateRepository;
import com.company.project.domain.system.ServerEqpmnRepository;
import com.company.project.domain.system.ServerRepository;

import egovframework.com.sym.sym.srv.service.EgovServerService;
import egovframework.com.sym.sym.srv.service.Server;
import egovframework.com.sym.sym.srv.service.ServerEqpmn;
import egovframework.com.sym.sym.srv.service.ServerEqpmnRelate;
import egovframework.com.sym.sym.srv.service.ServerEqpmnRelateVO;
import egovframework.com.sym.sym.srv.service.ServerEqpmnVO;
import egovframework.com.sym.sym.srv.service.ServerVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * ??
 * - ?????????ServiceImpl ?????? ???.
 *
 * ???
 * - ??????????, ??, ???? ??? ???????.
 * - ???????? ?, ??????.
 * 
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:33
 **/
@Service("egovServerService")
public class EgovServerServiceImpl extends EgovAbstractServiceImpl implements EgovServerService {

	@Resource
	private ServerRepository serverRepository;

	@Resource
	private ServerEqpmnRepository serverEqpmnRepository;

	@Resource
	private ServerEqpmnRelateRepository serverEqpmnRelateRepository;

	/**
	 * ????????? ?????????????.
	 * 
	 * @param serverEqpmnVO - ?????Vo
	 * @return List - ??????
	 **/
	@Override
	public List<ServerEqpmnVO> selectServerEqpmnList(ServerEqpmnVO serverEqpmnVO) throws Exception {
		Pageable pageable = PageRequest.of(serverEqpmnVO.getFirstIndex() / serverEqpmnVO.getRecordCountPerPage(),
				serverEqpmnVO.getRecordCountPerPage());
		Page<com.company.project.domain.system.ServerEqpmn> page = serverEqpmnRepository.findByServerEqpmnNmContaining(
				serverEqpmnVO.getStrServerEqpmnNm() == null ? "" : serverEqpmnVO.getStrServerEqpmnNm(), pageable);
		return page.getContent().stream().map(this::mapToServerEqpmnVO).collect(Collectors.toList());
	}

	/**
	 * ????? ???????.
	 * 
	 * @param serverEqpmnVO - ?????Vo
	 * @return int - ??????????
	 **/
	@Override
	public int selectServerEqpmnListTotCnt(ServerEqpmnVO serverEqpmnVO) throws Exception {
		return (int) serverEqpmnRepository.count();
	}

	/**
	 * ????????????????.
	 * 
	 * @param serverEqpmnVO - ?????Vo
	 * @return serverEqpmnVO - ?????Vo
	 **/
	@Override
	public ServerEqpmnVO selectServerEqpmn(ServerEqpmnVO serverEqpmnVO) throws Exception {
		return serverEqpmnRepository.findById(serverEqpmnVO.getServerEqpmnId())
				.map(this::mapToServerEqpmnVO)
				.orElse(null);
	}

	/**
	 * ????????????.
	 * 
	 * @param serverEqpmn - ?????model
	 **/
	@Override
	@Transactional
	public ServerEqpmnVO insertServerEqpmn(ServerEqpmn serverEqpmn, ServerEqpmnVO serverEqpmnVO) throws Exception {
		com.company.project.domain.system.ServerEqpmn entity = com.company.project.domain.system.ServerEqpmn.builder()
				.serverEqpmnId(serverEqpmn.getServerEqpmnId())
				.serverEqpmnNm(serverEqpmn.getServerEqpmnNm())
				.serverEqpmnIp(serverEqpmn.getServerEqpmnIp())
				.serverEqpmnMngr(serverEqpmn.getServerEqpmnMngrNm())
				.mngrEmailAddr(serverEqpmn.getMngrEmailAddr())
				.opersysmInfo(serverEqpmn.getOpersysmInfo())
				.cpuInfo(serverEqpmn.getCpuInfo())
				.moryInfo(serverEqpmn.getMoryInfo())
				.hdDisk(serverEqpmn.getHdDisk())
				.etcInfo(serverEqpmn.getEtcInfo())
				.regstYmd(parseLocalDate(EgovStringUtil.removeMinusChar(serverEqpmn.getRegstYmd())))
				.frstRegisterId(serverEqpmn.getFrstRegisterId())
				.build();
		serverEqpmnRepository.save(entity);
		serverEqpmnVO.setServerEqpmnId(entity.getServerEqpmnId());
		return selectServerEqpmn(serverEqpmnVO);
	}

	/**
	 * ???????????????.
	 * 
	 * @param serverEqpmn - ?????model
	 **/
	@Override
	@Transactional
	public void updateServerEqpmn(ServerEqpmn serverEqpmn) throws Exception {
		serverEqpmnRepository.findById(serverEqpmn.getServerEqpmnId()).ifPresent(entity -> {
			com.company.project.domain.system.ServerEqpmn updated = com.company.project.domain.system.ServerEqpmn
					.builder()
					.serverEqpmnId(entity.getServerEqpmnId())
					.serverEqpmnNm(serverEqpmn.getServerEqpmnNm())
					.serverEqpmnIp(serverEqpmn.getServerEqpmnIp())
					.serverEqpmnMngr(serverEqpmn.getServerEqpmnMngrNm())
					.mngrEmailAddr(serverEqpmn.getMngrEmailAddr())
					.opersysmInfo(serverEqpmn.getOpersysmInfo())
					.cpuInfo(serverEqpmn.getCpuInfo())
					.moryInfo(serverEqpmn.getMoryInfo())
					.hdDisk(serverEqpmn.getHdDisk())
					.etcInfo(serverEqpmn.getEtcInfo())
					.regstYmd(parseLocalDate(EgovStringUtil.removeMinusChar(serverEqpmn.getRegstYmd())))
					.frstRegisterId(entity.getFrstRegisterId())
					.build();
			serverEqpmnRepository.save(updated);
		});
	}

	/**
	 * ????????????????.
	 * 
	 * @param serverEqpmn - ?????model
	 **/
	@Override
	@Transactional
	public void deleteServerEqpmn(ServerEqpmn serverEqpmn) throws Exception {
		serverEqpmnRepository.deleteById(serverEqpmn.getServerEqpmnId());
	}

	/**
	 * ????????? ??????????.
	 * 
	 * @param serverVO - ?? Vo
	 * @return List - ?? ?
	 **/
	@Override
	public List<ServerVO> selectServerList(ServerVO serverVO) throws Exception {
		Pageable pageable = PageRequest.of(serverVO.getFirstIndex() / serverVO.getRecordCountPerPage(),
				serverVO.getRecordCountPerPage());
		Page<Object[]> page = serverRepository.selectServerList(serverVO.getStrServerNm(), pageable);
		return page.getContent().stream().map(this::mapToServerVO).collect(Collectors.toList());
	}

	/**
	 * ??????????.
	 * 
	 * @param serverVO - ?? Vo
	 * @return int - ?? ?????
	 **/
	@Override
	public int selectServerListTotCnt(ServerVO serverVO) throws Exception {
		return (int) serverRepository.count();
	}

	/**
	 * ??????????????.
	 * 
	 * @param serverVO - ?? Vo
	 * @return serverVO - ?? Vo
	 **/
	@Override
	public ServerVO selectServer(ServerVO serverVO) throws Exception {
		return serverRepository.findById(serverVO.getServerId())
				.map(this::mapToServerVO)
				.orElse(null);
	}

	/**
	 * ????????????????????.
	 * 
	 * @param serverVO - ?? Vo
	 * @return List - ??????
	 **/
	@Override
	public List<ServerEqpmnVO> selectServerEqpmnRelateDetail(ServerVO serverVO) throws Exception {
		List<com.company.project.domain.system.ServerEqpmn> list = serverEqpmnRepository
				.selectServerEqpmnRelateDetail(serverVO.getServerId());
		return list.stream().map(this::mapToServerEqpmnVO).collect(Collectors.toList());
	}

	/**
	 * ????????????????? ???.
	 * 
	 * @param serverVO - ?? Vo
	 * @return int - ?????????????????
	 **/
	@Override
	public int selectServerEqpmnRelateDetailTotCnt(ServerVO serverVO) throws Exception {
		return serverEqpmnRepository.selectServerEqpmnRelateDetail(serverVO.getServerId()).size();
	}

	/**
	 * ??????????.
	 * 
	 * @param server - ?? model
	 **/
	@Override
	@Transactional
	public ServerVO insertServer(Server server, ServerVO serverVO) throws Exception {
		com.company.project.domain.system.Server entity = com.company.project.domain.system.Server.builder()
				.serverId(server.getServerId())
				.serverNm(server.getServerNm())
				.serverKnd(server.getServerKnd())
				.regstYmd(parseLocalDate(EgovStringUtil.removeMinusChar(server.getRegstYmd())))
				.frstRegisterId(server.getFrstRegisterId())
				.build();
		serverRepository.save(entity);
		serverVO.setServerId(entity.getServerId());
		return selectServer(serverVO);
	}

	/**
	 * ?????????????.
	 * 
	 * @param server - ?? model
	 **/
	@Override
	@Transactional
	public void updateServer(Server server) throws Exception {
		serverRepository.findById(server.getServerId()).ifPresent(entity -> {
			com.company.project.domain.system.Server updated = com.company.project.domain.system.Server.builder()
					.serverId(entity.getServerId())
					.serverNm(server.getServerNm())
					.serverKnd(server.getServerKnd())
					.regstYmd(parseLocalDate(EgovStringUtil.removeMinusChar(server.getRegstYmd())))
					.frstRegisterId(entity.getFrstRegisterId())
					.build();
			serverRepository.save(updated);
		});
	}

	/**
	 * ??????????????.
	 * 
	 * @param server - ?? model
	 **/
	@Override
	@Transactional
	public void deleteServer(Server server) throws Exception {
		serverRepository.deleteById(server.getServerId());
	}

	/**
	 * ????????? ???? ???????????.
	 * 
	 * @param serverEqpmnRelateVO - ???????Vo
	 * @return List - ?? ?
	 **/
	@Override
	public List<ServerEqpmnRelateVO> selectServerEqpmnRelateList(ServerEqpmnRelateVO serverEqpmnRelateVO)
			throws Exception {
		Pageable pageable = PageRequest.of(
				serverEqpmnRelateVO.getFirstIndex() / serverEqpmnRelateVO.getRecordCountPerPage(),
				serverEqpmnRelateVO.getRecordCountPerPage());
		Page<Object[]> page = serverEqpmnRepository.selectServerEqpmnRelateList(serverEqpmnRelateVO.getServerId(),
				pageable);
		return page.getContent().stream().map(this::mapToServerEqpmnRelateVO).collect(Collectors.toList());
	}

	/**
	 * ???????????????????.
	 * 
	 * @param serverEqpmnRelateVO - ???????Vo
	 * @return int - ????????????
	 **/
	@Override
	public int selectServerEqpmnRelateListTotCnt(ServerEqpmnRelateVO serverEqpmnRelateVO) throws Exception {
		return (int) serverEqpmnRepository.count(); // Approximate
	}

	/**
	 * ????????? ?????.
	 * 
	 * @param serverEqpmnRelate - ???????model
	 **/
	@Override
	@Transactional
	public void insertServerEqpmnRelate(ServerEqpmnRelate serverEqpmnRelate) throws Exception {
		com.company.project.domain.system.ServerEqpmnRelate entity = com.company.project.domain.system.ServerEqpmnRelate
				.builder()
				.serverId(serverEqpmnRelate.getServerId())
				.serverEqpmnId(serverEqpmnRelate.getServerEqpmnId())
				.lastUpdusrId(serverEqpmnRelate.getLastUpdusrId())
				.build();
		serverEqpmnRelateRepository.save(entity);
	}

	/**
	 * ????????????? ?????.
	 * 
	 * @param serverEqpmnRelate - ???????model
	 **/
	@Override
	@Transactional
	public void deleteServerEqpmnRelate(ServerEqpmnRelate serverEqpmnRelate) throws Exception {
		serverEqpmnRelateRepository.deleteByServerIdAndServerEqpmnId(serverEqpmnRelate.getServerId(),
				serverEqpmnRelate.getServerEqpmnId());
	}

	private ServerEqpmnVO mapToServerEqpmnVO(com.company.project.domain.system.ServerEqpmn entity) {
		ServerEqpmnVO vo = new ServerEqpmnVO();
		vo.setServerEqpmnId(entity.getServerEqpmnId());
		vo.setServerEqpmnNm(entity.getServerEqpmnNm());
		vo.setServerEqpmnIp(entity.getServerEqpmnIp());
		vo.setServerEqpmnMngrNm(entity.getServerEqpmnMngr());
		vo.setMngrEmailAddr(entity.getMngrEmailAddr());
		vo.setOpersysmInfo(entity.getOpersysmInfo());
		vo.setCpuInfo(entity.getCpuInfo());
		vo.setMoryInfo(entity.getMoryInfo());
		vo.setHdDisk(entity.getHdDisk());
		vo.setEtcInfo(entity.getEtcInfo());
		vo.setRegstYmd(
				entity.getRegstYmd() != null ? entity.getRegstYmd().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
						: "");
		vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm() != null
				? entity.getFrstRegisterPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
				: "");
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm() != null
				? entity.getLastUpdusrPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
				: "");
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private ServerVO mapToServerVO(Object[] row) {
		ServerVO vo = new ServerVO();
		vo.setServerId((String) row[0]);
		vo.setServerNm((String) row[1]);
		vo.setServerKnd((String) row[2]);
		vo.setServerKndNm((String) row[3]);
		vo.setRegstYmd(
				row[4] != null ? ((java.sql.Date) row[4]).toLocalDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
						: "");
		vo.setFrstRegisterPnttm(
				row[5] != null
						? ((java.sql.Timestamp) row[5]).toLocalDateTime()
								.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
						: "");
		vo.setFrstRegisterId((String) row[6]);
		vo.setLastUpdusrPnttm(
				row[7] != null
						? ((java.sql.Timestamp) row[7]).toLocalDateTime()
								.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
						: "");
		vo.setLastUpdusrId((String) row[8]);
		return vo;
	}

	private ServerVO mapToServerVO(com.company.project.domain.system.Server entity) {
		ServerVO vo = new ServerVO();
		vo.setServerId(entity.getServerId());
		vo.setServerNm(entity.getServerNm());
		vo.setServerKnd(entity.getServerKnd());
		vo.setRegstYmd(
				entity.getRegstYmd() != null ? entity.getRegstYmd().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
						: "");
		vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm() != null
				? entity.getFrstRegisterPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
				: "");
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm() != null
				? entity.getLastUpdusrPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
				: "");
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private ServerEqpmnRelateVO mapToServerEqpmnRelateVO(Object[] row) {
		ServerEqpmnRelateVO vo = new ServerEqpmnRelateVO();
		vo.setServerEqpmnId((String) row[0]);
		vo.setServerEqpmnNm((String) row[1]);
		vo.setServerEqpmnIp((String) row[2]);
		vo.setServerEqpmnMngrNm((String) row[3]);
		vo.setRegYn((String) row[4]);
		return vo;
	}

	private LocalDate parseLocalDate(String dateStr) {
		if (dateStr == null || dateStr.isEmpty())
			return null;
		try {
			return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyyMMdd"));
		} catch (Exception e) {
			return null;
		}
	}
}
