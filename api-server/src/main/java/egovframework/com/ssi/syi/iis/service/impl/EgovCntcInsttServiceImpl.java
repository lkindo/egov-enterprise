package egovframework.com.ssi.syi.iis.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.integration.IntegrationInstitution;
import com.company.project.domain.integration.IntegrationInstitutionRepository;
import com.company.project.domain.integration.IntegrationService;
import com.company.project.domain.integration.IntegrationService.IntegrationServiceId;
import com.company.project.domain.integration.IntegrationServiceRepository;
import com.company.project.domain.integration.IntegrationSystem;
import com.company.project.domain.integration.IntegrationSystem.IntegrationSystemId;
import com.company.project.domain.integration.IntegrationSystemRepository;

import egovframework.com.ssi.syi.iis.service.CntcInstt;
import egovframework.com.ssi.syi.iis.service.CntcInsttVO;
import egovframework.com.ssi.syi.iis.service.CntcService;
import egovframework.com.ssi.syi.iis.service.CntcServiceVO;
import egovframework.com.ssi.syi.iis.service.CntcSystem;
import egovframework.com.ssi.syi.iis.service.CntcSystemVO;
import egovframework.com.ssi.syi.iis.service.EgovCntcInsttService;
import lombok.RequiredArgsConstructor;

/**
 * 연계기관 관리에 관한 비즈니스 구현 클래스
 * 
 * @author 공통서비스 개발팀 이중호
 * @since 2009.04.01
 * @version 1.0
 */
