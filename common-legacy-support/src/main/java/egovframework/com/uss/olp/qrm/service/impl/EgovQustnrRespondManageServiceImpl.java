package egovframework.com.uss.olp.qrm.service.impl;

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

import com.company.project.domain.survey.SurveyRespondent;
import com.company.project.domain.survey.SurveyRespondentRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qrm.service.EgovQustnrRespondManageService;
import egovframework.com.uss.olp.qrm.service.QustnrRespondManageVO;
import jakarta.annotation.Resource;

@Service("egovQustnrRespondManageService")
public class EgovQustnrRespondManageServiceImpl extends EgovAbstractServiceImpl
		implements EgovQustnrRespondManageService {

	@Resource(name = "surveyRespondentRepository")
	private SurveyRespondentRepository surveyRespondentRepository;

	@Resource(name = "qustnrRespondManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<EgovMap> selectQustnrRespondManageList(ComDefaultVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<SurveyRespondent> page = surveyRespondentRepository.findAll(pageable);

		return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public List<EgovMap> selectQustnrRespondManageDetail(QustnrRespondManageVO qustnrRespondManageVO) throws Exception {
		return surveyRespondentRepository.findById(qustnrRespondManageVO.getQestnrRespondId())
				.map(this::toEgovMap)
				.map(Collections::singletonList)
				.orElse(Collections.emptyList());
	}

	@Override
	public int selectQustnrRespondManageListCnt(ComDefaultVO searchVO) throws Exception {
		return (int) surveyRespondentRepository.count();
	}

	@Override
	public void insertQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();
		qustnrRespondManageVO.setQestnrRespondId(sMakeId);

		SurveyRespondent entity = SurveyRespondent.builder()
				.qestnrRespondId(sMakeId)
				.qestnrId(qustnrRespondManageVO.getQestnrId())
				.qestnrTmplatId(qustnrRespondManageVO.getQestnrTmplatId())
				.sexdstnCode(qustnrRespondManageVO.getSexdstnCode())
				.occpTyCode(qustnrRespondManageVO.getOccpTyCode())
				.respondNm(qustnrRespondManageVO.getRespondNm())
				.brth(qustnrRespondManageVO.getBrth())
				.areaNo(qustnrRespondManageVO.getAreaNo())
				.middleTelno(qustnrRespondManageVO.getMiddleTelno())
				.endTelno(qustnrRespondManageVO.getEndTelno())
				.frstRegisterId(qustnrRespondManageVO.getFrstRegisterId())
				.build();

		surveyRespondentRepository.save(entity);
	}

	@Override
	public void updateQustnrRespondManage(QustnrRespondManageVO vo) throws Exception {
		surveyRespondentRepository.findById(vo.getQestnrRespondId()).ifPresent(entity -> {
			entity.update(
					vo.getSexdstnCode(),
					vo.getOccpTyCode(),
					vo.getRespondNm(),
					vo.getBrth(),
					vo.getAreaNo(),
					vo.getMiddleTelno(),
					vo.getEndTelno(),
					vo.getLastUpdusrId());
			surveyRespondentRepository.save(entity);
		});
	}

	@Override
	public void deleteQustnrRespondManage(QustnrRespondManageVO qustnrRespondManageVO) throws Exception {
		surveyRespondentRepository.deleteById(qustnrRespondManageVO.getQestnrRespondId());
	}

	private EgovMap toEgovMap(SurveyRespondent entity) {
		EgovMap map = new EgovMap();
		map.put("qestnrRespondId", entity.getQestnrRespondId());
		map.put("qestnrId", entity.getQestnrId());
		map.put("qestnrTmplatId", entity.getQestnrTmplatId());
		map.put("sexdstnCode", entity.getSexdstnCode());
		map.put("occpTyCode", entity.getOccpTyCode());
		map.put("respondNm", entity.getRespondNm());
		map.put("brth", entity.getBrth());
		map.put("areaNo", entity.getAreaNo());
		map.put("middleTelno", entity.getMiddleTelno());
		map.put("endTelno", entity.getEndTelno());
		map.put("frstRegisterId", entity.getFrstRegisterId());
		map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
		return map;
	}
}
