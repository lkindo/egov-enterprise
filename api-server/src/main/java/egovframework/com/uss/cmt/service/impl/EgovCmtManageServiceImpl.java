package egovframework.com.uss.cmt.service.impl;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import com.company.project.domain.commute.Commute;
import com.company.project.domain.commute.Commute;
import com.company.project.domain.commute.CommuteDomainRepository;
import com.ibm.icu.util.Calendar;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.uss.cmt.service.CmtDefaultVO;
import egovframework.com.uss.cmt.service.CmtManageVO;
import egovframework.com.uss.cmt.service.EgovCmtManageService;
import jakarta.annotation.Resource;

@Service("cmtManageService")
public class EgovCmtManageServiceImpl extends EgovAbstractServiceImpl implements EgovCmtManageService {

	@Resource(name = "commuteDomainRepository")
	private CommuteDomainRepository commuteRepository;

	@Resource(name = "egovCmtManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Override
	public List<CmtManageVO> selectCmtInfoList(CmtDefaultVO cmtSearchVO) throws Exception {
		// 검색 조건이 복잡하지 않다면 findAll로 가져온 후 처리가능하나,
		// MyBatis mapper에 조건 없이 NCOMMUTE 전체 조회였음 (selectCmtList_S 참조).
		List<Commute> list = commuteRepository.findAll();
		return list.stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public String insertWrkStartCmtInfo(CmtManageVO cmtManageVO) throws Exception {
		String wrktmId = idgenService.getNextStringId();
		cmtManageVO.setWrktmId(wrktmId);

		Date date = Calendar.getInstance().getTime();
		String wrkStartTime = new SimpleDateFormat("HH:mm").format(date);
		cmtManageVO.setWrkStartTime(wrkStartTime);

		Commute entity = Commute.builder()
				.wrktmId(wrktmId)
				.emplyrId(cmtManageVO.getEmplyrId())
				.orgnztId(cmtManageVO.getOrgnztId())
				.wrktDt(cmtManageVO.getWrktDt())
				.wrkStartTime(wrkStartTime)
				.wrkHours(cmtManageVO.getWrkHours())
				.ovtmwrkHours(cmtManageVO.getOvtmwrkHours())
				.wrkStartStatus(cmtManageVO.getWrkStartStatus())
				.wrkEndStatus(cmtManageVO.getWrkEndStatus())
				.rm(cmtManageVO.getRm())
				.build();

		commuteRepository.save(entity);

		return wrktmId;
	}

	@Override
	public String selectWrktmId(CmtManageVO cmtManageVO) throws Exception {
		return commuteRepository.findByEmplyrIdAndWrktDt(cmtManageVO.getEmplyrId(), cmtManageVO.getWrktDt())
				.map(Commute::getWrktmId)
				.orElse(null);
	}

	@Override
	public int insertWrkEndCmtInfo(CmtManageVO cmtManageVO) throws Exception {
		// 기존 로직: selectWrkStartInfo -> VO 세팅 -> update
		// JPA: findByEmplyrIdAndWrktDt -> entity update -> save

		return commuteRepository.findByEmplyrIdAndWrktDt(cmtManageVO.getEmplyrId(), cmtManageVO.getWrktDt())
				.map(entity -> {
					Date date = Calendar.getInstance().getTime();
					String wrkEndTime = new SimpleDateFormat("HH:mm").format(date);

					String msg = egovMessageSource.getMessage("ussCmt.cmtManageServiceImpl.normal");

					entity.updateEndTime(
							wrkEndTime,
							"8", // wrkHours rule
							"0", // ovtmwrkHours rule
							msg, // wrkStartStatus
							msg // wrkEndStatus
					);
					commuteRepository.save(entity);
					return 1;
				}).orElse(0);
	}

	private CmtManageVO toVO(Commute entity) {
		CmtManageVO vo = new CmtManageVO();
		vo.setWrktmId(entity.getWrktmId());
		vo.setEmplyrId(entity.getEmplyrId());
		vo.setOrgnztId(entity.getOrgnztId());
		vo.setWrktDt(entity.getWrktDt());
		vo.setWrkStartTime(entity.getWrkStartTime());
		vo.setWrkEndTime(entity.getWrkEndTime());
		vo.setWrkHours(entity.getWrkHours());
		vo.setOvtmwrkHours(entity.getOvtmwrkHours());
		vo.setWrkStartStatus(entity.getWrkStartStatus());
		vo.setWrkEndStatus(entity.getWrkEndStatus());
		vo.setRm(entity.getRm());
		return vo;
	}

}