package egovframework.com.ssi.syi.sim.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.integration.SystemConnection;
import com.company.project.domain.integration.SystemConnectionRepository;

import egovframework.com.ssi.syi.sim.service.EgovSystemCntcService;
import egovframework.com.ssi.syi.sim.service.SystemCntc;
import egovframework.com.ssi.syi.sim.service.SystemCntcVO;
import lombok.RequiredArgsConstructor;

/**
 * ???????? ??????? ? ?????
 * 
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 **/
@Service("SystemCntcService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovSystemCntcServiceImpl extends EgovAbstractServiceImpl implements EgovSystemCntcService {

	private final SystemConnectionRepository systemConnectionRepository;

	/**
	 * ???????????.
	 **/
	@Override
	public List<EgovMap> selectSystemCntcList(SystemCntcVO systemCntcVO) throws Exception {
		List<SystemConnection> entities = systemConnectionRepository.findAll();
		return entities.stream()
				.filter(e -> systemCntcVO.getSearchKeyword() == null || systemCntcVO.getSearchKeyword().isEmpty()
						|| e.getCntcNm().contains(systemCntcVO.getSearchKeyword()))
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("cntcId", e.getCntcId());
					map.put("cntcNm", e.getCntcNm());
					map.put("cntcType", e.getCntcType());
					map.put("provdInsttId", e.getProvdInsttId());
					map.put("provdSysId", e.getProvdSysId());
					map.put("provdSvcId", e.getProvdSvcId());
					map.put("requstInsttId", e.getRequstInsttId());
					map.put("requstSysId", e.getRequstSysId());
					map.put("confmAt", e.getConfmAt());
					map.put("useAt", e.getUseAt());
					map.put("validBeginDe", e.getValidBeginDe());
					map.put("validEndDe", e.getValidEndDe());
					return map;
				}).collect(Collectors.toList());
	}

	/**
	 * ??????????????.
	 **/
	@Override
	public int selectSystemCntcListTotCnt(SystemCntcVO systemCntcVO) throws Exception {
		return selectSystemCntcList(systemCntcVO).size();
	}

	/**
	 * ?????? ? ???.
	 **/
	@Override
	public SystemCntc selectSystemCntcDetail(SystemCntc systemCntc) throws Exception {
		return systemConnectionRepository.findById(systemCntc.getCntcId())
				.map(e -> {
					SystemCntc res = new SystemCntc();
					res.setCntcId(e.getCntcId());
					res.setCntcNm(e.getCntcNm());
					res.setCntcType(e.getCntcType());
					res.setProvdInsttId(e.getProvdInsttId());
					res.setProvdSysId(e.getProvdSysId());
					res.setProvdSvcId(e.getProvdSvcId());
					res.setRequstInsttId(e.getRequstInsttId());
					res.setRequstSysId(e.getRequstSysId());
					res.setConfmAt(e.getConfmAt());
					res.setUseAt(e.getUseAt());
					res.setValidBeginDe(e.getValidBeginDe());
					res.setValidEndDe(e.getValidEndDe());
					return res;
				}).orElse(null);
	}

	/**
	 * ?????? ???.
	 **/
	@Override
	@Transactional
	public void insertSystemCntc(SystemCntc systemCntc) throws Exception {
		SystemConnection entity = SystemConnection.builder()
				.cntcId(systemCntc.getCntcId())
				.cntcNm(systemCntc.getCntcNm())
				.cntcType(systemCntc.getCntcType())
				.provdInsttId(systemCntc.getProvdInsttId())
				.provdSysId(systemCntc.getProvdSysId())
				.provdSvcId(systemCntc.getProvdSvcId())
				.requstInsttId(systemCntc.getRequstInsttId())
				.requstSysId(systemCntc.getRequstSysId())
				.confmAt(systemCntc.getConfmAt())
				.useAt(systemCntc.getUseAt())
				.validBeginDe(systemCntc.getValidBeginDe())
				.validEndDe(systemCntc.getValidEndDe())
				.frstRegisterId(systemCntc.getFrstRegisterId())
				.build();
		systemConnectionRepository.save(entity);
	}

	/**
	 * ?????? ????.
	 **/
	@Override
	@Transactional
	public void updateSystemCntc(SystemCntc systemCntc) throws Exception {
		systemConnectionRepository.findById(systemCntc.getCntcId())
				.ifPresent(e -> e.update(
						systemCntc.getCntcNm(),
						systemCntc.getCntcType(),
						systemCntc.getProvdInsttId(),
						systemCntc.getProvdSysId(),
						systemCntc.getProvdSvcId(),
						systemCntc.getRequstInsttId(),
						systemCntc.getRequstSysId(),
						systemCntc.getConfmAt(),
						systemCntc.getUseAt(),
						systemCntc.getValidBeginDe(),
						systemCntc.getValidEndDe(),
						systemCntc.getLastUpdusrId()));
	}

	/**
	 * ?????? ????.
	 **/
	@Override
	@Transactional
	public void confirmSystemCntc(SystemCntc systemCntc) throws Exception {
		systemConnectionRepository.findById(systemCntc.getCntcId())
				.ifPresent(e -> e.confirm(systemCntc.getConfmAt(), systemCntc.getLastUpdusrId()));
	}

	/**
	 * ?????? ?????.
	 **/
	@Override
	@Transactional
	public void deleteSystemCntc(SystemCntc systemCntc) throws Exception {
		systemConnectionRepository.deleteById(systemCntc.getCntcId());
	}
}
