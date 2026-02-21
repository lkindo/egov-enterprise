package egovframework.com.sym.ccm.cca.service.impl;

import com.company.project.domain.code.CommonCodeGroup;
import com.company.project.domain.code.CommonCodeGroupProjection;
import com.company.project.domain.code.CommonCodeGroupRepository;
import egovframework.com.sym.ccm.cca.service.CmmnCode;
import egovframework.com.sym.ccm.cca.service.CmmnCodeVO;
import egovframework.com.sym.ccm.cca.service.EgovCcmCmmnCodeManageService;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service("CmmnCodeManageService")
@RequiredArgsConstructor
public class EgovCcmCmmnCodeManageServiceImpl extends EgovAbstractServiceImpl implements EgovCcmCmmnCodeManageService {

	private final CommonCodeGroupRepository groupRepository;

	/**
	 * ?? ???????.
	 **/
	@Override
	public int selectCmmnCodeListTotCnt(CmmnCodeVO searchVO) throws Exception {
		return (int) groupRepository.count();
	}

	/**
	 * ?? ?????.
	 **/
	@Override
	public List<CmmnCodeVO> selectCmmnCodeList(CmmnCodeVO searchVO) throws Exception {
		PageRequest pageRequest = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage());
		Page<CommonCodeGroupProjection> result = groupRepository.searchCommonCodeGroups(
				searchVO.getSearchCondition(),
				searchVO.getSearchKeyword(),
				pageRequest);

		searchVO.setLastIndex(result.getTotalPages());

		return result.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	/**
	 * ?? ?????????.
	 **/
	@Override
	public CmmnCodeVO selectCmmnCodeDetail(CmmnCodeVO cmmnCodeVO) throws Exception {
		return groupRepository.findById(cmmnCodeVO.getCodeId())
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * ????????.
	 **/
	@Override
	@Transactional
	public void updateCmmnCode(CmmnCodeVO cmmnCodeVO) throws Exception {
		groupRepository.findById(cmmnCodeVO.getCodeId())
				.ifPresent(group -> group.update(
						cmmnCodeVO.getCodeIdNm(),
						cmmnCodeVO.getCodeIdDc(),
						cmmnCodeVO.getUseAt(),
						cmmnCodeVO.getLastUpdusrId()));
	}

	/**
	 * ???????.
	 **/
	@Override
	@Transactional
	public void insertCmmnCode(CmmnCode cmmnCode) throws Exception {
		groupRepository.save(CommonCodeGroup.builder()
				.codeId(cmmnCode.getCodeId())
				.codeIdNm(cmmnCode.getCodeIdNm())
				.codeIdDc(cmmnCode.getCodeIdDc())
				.clCode(cmmnCode.getClCode())
				.useAt(cmmnCode.getUseAt())
				.frstRegisterId(cmmnCode.getFrstRegisterId())
				.build());
	}

	/**
	 * ?????????.
	 **/
	@Override
	@Transactional
	public void deleteCmmnCode(CmmnCode cmmnCode) throws Exception {
		groupRepository.findById(cmmnCode.getCodeId())
				.ifPresent(group -> group.delete());
	}

	private CmmnCodeVO toVO(CommonCodeGroup entity) {
		CmmnCodeVO vo = new CmmnCodeVO();
		vo.setCodeId(entity.getCodeId());
		vo.setCodeIdNm(entity.getCodeIdNm());
		vo.setCodeIdDc(entity.getCodeIdDc());
		vo.setClCode(entity.getClCode());
		vo.setUseAt(entity.getUseAt());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private CmmnCodeVO toVO(CommonCodeGroupProjection projection) {
		CmmnCodeVO vo = new CmmnCodeVO();
		vo.setCodeId(projection.getCodeId());
		vo.setCodeIdNm(projection.getCodeIdNm());
		vo.setCodeIdDc(projection.getCodeIdDc());
		vo.setClCode(projection.getClCode());
		vo.setClCodeNm(projection.getClCodeNm());
		vo.setUseAt(projection.getUseAt());
		return vo;
	}
}
