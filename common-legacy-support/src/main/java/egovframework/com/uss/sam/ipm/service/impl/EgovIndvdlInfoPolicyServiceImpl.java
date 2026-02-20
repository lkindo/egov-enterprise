package egovframework.com.uss.sam.ipm.service.impl;

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

import com.company.project.domain.terms.IndvdlInfoPolicyRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.sam.ipm.service.EgovIndvdlInfoPolicyService;
// import egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy;
import jakarta.annotation.Resource;

@Service("egovIndvdlInfoPolicyService")
public class EgovIndvdlInfoPolicyServiceImpl extends EgovAbstractServiceImpl implements EgovIndvdlInfoPolicyService {

	@Resource(name = "indvdlInfoPolicyRepository")
	private IndvdlInfoPolicyRepository indvdlInfoPolicyRepository;

	@Resource(name = "egovIndvdlInfoPolicyIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<EgovMap> selectIndvdlInfoPolicyList(ComDefaultVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<com.company.project.domain.terms.IndvdlInfoPolicy> page = indvdlInfoPolicyRepository.findAll(pageable);

		return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public int selectIndvdlInfoPolicyListCnt(ComDefaultVO searchVO) throws Exception {
		return (int) indvdlInfoPolicyRepository.count();
	}

	@Override
	public egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy selectIndvdlInfoPolicyDetail(
			egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy indvdlInfoPolicyVO) throws Exception {
		com.company.project.domain.terms.IndvdlInfoPolicy entity = indvdlInfoPolicyRepository
				.findById(indvdlInfoPolicyVO.getIndvdlInfoId())
				.orElseThrow(() -> processException("info.nodata.msg"));
		return toVO(entity);
	}

	@Override
	public void insertIndvdlInfoPolicy(egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy indvdlInfoPolicyVO)
			throws Exception {
		String sMakeId = idgenService.getNextStringId();
		indvdlInfoPolicyVO.setIndvdlInfoId(sMakeId);

		com.company.project.domain.terms.IndvdlInfoPolicy entity = com.company.project.domain.terms.IndvdlInfoPolicy
				.builder()
				.indvdlInfoPolicyId(sMakeId)
				.indvdlInfoPolicyNm(indvdlInfoPolicyVO.getIndvdlInfoNm())
				.indvdlInfoPolicyCn(indvdlInfoPolicyVO.getIndvdlInfoDc())
				.indvdlInfoPolicyAgreAt(indvdlInfoPolicyVO.getIndvdlInfoYn())
				.frstRegisterId(indvdlInfoPolicyVO.getFrstRegisterId())
				.build();

		indvdlInfoPolicyRepository.save(entity);
	}

	@Override
	public void updateIndvdlInfoPolicy(egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy indvdlInfoPolicyVO)
			throws Exception {
		indvdlInfoPolicyRepository.findById(indvdlInfoPolicyVO.getIndvdlInfoId()).ifPresent(entity -> {
			entity.update(
					indvdlInfoPolicyVO.getIndvdlInfoNm(),
					indvdlInfoPolicyVO.getIndvdlInfoDc(),
					indvdlInfoPolicyVO.getIndvdlInfoYn(),
					indvdlInfoPolicyVO.getLastUpdusrId());
			indvdlInfoPolicyRepository.save(entity);
		});
	}

	@Override
	public void deleteIndvdlInfoPolicy(egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy indvdlInfoPolicyVO)
			throws Exception {
		indvdlInfoPolicyRepository.deleteById(indvdlInfoPolicyVO.getIndvdlInfoId());
	}

	private EgovMap toEgovMap(com.company.project.domain.terms.IndvdlInfoPolicy entity) {
		EgovMap map = new EgovMap();
		map.put("indvdlInfoId", entity.getIndvdlInfoPolicyId());
		map.put("indvdlInfoNm", entity.getIndvdlInfoPolicyNm());
		map.put("indvdlInfoDc", entity.getIndvdlInfoPolicyCn());
		map.put("indvdlInfoYn", entity.getIndvdlInfoPolicyAgreAt());
		map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
		map.put("frstRegisterId", entity.getFrstRegisterId());
		return map;
	}

	private egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy toVO(
			com.company.project.domain.terms.IndvdlInfoPolicy entity) {
		egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy vo = new egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy();
		vo.setIndvdlInfoId(entity.getIndvdlInfoPolicyId());
		vo.setIndvdlInfoNm(entity.getIndvdlInfoPolicyNm());
		vo.setIndvdlInfoDc(entity.getIndvdlInfoPolicyCn());
		vo.setIndvdlInfoYn(entity.getIndvdlInfoPolicyAgreAt());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setFrstRegisterPnttm(
				entity.getFrstRegisterPnttm() != null ? entity.getFrstRegisterPnttm().toString() : null);
		return vo;
	}
}
