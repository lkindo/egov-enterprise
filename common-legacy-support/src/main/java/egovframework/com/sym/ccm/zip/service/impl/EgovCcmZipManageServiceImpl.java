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
 * ??????????????????
 * 
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.1
 **/
@Service("ZipManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovCcmZipManageServiceImpl extends EgovAbstractServiceImpl implements EgovCcmZipManageService {

	private final ZipCodeRepository zipCodeRepository;

	/**
	 * ????????.
	 **/
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
	 * ???????????.
	 **/
	@Override
	@Transactional
	public void deleteAllZip() throws Exception {
		zipCodeRepository.deleteAll();
	}

	/**
	 * ??????.
	 **/
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
	 * ????????????? (TBD: JPA ?Batch ???????.
	 **/
	@Override
	@Transactional
	public void insertExcelZip(InputStream file) throws Exception {
		// eGovExcelService MyBatis?????????
		// ?? ?? ? ??? DAO???????????? (??? ????? ?)
		// ????JPA ???????TBD????????? ??
		// zipManageDAO.insertExcelZip();
		// excelZipService.uploadExcel("ZipManageDAO.insertExcelZip", file, 1, 5000);

		throw new UnsupportedOperationException("Excel upload refactoring for JPA is in progress.");
	}

	/**
	 * ????????????.
	 **/
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
	 * ????????.
	 **/
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
	 * ??????????.
	 **/
	@Override
	public int selectZipListTotCnt(ZipVO searchVO) throws Exception {
		return selectZipList(searchVO).size();
	}

	/**
	 * ???????.
	 **/
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
