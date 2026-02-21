package egovframework.com.uss.olp.qqm.service.impl;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.survey.QustnrQesitm;
import com.company.project.domain.survey.QustnrQesitmRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qqm.service.EgovQustnrQestnManageService;
import egovframework.com.uss.olp.qqm.service.QustnrQestnManageVO;
import jakarta.annotation.Resource;

@Service("egovQustnrQestnManageService")
public class EgovQustnrQestnManageServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrQestnManageService {

	@Resource(name = "qustnrQesitmRepository")
	private QustnrQesitmRepository qustnrQesitmRepository;

	@Resource(name = "egovQustnrQestnManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<EgovMap> selectQustnrManageStatistics2(Map<?, ?> map) throws Exception {
		// ??????? ?????? ?????Custom Repository ? ?
		// ??????????
		return Collections.emptyList();
	}

	@Override
	public List<?> selectQustnrManageStatistics(Map<?, ?> map) throws Exception {
		// ??????? ?????? ?????Custom Repository ? ?
		return Collections.emptyList();
	}

	@Override
	public Map<?, ?> selectQustnrManageQestnrSj(Map<?, ?> map) throws Exception {
		return Collections.emptyMap();
	}

	@Override
	public List<?> selectQustnrQestnManageList(ComDefaultVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<QustnrQesitm> page = qustnrQesitmRepository.findAll(pageable);

		return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public List<EgovMap> selectQustnrQestnManageDetail(QustnrQestnManageVO qustnrQestnManageVO) throws Exception {
		return qustnrQesitmRepository.findById(qustnrQestnManageVO.getQestnrQesitmId())
				.map(this::toEgovMap)
				.map(Collections::singletonList)
				.orElse(Collections.emptyList());
	}

	@Override
	public int selectQustnrQestnManageListCnt(ComDefaultVO searchVO) throws Exception {
		return (int) qustnrQesitmRepository.count();
	}

	@Override
	public void insertQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();
		qustnrQestnManageVO.setQestnrQesitmId(sMakeId);
		qustnrQesitmRepository.save(toEntity(qustnrQestnManageVO));
	}

	@Override
	public void updateQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception {
		qustnrQesitmRepository.findById(qustnrQestnManageVO.getQestnrQesitmId()).ifPresent(entity -> {
			entity.setQestnrTmplatId(qustnrQestnManageVO.getQestnrTmplatId());
			entity.setQestnrId(qustnrQestnManageVO.getQestnrId());
			if (qustnrQestnManageVO.getQestnSn() != null && !qustnrQestnManageVO.getQestnSn().isEmpty()) {
				entity.setQestnSn(Long.parseLong(qustnrQestnManageVO.getQestnSn()));
			}
			entity.setQestnTyCode(qustnrQestnManageVO.getQestnTyCode());
			entity.setQestnCn(qustnrQestnManageVO.getQestnCn());
			if (qustnrQestnManageVO.getMxmmChoiseCo() != null && !qustnrQestnManageVO.getMxmmChoiseCo().isEmpty()) {
				entity.setMxmmChoiseCo(Integer.parseInt(qustnrQestnManageVO.getMxmmChoiseCo()));
			}
			entity.setLastUpdusrId(qustnrQestnManageVO.getLastUpdusrId());
			entity.setLastUpdtPnttm(java.time.LocalDateTime.now().toString());
			qustnrQesitmRepository.save(entity);
		});
	}

	@Override
	public void deleteQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception {
		qustnrQesitmRepository.deleteById(qustnrQestnManageVO.getQestnrQesitmId());
	}

	private QustnrQesitm toEntity(QustnrQestnManageVO vo) {
		QustnrQesitm entity = new QustnrQesitm();
		entity.setQestnrQesitmId(vo.getQestnrQesitmId());
		entity.setQestnrTmplatId(vo.getQestnrTmplatId());
		entity.setQestnrId(vo.getQestnrId());
		if (vo.getQestnSn() != null && !vo.getQestnSn().isEmpty()) {
			entity.setQestnSn(Long.parseLong(vo.getQestnSn()));
		}
		entity.setQestnTyCode(vo.getQestnTyCode());
		entity.setQestnCn(vo.getQestnCn());
		if (vo.getMxmmChoiseCo() != null && !vo.getMxmmChoiseCo().isEmpty()) {
			entity.setMxmmChoiseCo(Integer.parseInt(vo.getMxmmChoiseCo()));
		}
		entity.setFrstRegisterId(vo.getFrstRegisterId());
		entity.setFrstRegisterPnttm(java.time.LocalDateTime.now().toString());
		return entity;
	}

	private EgovMap toEgovMap(QustnrQesitm entity) {
		EgovMap map = new EgovMap();
		map.put("qestnrQesitmId", entity.getQestnrQesitmId());
		map.put("qestnrTmplatId", entity.getQestnrTmplatId());
		map.put("qestnrId", entity.getQestnrId());
		map.put("qestnSn", String.valueOf(entity.getQestnSn()));
		map.put("qestnTyCode", entity.getQestnTyCode());
		map.put("qestnCn", entity.getQestnCn());
		map.put("mxmmChoiseCo", String.valueOf(entity.getMxmmChoiseCo()));
		map.put("frstRegisterId", entity.getFrstRegisterId());
		map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
		return map;
	}
}
