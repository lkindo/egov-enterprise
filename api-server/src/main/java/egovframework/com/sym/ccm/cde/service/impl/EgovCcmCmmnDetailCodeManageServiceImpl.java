package egovframework.com.sym.ccm.cde.service.impl;

import com.company.project.domain.code.*;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.sym.ccm.cde.service.CmmnDetailCodeVO;
import egovframework.com.sym.ccm.cde.service.EgovCcmCmmnDetailCodeManageService;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service("CmmnDetailCodeManageService")
@RequiredArgsConstructor
public class EgovCcmCmmnDetailCodeManageServiceImpl extends EgovAbstractServiceImpl
		implements EgovCcmCmmnDetailCodeManageService {

	private final CommonCodeRepository detailRepository;

	/**
	 * 공통상세코드 총 개수를 조회한다.
	 */
	@Override
	public int selectCmmnDetailCodeListTotCnt(CmmnDetailCodeVO searchVO) throws Exception {
		return (int) detailRepository.count();
	}

	/**
	 * 공통상세코드 목록을 조회한다.
	 */
	@Override
	@Cacheable(value = "commonCodes", key = "#searchVO.toString()")
	public List<CmmnDetailCodeVO> selectCmmnDetailCodeList(CmmnDetailCodeVO searchVO) throws Exception {
		PageRequest pageRequest = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage());
		Page<CommonCodeDetailProjection> result = detailRepository.searchCommonCodeDetails(
				searchVO.getSearchCondition(),
				searchVO.getSearchKeyword(),
				pageRequest);

		searchVO.setLastIndex(result.getTotalPages());

		return result.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	/**
	 * 공통상세코드 상세항목을 조회한다.
	 */
	@Override
	@Cacheable(value = "commonCodes", key = "#cmmnDetailCodeVO.codeId + ':' + #cmmnDetailCodeVO.code")
	public CmmnDetailCode selectCmmnDetailCodeDetail(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception {
		CommonCodeId id = new CommonCodeId(cmmnDetailCodeVO.getCodeId(), cmmnDetailCodeVO.getCode());
		return detailRepository.findById(id)
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 공통상세코드를 삭제한다.
	 */
	@Override
	@Transactional
	@CacheEvict(value = "commonCodes", allEntries = true)
	public void deleteCmmnDetailCode(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception {
		CommonCodeId id = new CommonCodeId(cmmnDetailCodeVO.getCodeId(), cmmnDetailCodeVO.getCode());
		detailRepository.findById(id)
				.ifPresent(detail -> detail.delete());
	}

	/**
	 * 공통상세코드를 등록한다.
	 */
	@Override
	@Transactional
	@CacheEvict(value = "commonCodes", allEntries = true)
	public void insertCmmnDetailCode(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception {
		detailRepository.save(CommonCode.builder()
				.codeGroupId(cmmnDetailCodeVO.getCodeId())
				.code(cmmnDetailCodeVO.getCode())
				.codeNm(cmmnDetailCodeVO.getCodeNm())
				.codeDc(cmmnDetailCodeVO.getCodeDc())
				.useAt(cmmnDetailCodeVO.getUseAt())
				.frstRegisterId(cmmnDetailCodeVO.getFrstRegisterId())
				.build());
	}

	/**
	 * 공통상세코드를 수정한다.
	 */
	@Override
	@Transactional
	@CacheEvict(value = "commonCodes", allEntries = true)
	public void updateCmmnDetailCode(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception {
		CommonCodeId id = new CommonCodeId(cmmnDetailCodeVO.getCodeId(), cmmnDetailCodeVO.getCode());
		detailRepository.findById(id)
				.ifPresent(detail -> detail.update(
						cmmnDetailCodeVO.getCodeNm(),
						cmmnDetailCodeVO.getCodeDc(),
						cmmnDetailCodeVO.getUseAt(),
						cmmnDetailCodeVO.getLastUpdusrId()));
	}

	private CmmnDetailCodeVO toVO(CommonCode entity) {
		CmmnDetailCodeVO vo = new CmmnDetailCodeVO();
		vo.setCodeId(entity.getCodeGroupId());
		vo.setCode(entity.getCode());
		vo.setCodeNm(entity.getCodeNm());
		vo.setCodeDc(entity.getCodeDc());
		vo.setUseAt(entity.getUseAt());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}

	private CmmnDetailCodeVO toVO(CommonCodeDetailProjection projection) {
		CmmnDetailCodeVO vo = new CmmnDetailCodeVO();
		vo.setCodeId(projection.getCodeId());
		vo.setCodeIdNm(projection.getCodeIdNm());
		vo.setCode(projection.getCode());
		vo.setCodeNm(projection.getCodeNm());
		vo.setCodeDc(projection.getCodeDc());
		vo.setUseAt(projection.getUseAt());
		return vo;
	}
}
