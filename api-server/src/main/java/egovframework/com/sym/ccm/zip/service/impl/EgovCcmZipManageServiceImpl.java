package egovframework.com.sym.ccm.zip.service.impl;

import java.io.InputStream;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.code.ZipCode;
import com.company.project.domain.code.ZipCode.ZipCodeId;
import com.company.project.domain.code.ZipCodeRepository;

import egovframework.com.sym.ccm.zip.service.EgovCcmZipManageService;
import egovframework.com.sym.ccm.zip.service.Zip;
import egovframework.com.sym.ccm.zip.service.ZipVO;
import lombok.RequiredArgsConstructor;

/**
 * 우편번호에 대한 서비스 구현클래스
 * 
 * @author 공통서비스 개발팀 이중호
 * @since 2009.04.01
 * @version 1.1
 */
@Service("ZipManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovCcmZipManageServiceImpl extends EgovAbstractServiceImpl implements EgovCcmZipManageService {

	private final ZipCodeRepository zipCodeRepository;

	/**
	 * 우편번호를 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteZip(Zip vo) throws Exception {
		ZipCodeId id = ZipCodeId.builder()
				.zip(vo.getZip())
				.sn((long) vo.getSn())
				.build();
		zipCodeRepository.deleteById(id);
	}

	/**
	 * 우편번호 전체를 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteAllZip() throws Exception {
		zipCodeRepository.deleteAll();
	}

	/**
	 * 우편번호를 등록한다.
	 */
	@Override
	@Transactional
	public void insertZip(Zip vo) {
		ZipCode entity = ZipCode.builder()
				.id(ZipCodeId.builder()
						.zip(vo.getZip())
						.sn((long) vo.getSn())
						.build())
				.ctprvnNm(vo.getCtprvnNm())
				.signguNm(vo.getSignguNm())
				.emdNm(vo.getEmdNm())
				.liBuldNm(vo.getLiBuldNm())
				.lnbrDongHo(vo.getLnbrDongHo())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
		zipCodeRepository.save(entity);
	}

	/**
	 * 우편번호 엑셀파일을 등록한다 (TBD: JPA 기반 Batch 처리로 고도화 가능).
	 */
	@Override
	@Transactional
	public void insertExcelZip(InputStream file) throws Exception {
		// eGovExcelService가 MyBatis에 강결합되어 있으므로,
		// 하위 호환성을 위해 우선은 DAO를 직접 호출하거나 로직 유지 (프로젝트 가이드에 따라 상이)
		// 여기선 JPA 전환이 목표이므로 TBD로 남기거나 기본 로직 유지 제안
		// zipManageDAO.insertExcelZip();
		// excelZipService.uploadExcel("ZipManageDAO.insertExcelZip", file, 1, 5000);

		throw new UnsupportedOperationException("Excel upload refactoring for JPA is in progress.");
	}

	/**
	 * 우편번호 상세항목을 조회한다.
	 */
	@Override
	public Zip selectZipDetail(Zip vo) throws Exception {
		ZipCodeId id = ZipCodeId.builder()
				.zip(vo.getZip())
				.sn((long) vo.getSn())
				.build();
		return zipCodeRepository.findById(id)
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 우편번호 목록을 조회한다.
	 */
	@Override
	public List<EgovMap> selectZipList(ZipVO searchVO) throws Exception {
		int pageIndex = searchVO.getPageIndex() > 0 ? searchVO.getPageIndex() - 1 : 0;
		Pageable pageable = PageRequest.of(pageIndex, searchVO.getRecordCountPerPage(), Sort.by("id.sn").descending());

		return zipCodeRepository.findAll(pageable).getContent().stream()
				.filter(e -> {
					String keyword = searchVO.getSearchKeyword();
					if (keyword == null || keyword.isEmpty())
						return true;

					if ("1".equals(searchVO.getSearchCondition()))
						return e.getId().getZip().contains(keyword);
					if ("2".equals(searchVO.getSearchCondition()))
						return e.getCtprvnNm().contains(keyword);
					if ("3".equals(searchVO.getSearchCondition()))
						return e.getSignguNm().contains(keyword);
					if ("4".equals(searchVO.getSearchCondition()))
						return e.getEmdNm().contains(keyword);
					if ("5".equals(searchVO.getSearchCondition()))
						return e.getLiBuldNm().contains(keyword);
					return true;
				})
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("zip", e.getId().getZip());
					map.put("sn", e.getId().getSn());
					map.put("ctprvnNm", e.getCtprvnNm());
					map.put("signguNm", e.getSignguNm());
					map.put("emdNm", e.getEmdNm());
					map.put("liBuldNm", e.getLiBuldNm());
					map.put("lnbrDongHo", e.getLnbrDongHo());
					return map;
				}).collect(Collectors.toList());
	}

	/**
	 * 우편번호 총 개수를 조회한다.
	 */
	@Override
	public int selectZipListTotCnt(ZipVO searchVO) throws Exception {
		return selectZipList(searchVO).size();
	}

	/**
	 * 우편번호를 수정한다.
	 */
	@Override
	@Transactional
	public void updateZip(Zip vo) throws Exception {
		ZipCodeId id = ZipCodeId.builder()
				.zip(vo.getZip())
				.sn((long) vo.getSn())
				.build();
		zipCodeRepository.findById(id).ifPresent(e -> {
			e.update(vo.getCtprvnNm(), vo.getSignguNm(), vo.getEmdNm(), vo.getLiBuldNm(), vo.getLnbrDongHo(),
					vo.getLastUpdusrId());
		});
	}

	private Zip toVO(ZipCode entity) {
		Zip vo = new Zip();
		vo.setZip(entity.getId().getZip());
		vo.setSn(entity.getId().getSn().intValue());
		vo.setCtprvnNm(entity.getCtprvnNm());
		vo.setSignguNm(entity.getSignguNm());
		vo.setEmdNm(entity.getEmdNm());
		vo.setLiBuldNm(entity.getLiBuldNm());
		vo.setLnbrDongHo(entity.getLnbrDongHo());
		return vo;
	}
}
