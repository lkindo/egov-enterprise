package egovframework.com.uss.olp.qmc.service.impl;

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

import com.company.project.domain.survey.QestnrInfo;
import com.company.project.domain.survey.QestnrInfoRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qmc.service.EgovQustnrManageService;
import egovframework.com.uss.olp.qmc.service.QustnrManageVO;
import jakarta.annotation.Resource;

@Service("egovQustnrManageService")
public class EgovQustnrManageServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrManageService {

	@Resource(name = "qestnrInfoRepository")
	private QestnrInfoRepository qestnrInfoRepository;

	@Resource(name = "egovQustnrManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<EgovMap> selectQustnrTmplatManageList(QustnrManageVO qustnrManageVO) throws Exception {
		// 템플릿 목록 조회 기능은 템플릿 서비스나 리포지토리를 이용해야 함.
		// 현재 QestnrInfoRepository에는 해당 기능이 없음.
		// 임시로 빈 리스트 반환 (기능 분리 권장)
		return Collections.emptyList();
	}

	@Override
	public List<EgovMap> selectQustnrManageList(ComDefaultVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<QestnrInfo> page = qestnrInfoRepository.findAll(pageable); // 검색 조건 추가 필요

		return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public QustnrManageVO selectQustnrManageDetailModel(QustnrManageVO qustnrManageVO) throws Exception {
		return qestnrInfoRepository.findById(qustnrManageVO.getQestnrId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<EgovMap> selectQustnrManageDetail(QustnrManageVO qustnrManageVO) throws Exception {
		// 상세 조회 결과를 List<EgovMap>으로 반환하는 기존 레거시 호환
		QestnrInfo entity = qestnrInfoRepository.findById(qustnrManageVO.getQestnrId())
				.orElseThrow(() -> processException("info.nodata.msg"));
		return Collections.singletonList(toEgovMap(entity));
	}

	@Override
	public int selectQustnrManageListCnt(ComDefaultVO searchVO) throws Exception {
		return (int) qestnrInfoRepository.count(); // 검색 조건 미반영
	}

	@Override
	public void insertQustnrManage(QustnrManageVO qustnrManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();
		qustnrManageVO.setQestnrId(sMakeId);
		qestnrInfoRepository.save(toEntity(qustnrManageVO));
	}

	@Override
	public void updateQustnrManage(QustnrManageVO qustnrManageVO) throws Exception {
		qestnrInfoRepository.findById(qustnrManageVO.getQestnrId()).ifPresent(entity -> {
			entity.setQestnrSj(qustnrManageVO.getQestnrSj());
			entity.setQestnrPurps(qustnrManageVO.getQestnrPurps());
			entity.setQestnrWritngGuidanceCn(qustnrManageVO.getQestnrWritngGuidanceCn());
			entity.setQestnrBeginDe(qustnrManageVO.getQestnrBeginDe());
			entity.setQestnrEndDe(qustnrManageVO.getQestnrEndDe());
			entity.setQestnrTrget(qustnrManageVO.getQestnrTrget());
			entity.setQestnrTmplatId(qustnrManageVO.getQestnrTmplatId());
			entity.setLastUpdusrId(qustnrManageVO.getLastUpdusrId());
			entity.setLastUpdtPnttm(java.time.LocalDateTime.now().toString());
			qestnrInfoRepository.save(entity);
		});
	}

	@Override
	public void deleteQustnrManage(QustnrManageVO qustnrManageVO) throws Exception {
		qestnrInfoRepository.deleteById(qustnrManageVO.getQestnrId());
	}

	private QestnrInfo toEntity(QustnrManageVO vo) {
		QestnrInfo entity = new QestnrInfo();
		entity.setQestnrId(vo.getQestnrId());
		entity.setQestnrSj(vo.getQestnrSj());
		entity.setQestnrPurps(vo.getQestnrPurps());
		entity.setQestnrWritngGuidanceCn(vo.getQestnrWritngGuidanceCn());
		entity.setQestnrBeginDe(vo.getQestnrBeginDe());
		entity.setQestnrEndDe(vo.getQestnrEndDe());
		entity.setQestnrTrget(vo.getQestnrTrget());
		entity.setQestnrTmplatId(vo.getQestnrTmplatId());
		entity.setFrstRegisterId(vo.getFrstRegisterId());
		entity.setFrstRegisterPnttm(java.time.LocalDateTime.now().toString());
		return entity;
	}

	private QustnrManageVO toVO(QestnrInfo entity) {
		QustnrManageVO vo = new QustnrManageVO();
		vo.setQestnrId(entity.getQestnrId());
		vo.setQestnrSj(entity.getQestnrSj());
		vo.setQestnrPurps(entity.getQestnrPurps());
		vo.setQestnrWritngGuidanceCn(entity.getQestnrWritngGuidanceCn());
		vo.setQestnrBeginDe(entity.getQestnrBeginDe());
		vo.setQestnrEndDe(entity.getQestnrEndDe());
		vo.setQestnrTrget(entity.getQestnrTrget());
		vo.setQestnrTmplatId(entity.getQestnrTmplatId());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm());
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		vo.setLastUpdusrPnttm(entity.getLastUpdtPnttm());
		return vo;
	}

	private EgovMap toEgovMap(QestnrInfo entity) {
		EgovMap map = new EgovMap();
		map.put("qestnrId", entity.getQestnrId());
		map.put("qestnrSj", entity.getQestnrSj());
		map.put("qestnrPurps", entity.getQestnrPurps());
		map.put("qestnrWritngGuidanceCn", entity.getQestnrWritngGuidanceCn());
		map.put("qestnrBeginDe", entity.getQestnrBeginDe());
		map.put("qestnrEndDe", entity.getQestnrEndDe());
		map.put("qestnrTrget", entity.getQestnrTrget());
		map.put("qestnrTmplatId", entity.getQestnrTmplatId());
		map.put("frstRegisterId", entity.getFrstRegisterId());
		map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
		return map;
	}
}
