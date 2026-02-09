package egovframework.com.uss.umt.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.user.DeptManage;
import com.company.project.domain.user.DeptManageRepository;

import egovframework.com.uss.umt.service.DeptManageVO;
import egovframework.com.uss.umt.service.EgovDeptManageService;
import jakarta.annotation.Resource;

@Service("egovDeptManageService")
public class EgovDeptManageServiceImpl extends EgovAbstractServiceImpl implements EgovDeptManageService {

	@Resource(name = "deptManageRepository")
	private DeptManageRepository deptManageRepository;

	@Override
	public List<DeptManageVO> selectDeptManageList(DeptManageVO deptManageVO) throws Exception {
		// 단순 전체 조회 (페이징 없음) - Restored original behavior
		List<DeptManage> entities = deptManageRepository.findAll(Sort.by(Sort.Direction.ASC, "orgnztId"));
		return entities.stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public List<DeptManageVO> selectDeptManageListPaged(DeptManageVO deptManageVO) throws Exception {
		int pageIndex = Math.max(0, deptManageVO.getPageIndex() - 1);
		// Use getRecordCountPerPage for rows per page
		int pageSize = deptManageVO.getRecordCountPerPage() > 0 ? deptManageVO.getRecordCountPerPage() : 10;

		Pageable pageable = PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.ASC, "orgnztId"));
		Page<DeptManage> page;

		if ("ORGNZT_NM".equals(deptManageVO.getSearchCondition())) {
			page = deptManageRepository.findByOrgnztNmContainingIgnoreCase(deptManageVO.getSearchKeyword(), pageable);
		} else if ("ORGNZT_DC".equals(deptManageVO.getSearchCondition())) {
			page = deptManageRepository.findByOrgnztDcContainingIgnoreCase(deptManageVO.getSearchKeyword(), pageable);
		} else {
			page = deptManageRepository.findAll(pageable);
		}

		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectDeptManageListTotCnt(DeptManageVO deptManageVO) throws Exception {
		// Supports search
		if ("ORGNZT_NM".equals(deptManageVO.getSearchCondition())) {
			return (int) deptManageRepository.countByOrgnztNmContainingIgnoreCase(deptManageVO.getSearchKeyword());
		} else if ("ORGNZT_DC".equals(deptManageVO.getSearchCondition())) {
			return (int) deptManageRepository.countByOrgnztDcContainingIgnoreCase(deptManageVO.getSearchKeyword());
		} else {
			return (int) deptManageRepository.count();
		}
	}

	@Override
	public DeptManageVO selectDeptManage(DeptManageVO deptManageVO) throws Exception {
		return deptManageRepository.findById(deptManageVO.getOrgnztId())
				.map(this::toVO)
				.orElse(null);
	}

	@Override
	public void insertDeptManage(DeptManageVO deptManageVO) throws Exception {
		DeptManage entity = DeptManage.builder()
				.orgnztId(deptManageVO.getOrgnztId())
				.orgnztNm(deptManageVO.getOrgnztNm())
				.orgnztDc(deptManageVO.getOrgnztDc())
				.build();
		deptManageRepository.save(entity);
	}

	@Override
	public void updateDeptManage(DeptManageVO deptManageVO) throws Exception {
		deptManageRepository.findById(deptManageVO.getOrgnztId()).ifPresent(entity -> {
			entity.update(deptManageVO.getOrgnztNm(), deptManageVO.getOrgnztDc());
			deptManageRepository.save(entity);
		});
	}

	@Override
	public void deleteDeptManage(DeptManageVO deptManageVO) throws Exception {
		deptManageRepository.deleteById(deptManageVO.getOrgnztId());
	}

	private DeptManageVO toVO(DeptManage entity) {
		DeptManageVO vo = new DeptManageVO();
		vo.setOrgnztId(entity.getOrgnztId());
		vo.setOrgnztNm(entity.getOrgnztNm());
		vo.setOrgnztDc(entity.getOrgnztDc());
		return vo;
	}
}
