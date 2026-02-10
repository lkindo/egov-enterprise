package egovframework.com.ssi.syi.ist.service.impl;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.integration.SystemConnectionRepository;
import com.company.project.domain.integration.SystemConnectionStatsDto;

import egovframework.com.ssi.syi.ist.service.CntcSttus;
import egovframework.com.ssi.syi.ist.service.CntcSttusVO;
import egovframework.com.ssi.syi.ist.service.EgovCntcSttusService;
import lombok.RequiredArgsConstructor;

/**
 * 연계현황 관리에 관한 비즈니스 구현 클래스
 * 
 * @author 공통서비스 개발팀 이중호
 * @since 2009.04.01
 * @version 1.1
 */
@Service("CntcSttusService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovCntcSttusServiceImpl extends EgovAbstractServiceImpl implements EgovCntcSttusService {

	private final SystemConnectionRepository systemConnectionRepository;

	/**
	 * 연계현황 목록을 조회한다 (QueryDSL 최적화).
	 */
	@Override
	public List<EgovMap> selectCntcSttusList(CntcSttusVO cntcSttusVO) throws Exception {
		List<SystemConnectionStatsDto> stats = systemConnectionRepository
				.findSystemConnectionStats(cntcSttusVO.getSearchKeyword());

		return stats.stream()
				.map(dto -> {
					EgovMap map = new EgovMap();
					map.put("cntcId", dto.getCntcId());
					map.put("cntcNm", dto.getCntcNm());
					map.put("cntcType", dto.getCntcType());
					map.put("cntAll", dto.getCntAll());
					map.put("cntSuccess", dto.getCntSuccess());
					map.put("cntFail", dto.getCntFail());
					map.put("provdInsttId", dto.getProvdInsttId());
					map.put("provdSysId", dto.getProvdSysId());
					map.put("provdSvcId", Objects.toString(dto.getProvdSvcId(), ""));
					map.put("requstInsttId", dto.getRequstInsttId());
					map.put("requstSysId", dto.getRequstSysId());
					map.put("provdInsttNm", dto.getProvdInsttNm());
					map.put("requstInsttNm", dto.getRequstInsttNm());
					return map;
				}).collect(Collectors.toList());
	}

	/**
	 * 연계현황 총 갯수를 조회한다.
	 */
	@Override
	public int selectCntcSttusListTotCnt(CntcSttusVO cntcSttusVO) throws Exception {
		// 페이징 처리가 필요할 경우 별도 count 쿼리 최적화 고려 가능
		return systemConnectionRepository.findSystemConnectionStats(cntcSttusVO.getSearchKeyword()).size();
	}

	/**
	 * 연계현황을 상세 조회한다.
	 */
	@Override
	public CntcSttus selectCntcSttusDetail(CntcSttus cntcSttus) throws Exception {
		return systemConnectionRepository.findSystemConnectionStats(cntcSttus.getCntcId()).stream()
				.findFirst()
				.map(dto -> {
					CntcSttus res = new CntcSttus();
					res.setCntcId(dto.getCntcId());
					res.setCntcNm(dto.getCntcNm());
					res.setCntcType(dto.getCntcType());
					res.setCntAll(String.valueOf(dto.getCntAll()));
					res.setCntSuccess(String.valueOf(dto.getCntSuccess()));
					res.setCntFail(String.valueOf(dto.getCntFail()));
					res.setProvdInsttId(dto.getProvdInsttId());
					res.setProvdSysId(dto.getProvdSysId());
					res.setProvdSvcId(dto.getProvdSvcId());
					res.setRequstInsttId(dto.getRequstInsttId());
					res.setRequstSysId(dto.getRequstSysId());
					res.setProvdInsttNm(dto.getProvdInsttNm());
					res.setRequstInsttNm(dto.getRequstInsttNm());
					return res;
				}).orElse(null);
	}
}
