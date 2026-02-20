package egovframework.com.sym.ccm.ccc.service.impl;

import com.company.project.domain.code.CommonCodeCategory;
import com.company.project.domain.code.CommonCodeCategoryRepository;
import egovframework.com.sym.ccm.ccc.service.CmmnClCode;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;
import egovframework.com.sym.ccm.ccc.service.EgovCcmCmmnClCodeManageService;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service("CmmnClCodeManageService")
@RequiredArgsConstructor
public class EgovCcmCmmnClCodeManageServiceImpl extends EgovAbstractServiceImpl
		implements EgovCcmCmmnClCodeManageService {

	private final CommonCodeCategoryRepository categoryRepository;

	/**
	 * ???????????.
	 **/
	@Override
	public int selectCmmnClCodeListTotCnt(CmmnClCodeVO searchVO) throws Exception {
		return (int) categoryRepository.count(); // Basic count, search-aware count is handled in search method
	}

	/**
	 * ?????????.
	 **/
	@Override
	public List<CmmnClCodeVO> selectCmmnClCodeList(CmmnClCodeVO searchVO) throws Exception {
		PageRequest pageRequest = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage());
		Page<CommonCodeCategory> result = categoryRepository.searchCommonCodeCategories(
				searchVO.getSearchCondition(),
				searchVO.getSearchKeyword(),
				pageRequest);

		searchVO.setLastIndex(result.getTotalPages());

		return result.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	/**
	 * ?????????????.
	 **/
	@Override
	public CmmnClCode selectCmmnClCodeDetail(CmmnClCodeVO cmmnClCodeVO) throws Exception {
		return categoryRepository.findById(cmmnClCodeVO.getClCode())
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * ???????.
	 **/
	@Override
	@Transactional
	public void insertCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception {
		categoryRepository.save(toEntity(cmmnClCodeVO));
	}

	/**
	 * ?????????.
	 **/
	@Override
	@Transactional
	public void deleteCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception {
		categoryRepository.findById(cmmnClCodeVO.getClCode())
				.ifPresent(category -> category.delete()); // Soft delete
	}

	/**
	 * ????????.
	 **/
	@Override
	@Transactional
	public void updateCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception {
		categoryRepository.findById(cmmnClCodeVO.getClCode())
				.ifPresent(category -> category.update(
						cmmnClCodeVO.getClCodeNm(),
						cmmnClCodeVO.getClCodeDc(),
						cmmnClCodeVO.getUseAt(),
						cmmnClCodeVO.getLastUpdusrId()));
	}

	private CmmnClCodeVO toVO(CommonCodeCategory entity) {
		CmmnClCodeVO vo = new CmmnClCodeVO();
		vo.setClCode(entity.getClCode());
		vo.setClCodeNm(entity.getClCodeNm());
		vo.setClCodeDc(entity.getClCodeDc());
		vo.setUseAt(entity.getUseAt());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private CommonCodeCategory toEntity(CmmnClCodeVO vo) {
		return CommonCodeCategory.builder()
				.clCode(vo.getClCode())
				.clCodeNm(vo.getClCodeNm())
				.clCodeDc(vo.getClCodeDc())
				.useAt(vo.getUseAt())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
	}
}
