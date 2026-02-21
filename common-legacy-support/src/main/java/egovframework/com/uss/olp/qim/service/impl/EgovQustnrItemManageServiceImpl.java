package egovframework.com.uss.olp.qim.service.impl;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.survey.QustnrIem;
import com.company.project.domain.survey.QustnrIemRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qim.service.EgovQustnrItemManageService;
import egovframework.com.uss.olp.qim.service.QustnrItemManageVO;
import jakarta.annotation.Resource;

@Service("egovQustnrItemManageService")
public class EgovQustnrItemManageServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrItemManageService {

	@Resource(name = "qustnrIemRepository")
	private QustnrIemRepository qustnrIemRepository;

	@Resource(name = "egovQustnrItemManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<EgovMap> selectQustnrTmplatManageList(QustnrItemManageVO qustnrItemManageVO) throws Exception {
		// ?????????? ?????????? ?? ? ?????
		return Collections.emptyList();
	}

	@Override
	public List<EgovMap> selectQustnrItemManageList(ComDefaultVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<QustnrIem> page = qustnrIemRepository.findAll(pageable);

		return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public List<EgovMap> selectQustnrItemManageDetail(QustnrItemManageVO qustnrItemManageVO) throws Exception {
		return qustnrIemRepository.findById(qustnrItemManageVO.getQustnrIemId())
				.map(this::toEgovMap)
				.map(Collections::singletonList)
				.orElse(Collections.emptyList());
	}

	@Override
	public int selectQustnrItemManageListCnt(ComDefaultVO searchVO) throws Exception {
		return (int) qustnrIemRepository.count();
	}

	@Override
	public void insertQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();
		qustnrItemManageVO.setQustnrIemId(sMakeId);
		qustnrIemRepository.save(toEntity(qustnrItemManageVO));
	}

	@Override
	public void updateQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception {
		qustnrIemRepository.findById(qustnrItemManageVO.getQustnrIemId()).ifPresent(entity -> {
			entity.setQestnrTmplatId(qustnrItemManageVO.getQestnrTmplatId());
			entity.setQestnrId(qustnrItemManageVO.getQestnrId());
			entity.setQestnrQesitmId(qustnrItemManageVO.getQestnrQesitmId());
			entity.setIemSn(Long.parseLong(qustnrItemManageVO.getIemSn()));
			entity.setIemCn(qustnrItemManageVO.getIemCn());
			entity.setLastUpdusrId(qustnrItemManageVO.getLastUpdusrId());
			entity.setLastUpdtPnttm(java.time.LocalDateTime.now().toString());
			qustnrIemRepository.save(entity);
		});
	}

	@Override
	public void deleteQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception {
		qustnrIemRepository.deleteById(qustnrItemManageVO.getQustnrIemId());
	}

	private QustnrIem toEntity(QustnrItemManageVO vo) {
		QustnrIem entity = new QustnrIem();
		entity.setQustnrIemId(vo.getQustnrIemId());
		entity.setQestnrTmplatId(vo.getQestnrTmplatId());
		entity.setQestnrId(vo.getQestnrId());
		entity.setQestnrQesitmId(vo.getQestnrQesitmId());
		if (vo.getIemSn() != null && !vo.getIemSn().isEmpty()) {
			entity.setIemSn(Long.parseLong(vo.getIemSn()));
		}
		entity.setIemCn(vo.getIemCn());
		entity.setFrstRegisterId(vo.getFrstRegisterId());
		entity.setFrstRegisterPnttm(java.time.LocalDateTime.now().toString());
		return entity;
	}

	private EgovMap toEgovMap(QustnrIem entity) {
		EgovMap map = new EgovMap();
		map.put("qustnrIemId", entity.getQustnrIemId());
		map.put("qestnrTmplatId", entity.getQestnrTmplatId());
		map.put("qestnrId", entity.getQestnrId());
		map.put("qestnrQesitmId", entity.getQestnrQesitmId());
		map.put("iemSn", entity.getIemSn().toString());
		map.put("iemCn", entity.getIemCn());
		map.put("frstRegisterId", entity.getFrstRegisterId());
		map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
		return map;
	}
}
