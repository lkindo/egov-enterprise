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

import com.company.project.domain.code.RoadNameAddressZipCode;
import com.company.project.domain.code.RoadNameAddressZipCode.RoadNameAddressZipId;
import com.company.project.domain.code.RoadNameAddressZipRepository;

import egovframework.com.sym.ccm.zip.service.EgovCcmRdnmadZipManageService;
import egovframework.com.sym.ccm.zip.service.Zip;
import egovframework.com.sym.ccm.zip.service.ZipVO;
import lombok.RequiredArgsConstructor;

/**
 * ??????????????????
 * 
 * @author ???????? ????
 * @since 2011.11.21
 * @version 1.1
 **/
@Service("RdnmadZipService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovCcmRdnmadZipServiceImpl extends EgovAbstractServiceImpl implements EgovCcmRdnmadZipManageService {

	private final RoadNameAddressZipRepository roadNameAddressZipRepository;

	/**
	 * ????????.
	 **/
	@Override
	@Transactional
	public void deleteZip(Zip vo) throws Exception {
		RoadNameAddressZipId id = RoadNameAddressZipId.builder()
				.rdmnCode(vo.getRdmnCode())
				.sn((long) vo.getSn())
				.build();
		roadNameAddressZipRepository.deleteById(id);
	}

	/**
	 * ???????????.
	 **/
	@Override
	@Transactional
	public void deleteAllZip() throws Exception {
		roadNameAddressZipRepository.deleteAll();
	}

	/**
	 * ??????.
	 **/
	@Override
	@Transactional
	public void insertZip(Zip vo) {
		RoadNameAddressZipCode entity = RoadNameAddressZipCode.builder()
				.id(RoadNameAddressZipId.builder()
						.rdmnCode(vo.getRdmnCode())
						.sn((long) vo.getSn())
						.build())
				.ctprvnNm(vo.getCtprvnNm())
				.signguNm(vo.getSignguNm())
				.rdmn(vo.getRdmn())
				.bdnbrMnnm(vo.getBdnbrMnnm())
				.bdnbrSlno(vo.getBdnbrSlno())
				.buldNm(vo.getBuldNm())
				.detailBuldNm(vo.getDetailBuldNm())
				.zip(vo.getZip())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
		roadNameAddressZipRepository.save(entity);
	}

	/**
	 * ????????????? (TBD).
	 **/
	@Override
	@Transactional
	public void insertExcelZip(InputStream file) throws Exception {
		throw new UnsupportedOperationException("Excel upload refactoring for JPA is in progress.");
	}

	/**
	 * ????????????.
	 **/
	@Override
	public Zip selectZipDetail(Zip vo) throws Exception {
		RoadNameAddressZipId id = RoadNameAddressZipId.builder()
				.rdmnCode(vo.getRdmnCode())
				.sn((long) vo.getSn())
				.build();
		return roadNameAddressZipRepository.findById(id)
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

		return roadNameAddressZipRepository.findAll(pageable).getContent().stream()
				.filter(e -> {
					String keyword = searchVO.getSearchKeyword();
					if (keyword == null || keyword.isEmpty())
						return true;

					if ("1".equals(searchVO.getSearchCondition2()))
						return e.getZip().contains(keyword);
					if ("2".equals(searchVO.getSearchCondition2()))
						return e.getCtprvnNm().contains(keyword);
					if ("3".equals(searchVO.getSearchCondition2()))
						return e.getSignguNm().contains(keyword);
					if ("4".equals(searchVO.getSearchCondition2()))
						return e.getRdmn().contains(keyword);
					if ("5".equals(searchVO.getSearchCondition2()))
						return e.getBuldNm().contains(keyword);
					if ("6".equals(searchVO.getSearchCondition2()))
						return e.getDetailBuldNm().contains(keyword);
					return true;
				})
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("rdmnCode", e.getId().getRdmnCode());
					map.put("sn", e.getId().getSn());
					map.put("ctprvnNm", e.getCtprvnNm());
					map.put("signguNm", e.getSignguNm());
					map.put("rdmn", e.getRdmn());
					map.put("bdnbrMnnm", e.getBdnbrMnnm());
					map.put("bdnbrSlno", e.getBdnbrSlno());
					map.put("buldNm", e.getBuldNm());
					map.put("detailBuldNm", e.getDetailBuldNm());
					map.put("zip", e.getZip());
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
		RoadNameAddressZipId id = RoadNameAddressZipId.builder()
				.rdmnCode(vo.getRdmnCode())
				.sn((long) vo.getSn())
				.build();
		roadNameAddressZipRepository.findById(id).ifPresent(e -> {
			e.update(vo.getCtprvnNm(), vo.getSignguNm(), vo.getRdmn(), vo.getBdnbrMnnm(), vo.getBdnbrSlno(),
					vo.getBuldNm(), vo.getDetailBuldNm(), vo.getZip(), vo.getLastUpdusrId());
		});
	}

	private Zip toVO(RoadNameAddressZipCode entity) {
		Zip vo = new Zip();
		vo.setRdmnCode(entity.getId().getRdmnCode());
		vo.setSn(entity.getId().getSn().intValue());
		vo.setCtprvnNm(entity.getCtprvnNm());
		vo.setSignguNm(entity.getSignguNm());
		vo.setRdmn(entity.getRdmn());
		vo.setBdnbrMnnm(entity.getBdnbrMnnm());
		vo.setBdnbrSlno(entity.getBdnbrSlno());
		vo.setBuldNm(entity.getBuldNm());
		vo.setDetailBuldNm(entity.getDetailBuldNm());
		vo.setZip(entity.getZip());
		return vo;
	}
}