@Service("CntcInsttService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovCntcInsttServiceImpl extends EgovAbstractServiceImpl implements EgovCntcInsttService {

	private final IntegrationInstitutionRepository integrationInstitutionRepository;
	private final IntegrationSystemRepository integrationSystemRepository;
	private final IntegrationServiceRepository integrationServiceRepository;

	/**
	 * 연계기관 목록을 조회한다.
	 */
	@Override
	public List<EgovMap> selectCntcInsttList(CntcInsttVO cntcInsttVO) throws Exception {
		List<IntegrationInstitution> entities = integrationInstitutionRepository.findAll();
		return entities.stream()
				.filter(e -> "Y".equals(e.getUseAt()))
				.filter(e -> cntcInsttVO.getSearchKeyword() == null || cntcInsttVO.getSearchKeyword().isEmpty()
						|| e.getInsttNm().contains(cntcInsttVO.getSearchKeyword()))
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("insttId", e.getInsttId());
					map.put("insttNm", e.getInsttNm());
					return map;
				}).collect(Collectors.toList());
	}

	/**
	 * 연계기관 총 갯수를 조회한다.
	 */
	@Override
	public int selectCntcInsttListTotCnt(CntcInsttVO cntcInsttVO) throws Exception {
		return (int) integrationInstitutionRepository.findAll().stream()
				.filter(e -> "Y".equals(e.getUseAt()))
				.filter(e -> cntcInsttVO.getSearchKeyword() == null || cntcInsttVO.getSearchKeyword().isEmpty()
						|| e.getInsttNm().contains(cntcInsttVO.getSearchKeyword()))
				.count();
	}

	/**
	 * 연계시스템 목록을 조회한다.
	 */
	@Override
	public List<EgovMap> selectCntcSystemList(CntcSystemVO cntcSystemVO) throws Exception {
		List<IntegrationSystem> entities;
		if (cntcSystemVO.getInsttId() != null && !cntcSystemVO.getInsttId().isEmpty()) {
			entities = integrationSystemRepository.findByIdInsttIdAndUseAt(cntcSystemVO.getInsttId(), "Y");
		} else {
			entities = integrationSystemRepository.findAll().stream().filter(e -> "Y".equals(e.getUseAt()))
					.collect(Collectors.toList());
		}

		return entities.stream().map(e -> {
			EgovMap map = new EgovMap();
			map.put("insttId", e.getId().getInsttId());
			map.put("sysId", e.getId().getSysId());
			map.put("sysNm", e.getSysNm());
			map.put("sysIp", e.getSysIp());
			return map;
		}).collect(Collectors.toList());
	}

	/**
	 * 연계시스템 총 갯수를 조회한다.
	 */
	@Override
	public int selectCntcSystemListTotCnt(CntcSystemVO cntcSystemVO) throws Exception {
		return selectCntcSystemList(cntcSystemVO).size();
	}

	/**
	 * 연계서비스 목록을 조회한다.
	 */
	@Override
	public List<EgovMap> selectCntcServiceList(CntcServiceVO cntcServiceVO) throws Exception {
		List<IntegrationService> entities;
		if (cntcServiceVO.getInsttId() != null && cntcServiceVO.getSysId() != null) {
			entities = integrationServiceRepository.findByIdInsttIdAndIdSysIdAndUseAt(cntcServiceVO.getInsttId(),
					cntcServiceVO.getSysId(), "Y");
		} else {
			entities = integrationServiceRepository.findAll().stream().filter(e -> "Y".equals(e.getUseAt()))
					.collect(Collectors.toList());
		}

		return entities.stream().map(e -> {
			EgovMap map = new EgovMap();
			map.put("insttId", e.getId().getInsttId());
			map.put("sysId", e.getId().getSysId());
			map.put("svcId", e.getId().getSvcId());
			map.put("svcNm", e.getSvcNm());
			map.put("requestMessageId", e.getRequestMessageId());
			map.put("rspnsMessageId", e.getRspnsMessageId());
			return map;
		}).collect(Collectors.toList());
	}

	/**
	 * 연계서비스 총 갯수를 조회한다.
	 */
	@Override
	public int selectCntcServiceListTotCnt(CntcServiceVO cntcServiceVO) throws Exception {
		return selectCntcServiceList(cntcServiceVO).size();
	}

	/**
	 * 연계기관을 상세 조회한다.
	 */
	@Override
	public CntcInstt selectCntcInsttDetail(CntcInstt cntcInstt) throws Exception {
		return integrationInstitutionRepository.findById(cntcInstt.getInsttId())
				.map(e -> {
					CntcInstt res = new CntcInstt();
					res.setInsttId(e.getInsttId());
					res.setInsttNm(e.getInsttNm());
					return res;
				}).orElse(null);
	}

	/**
	 * 연계시스템을 상세 조회한다.
	 */
	@Override
	public CntcSystem selectCntcSystemDetail(CntcSystem cntcSystem) throws Exception {
		IntegrationSystemId id = IntegrationSystemId.builder()
				.insttId(cntcSystem.getInsttId())
				.sysId(cntcSystem.getSysId())
				.build();
		return integrationSystemRepository.findById(id)
				.map(e -> {
					CntcSystem res = new CntcSystem();
					res.setInsttId(e.getId().getInsttId());
					res.setSysId(e.getId().getSysId());
					res.setSysNm(e.getSysNm());
					res.setSysIp(e.getSysIp());
					return res;
				}).orElse(null);
	}

	/**
	 * 연계서비스를 상세 조회한다.
	 */
	@Override
	public CntcService selectCntcServiceDetail(CntcService cntcService) throws Exception {
		IntegrationServiceId id = IntegrationServiceId.builder()
				.insttId(cntcService.getInsttId())
				.sysId(cntcService.getSysId())
				.svcId(cntcService.getSvcId())
				.build();
		return integrationServiceRepository.findById(id)
				.map(e -> {
					CntcService res = new CntcService();
					res.setInsttId(e.getId().getInsttId());
					res.setSysId(e.getId().getSysId());
					res.setSvcId(e.getId().getSvcId());
					res.setSvcNm(e.getSvcNm());
					res.setRequestMessageId(e.getRequestMessageId());
					res.setRspnsMessageId(e.getRspnsMessageId());
					return res;
				}).orElse(null);
	}

	/**
	 * 연계기관을 등록한다.
	 */
	@Override
	@Transactional
	public void insertCntcInstt(CntcInstt cntcInstt) throws Exception {
		IntegrationInstitution entity = IntegrationInstitution.builder()
				.insttId(cntcInstt.getInsttId())
				.insttNm(cntcInstt.getInsttNm())
				.frstRegisterId(cntcInstt.getFrstRegisterId())
				.build();
		integrationInstitutionRepository.save(entity);
	}

	/**
	 * 연계시스템을 등록한다.
	 */
	@Override
	@Transactional
	public void insertCntcSystem(CntcSystem cntcSystem) throws Exception {
		IntegrationSystem entity = IntegrationSystem.builder()
				.id(IntegrationSystemId.builder()
						.insttId(cntcSystem.getInsttId())
						.sysId(cntcSystem.getSysId())
						.build())
				.sysNm(cntcSystem.getSysNm())
				.sysIp(cntcSystem.getSysIp())
				.frstRegisterId(cntcSystem.getFrstRegisterId())
				.build();
		integrationSystemRepository.save(entity);
	}

	/**
	 * 연계서비스를 등록한다.
	 */
	@Override
	@Transactional
	public void insertCntcService(CntcService cntcService) throws Exception {
		IntegrationService entity = IntegrationService.builder()
				.id(IntegrationServiceId.builder()
						.insttId(cntcService.getInsttId())
						.sysId(cntcService.getSysId())
						.svcId(cntcService.getSvcId())
						.build())
				.svcNm(cntcService.getSvcNm())
				.requestMessageId(cntcService.getRequestMessageId())
				.rspnsMessageId(cntcService.getRspnsMessageId())
				.frstRegisterId(cntcService.getFrstRegisterId())
				.build();
		integrationServiceRepository.save(entity);
	}

	/**
	 * 연계기관을 수정한다.
	 */
	@Override
	@Transactional
	public void updateCntcInstt(CntcInstt cntcInstt) throws Exception {
		integrationInstitutionRepository.findById(cntcInstt.getInsttId())
				.ifPresent(e -> e.update(cntcInstt.getInsttNm(), cntcInstt.getLastUpdusrId()));
	}

	/**
	 * 연계시스템을 수정한다.
	 */
	@Override
	@Transactional
	public void updateCntcSystem(CntcSystem cntcSystem) throws Exception {
		IntegrationSystemId id = IntegrationSystemId.builder()
				.insttId(cntcSystem.getInsttId())
				.sysId(cntcSystem.getSysId())
				.build();
		integrationSystemRepository.findById(id)
				.ifPresent(e -> e.update(cntcSystem.getSysNm(), cntcSystem.getSysIp(), cntcSystem.getLastUpdusrId()));
	}

	/**
	 * 연계서비스를 수정한다.
	 */
	@Override
	@Transactional
	public void updateCntcService(CntcService cntcService) throws Exception {
		IntegrationServiceId id = IntegrationServiceId.builder()
				.insttId(cntcService.getInsttId())
				.sysId(cntcService.getSysId())
				.svcId(cntcService.getSvcId())
				.build();
		integrationServiceRepository.findById(id)
				.ifPresent(e -> e.update(cntcService.getSvcNm(), cntcService.getRequestMessageId(),
						cntcService.getRspnsMessageId(), cntcService.getLastUpdusrId()));
	}

	/**
	 * 연계기관을 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteCntcInstt(CntcInstt cntcInstt) throws Exception {
		integrationInstitutionRepository.findById(cntcInstt.getInsttId())
				.ifPresent(e -> e.delete(cntcInstt.getLastUpdusrId()));
	}

	/**
	 * 연계시스템을 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteCntcSystem(CntcSystem cntcSystem) throws Exception {
		IntegrationSystemId id = IntegrationSystemId.builder()
				.insttId(cntcSystem.getInsttId())
				.sysId(cntcSystem.getSysId())
				.build();
		integrationSystemRepository.findById(id)
				.ifPresent(e -> e.delete(cntcSystem.getLastUpdusrId()));
	}

	/**
	 * 연계서비스를 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteCntcService(CntcService cntcService) throws Exception {
		IntegrationServiceId id = IntegrationServiceId.builder()
				.insttId(cntcService.getInsttId())
				.sysId(cntcService.getSysId())
				.svcId(cntcService.getSvcId())
				.build();
		integrationServiceRepository.findById(id)
				.ifPresent(e -> e.delete(cntcService.getLastUpdusrId()));
	}
}
