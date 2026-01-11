package egovframework.com.uss.sam.cpy.service.impl;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.terms.CpyrhtPrtcPolicy;
import com.company.project.domain.terms.CpyrhtPrtcPolicyRepository;

import egovframework.com.uss.sam.cpy.service.CpyrhtPrtcPolicyDefaultVO;
import egovframework.com.uss.sam.cpy.service.CpyrhtPrtcPolicyVO;
import egovframework.com.uss.sam.cpy.service.EgovCpyrhtPrtcPolicyService;
import jakarta.annotation.Resource;

@Service("CpyrhtPrtcPolicyService")
public class EgovCpyrhtPrtcPolicyServiceImpl extends EgovAbstractServiceImpl implements EgovCpyrhtPrtcPolicyService {

	@Resource(name = "cpyrhtPrtcPolicyRepository")
	private CpyrhtPrtcPolicyRepository cpyrhtPrtcPolicyRepository;

	@Resource(name = "egovCpyrhtPrtcPolicyIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public CpyrhtPrtcPolicyVO selectCpyrhtPrtcPolicyDetail(CpyrhtPrtcPolicyVO vo) throws Exception {
		return cpyrhtPrtcPolicyRepository.findById(vo.getCpyrhtId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<EgovMap> selectCpyrhtPrtcPolicyList(CpyrhtPrtcPolicyDefaultVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<CpyrhtPrtcPolicy> page = cpyrhtPrtcPolicyRepository.findAll(pageable);

		return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public int selectCpyrhtPrtcPolicyListTotCnt(CpyrhtPrtcPolicyDefaultVO searchVO) {
		return (int) cpyrhtPrtcPolicyRepository.count();
	}

	@Override
	public void insertCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception {
		egovLogger.debug(vo.toString());
		String cpyrhtId = idgenService.getNextStringId();
		vo.setCpyrhtId(cpyrhtId);

		CpyrhtPrtcPolicy entity = CpyrhtPrtcPolicy.builder()
				.cpyrhtId(cpyrhtId)
				.cpyrhtPrtcPolicyCn(vo.getCpyrhtPrtcPolicyCn())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();

		cpyrhtPrtcPolicyRepository.save(entity);
	}

	@Override
	public void updateCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception {
		egovLogger.debug(vo.toString());
		cpyrhtPrtcPolicyRepository.findById(vo.getCpyrhtId()).ifPresent(entity -> {
			entity.update(vo.getCpyrhtPrtcPolicyCn(), vo.getLastUpdusrId());
			cpyrhtPrtcPolicyRepository.save(entity);
		});
	}

	@Override
	public void deleteCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception {
		egovLogger.debug(vo.toString());
		cpyrhtPrtcPolicyRepository.deleteById(vo.getCpyrhtId());
	}

	private CpyrhtPrtcPolicyVO toVO(CpyrhtPrtcPolicy entity) {
		CpyrhtPrtcPolicyVO vo = new CpyrhtPrtcPolicyVO();
		vo.setCpyrhtId(entity.getCpyrhtId());
		vo.setCpyrhtPrtcPolicyCn(entity.getCpyrhtPrtcPolicyCn());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		if (entity.getLastUpdusrPnttm() != null) {
			vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm().toString());
		}
		return vo;
	}

	private EgovMap toEgovMap(CpyrhtPrtcPolicy entity) {
		EgovMap map = new EgovMap();
		map.put("cpyrhtId", entity.getCpyrhtId());
		map.put("cpyrhtPrtcPolicyCn", entity.getCpyrhtPrtcPolicyCn());
		map.put("frstRegisterId", entity.getFrstRegisterId());
		map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
		return map;
	}

}
