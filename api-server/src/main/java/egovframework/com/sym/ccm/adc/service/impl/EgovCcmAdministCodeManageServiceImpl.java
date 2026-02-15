package egovframework.com.sym.ccm.adc.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.code.AdministCode;
import com.company.project.domain.code.AdministCode.AdministCodeId;
import com.company.project.domain.code.AdministCodeRepository;

import egovframework.com.sym.ccm.adc.service.EgovCcmAdministCodeManageService;
import egovframework.com.sym.ccm.adc.service.AdministCodeVO;
import lombok.RequiredArgsConstructor;

/**
 * 행정코드에 대한 서비스 구현클래스
 * 
 * @author 공통서비스 개발팀 이중호
 * @since 2009.04.01
 * @version 1.1
 */
@Service("AdministCodeManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovCcmAdministCodeManageServiceImpl extends EgovAbstractServiceImpl
		implements EgovCcmAdministCodeManageService {

	private final AdministCodeRepository administCodeRepository;

	/**
	 * 행정코드를 삭제한다 (Soft Delete).
	 */
	@Override
	@Transactional
	public void deleteAdministCode(egovframework.com.sym.ccm.adc.service.AdministCode vo) throws Exception {
		AdministCodeId id = AdministCodeId.builder()
				.administZoneSe(vo.getAdministZoneSe())
				.administZoneCode(vo.getAdministZoneCode())
				.build();
		administCodeRepository.findById(id).ifPresent(e -> {
			e.softDelete(vo.getAblDe());
		});
	}

	/**
	 * 행정코드를 등록한다.
	 */
	@Override
	@Transactional
	public void insertAdministCode(egovframework.com.sym.ccm.adc.service.AdministCode vo) throws Exception {
		AdministCode entity = AdministCode.builder()
				.id(AdministCodeId.builder()
						.administZoneSe(vo.getAdministZoneSe())
						.administZoneCode(vo.getAdministZoneCode())
						.build())
				.administZoneNm(vo.getAdministZoneNm())
				.upperAdministZoneCode(vo.getUpperAdministZoneCode())
				.creatDe(vo.getCreatDe())
				.ablDe(vo.getAblDe())
				.useAt(vo.getUseAt())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
		administCodeRepository.save(entity);
	}

	/**
	 * 행정코드 상세항목을 조회한다.
	 */
	@Override
	public egovframework.com.sym.ccm.adc.service.AdministCode selectAdministCodeDetail(
			egovframework.com.sym.ccm.adc.service.AdministCode vo) throws Exception {
		AdministCodeId id = AdministCodeId.builder()
				.administZoneSe(vo.getAdministZoneSe())
				.administZoneCode(vo.getAdministZoneCode())
				.build();
		return administCodeRepository.findById(id)
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 행정코드 목록을 조회한다.
	 */
	@Override
	public List<EgovMap> selectAdministCodeList(AdministCodeVO searchVO) throws Exception {
		int pageIndex = searchVO.getPageIndex() > 0 ? searchVO.getPageIndex() - 1 : 0;
		Pageable pageable = PageRequest.of(pageIndex, searchVO.getRecordCountPerPage(),
				Sort.by("id.administZoneCode").ascending());

		// Simple search logic using stream (Can be optimized with QueryDSL later)
		return administCodeRepository.findAll(pageable).getContent().stream()
				.filter(e -> {
					if ("1".equals(searchVO.getSearchCondition())) {
						return "1".equals(e.getId().getAdministZoneSe())
								&& e.getAdministZoneNm().contains(searchVO.getSearchKeyword());
					} else if ("2".equals(searchVO.getSearchCondition())) {
						return "2".equals(e.getId().getAdministZoneSe())
								&& e.getAdministZoneNm().contains(searchVO.getSearchKeyword());
					}
					return true;
				})
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("administZoneSe", e.getId().getAdministZoneSe());
					map.put("administZoneCode", e.getId().getAdministZoneCode());
					map.put("administZoneNm", e.getAdministZoneNm());
					map.put("upperAdministZoneCode", e.getUpperAdministZoneCode());
					map.put("creatDe", e.getCreatDe());
					map.put("ablDe", e.getAblDe());
					map.put("useAt", e.getUseAt());
					return map;
				}).collect(Collectors.toList());
	}

	/**
	 * 행정코드 총 개수를 조회한다.
	 */
	@Override
	public int selectAdministCodeListTotCnt(AdministCodeVO searchVO) throws Exception {
		return selectAdministCodeList(searchVO).size();
	}

	/**
	 * 행정코드를 수정한다.
	 */
	@Override
	@Transactional
	public void updateAdministCode(egovframework.com.sym.ccm.adc.service.AdministCode vo) throws Exception {
		AdministCodeId id = AdministCodeId.builder()
				.administZoneSe(vo.getAdministZoneSe())
				.administZoneCode(vo.getAdministZoneCode())
				.build();
		administCodeRepository.findById(id).ifPresent(e -> {
			e.update(vo.getAdministZoneNm(), vo.getUpperAdministZoneCode(), vo.getCreatDe(), vo.getAblDe(),
					vo.getUseAt(), vo.getLastUpdusrId());
		});
	}

	private egovframework.com.sym.ccm.adc.service.AdministCode toVO(AdministCode entity) {
		egovframework.com.sym.ccm.adc.service.AdministCode vo = new egovframework.com.sym.ccm.adc.service.AdministCode();
		vo.setAdministZoneSe(entity.getId().getAdministZoneSe());
		vo.setAdministZoneCode(entity.getId().getAdministZoneCode());
		vo.setAdministZoneNm(entity.getAdministZoneNm());
		vo.setUpperAdministZoneCode(entity.getUpperAdministZoneCode());
		vo.setCreatDe(entity.getCreatDe());
		vo.setAblDe(entity.getAblDe());
		vo.setUseAt(entity.getUseAt());
		return vo;
	}
}
