package egovframework.com.uss.olp.qtm.service.impl;

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

import com.company.project.domain.survey.QestnrTmplat;
import com.company.project.domain.survey.QestnrTmplatRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qtm.service.EgovQustnrTmplatManageService;
import egovframework.com.uss.olp.qtm.service.QustnrTmplatManageVO;
import jakarta.annotation.Resource;

@Service("egovQustnrTmplatManageService")
public class EgovQustnrTmplatManageServiceImpl extends EgovAbstractServiceImpl
		implements EgovQustnrTmplatManageService {

	@Resource(name = "qestnrTmplatRepository")
	private QestnrTmplatRepository qestnrTmplatRepository;

	@Resource(name = "egovQustnrTmplatManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public Map<?, ?> selectQustnrTmplatManageTmplatImagepathnm(QustnrTmplatManageVO qustnrTmplatManageVO)
			throws Exception {
		// ??? ??? ????????????
		return qestnrTmplatRepository.findById(qustnrTmplatManageVO.getQestnrTmplatId())
				.map(entity -> {
					EgovMap map = new EgovMap();
					map.put("qestnrTmplatImagepathnm", entity.getQestnrTmplatImagepathnm());
					return map;
				})
				.orElse(new EgovMap());
	}

	@Override
	public List<EgovMap> selectQustnrTmplatManageList(ComDefaultVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<QestnrTmplat> page = qestnrTmplatRepository.findAll(pageable);

		return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public List<EgovMap> selectQustnrTmplatManageDetail(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception {
		return qestnrTmplatRepository.findById(qustnrTmplatManageVO.getQestnrTmplatId())
				.map(this::toEgovMap)
				.map(Collections::singletonList)
				.orElse(Collections.emptyList());
	}

	@Override
	public int selectQustnrTmplatManageListCnt(ComDefaultVO searchVO) throws Exception {
		return (int) qestnrTmplatRepository.count();
	}

	@Override
	public void insertQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();
		qustnrTmplatManageVO.setQestnrTmplatId(sMakeId);
		qestnrTmplatRepository.save(toEntity(qustnrTmplatManageVO));
	}

	@Override
	public void updateQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO) {
		qestnrTmplatRepository.findById(qustnrTmplatManageVO.getQestnrTmplatId()).ifPresent(entity -> {
			entity.setQestnrTmplatTy(qustnrTmplatManageVO.getQestnrTmplatTy());
			// Convert byte[] to String
			if (qustnrTmplatManageVO.getQestnrTmplatImagepathnm() != null) {
				entity.setQestnrTmplatImagepathnm(new String(qustnrTmplatManageVO.getQestnrTmplatImagepathnm(),
						java.nio.charset.StandardCharsets.UTF_8));
			}
			entity.setQestnrTmplatCn(qustnrTmplatManageVO.getQestnrTmplatCn());
			entity.setLastUpdusrId(qustnrTmplatManageVO.getLastUpdusrId());
			entity.setLastUpdusrPnttm(java.time.LocalDateTime.now());
			qestnrTmplatRepository.save(entity);
		});
	}

	@Override
	public void deleteQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO) {
		qestnrTmplatRepository.deleteById(qustnrTmplatManageVO.getQestnrTmplatId());
	}

	private QestnrTmplat toEntity(QustnrTmplatManageVO vo) {
		QestnrTmplat entity = new QestnrTmplat();
		entity.setQestnrTmplatId(vo.getQestnrTmplatId());
		entity.setQestnrTmplatTy(vo.getQestnrTmplatTy());
		// Convert byte[] to String
		if (vo.getQestnrTmplatImagepathnm() != null) {
			entity.setQestnrTmplatImagepathnm(
					new String(vo.getQestnrTmplatImagepathnm(), java.nio.charset.StandardCharsets.UTF_8));
		}
		entity.setQestnrTmplatCn(vo.getQestnrTmplatCn());
		entity.setFrstRegisterId(vo.getFrstRegisterId());
		entity.setFrstRegisterPnttm(java.time.LocalDateTime.now());
		return entity;
	}

	private EgovMap toEgovMap(QestnrTmplat entity) {
		EgovMap map = new EgovMap();
		map.put("qestnrTmplatId", entity.getQestnrTmplatId());
		map.put("qestnrTmplatTy", entity.getQestnrTmplatTy());
		map.put("qestnrTmplatImagepathnm", entity.getQestnrTmplatImagepathnm());
		map.put("qestnrTmplatCn", entity.getQestnrTmplatCn());
		map.put("frstRegisterId", entity.getFrstRegisterId());
		map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
		return map;
	}
}
