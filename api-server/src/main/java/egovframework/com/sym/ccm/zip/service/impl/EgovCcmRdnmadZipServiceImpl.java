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
 * 우편번호에 대한 서비스 구현클래스
 * 
 * @author 공통서비스 개발팀 이기하
 * @since 2011.11.21
 * @version 1.1
 */
@Service("RdnmadZipService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovCcmRdnmadZipServiceImpl extends EgovAbstractServiceImpl implements EgovCcmRdnmadZipManageService {

	private final RoadNameAddressZipRepository roadNameAddressZipRepository;

	/**
	 * 우편번호를 삭제한다.
	 */
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
	 * 우편번호 전체를 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteAllZip() throws Exception {
		roadNameAddressZipRepository.deleteAll();
	}

	/**
	 * 우편번호를 등록한다.
	 */
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
	 * 우편번호 엑셀파일을 등록한다 (TBD).
	 */
	@Override
	@Transactional
	public void insertExcelZip(InputStream file) throws Exception {
		throw new UnsupportedOperationException("Excel upload refactoring for JPA is in progress.");
	}

	/**
	 * 우편번호 상세항목을 조회한다.
	 */
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
	 * 우편번호 목록을 조회한다.
	 */
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
