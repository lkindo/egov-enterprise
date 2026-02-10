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
 * 시스템연계 관리에 관한 비즈니스 구현 클래스
 * 
 * @author 공통서비스 개발팀 이중호
 * @since 2009.04.01
 * @version 1.0
 */
@Service("SystemCntcService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovSystemCntcServiceImpl extends EgovAbstractServiceImpl implements EgovSystemCntcService {

	private final SystemConnectionRepository systemConnectionRepository;

	/**
	 * 시스템연계 목록을 조회한다.
	 */
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
	 * 시스템연계 총 갯수를 조회한다.
	 */
	@Override
	public int selectSystemCntcListTotCnt(SystemCntcVO systemCntcVO) throws Exception {
		return selectSystemCntcList(systemCntcVO).size();
	}

	/**
	 * 시스템연계를 상세 조회한다.
	 */
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
	 * 시스템연계를 등록한다.
	 */
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
	 * 시스템연계를 수정한다.
	 */
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
	 * 시스템연계를 승인한다.
	 */
	@Override
	@Transactional
	public void confirmSystemCntc(SystemCntc systemCntc) throws Exception {
		systemConnectionRepository.findById(systemCntc.getCntcId())
				.ifPresent(e -> e.confirm(systemCntc.getConfmAt(), systemCntc.getLastUpdusrId()));
	}

	/**
	 * 시스템연계를 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteSystemCntc(SystemCntc systemCntc) throws Exception {
		systemConnectionRepository.deleteById(systemCntc.getCntcId());
	}
}
