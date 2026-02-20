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
 * ?? ?? ??????? ? ?????
 * 
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.1
 **/
@Service("CntcSttusService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovCntcSttusServiceImpl extends EgovAbstractServiceImpl implements EgovCntcSttusService {

	private final SystemConnectionRepository systemConnectionRepository;

	/**
	 * ?? ????? (QueryDSL ???.
	 **/
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
	 * ?? ????????.
	 **/
	@Override
	public int selectCntcSttusListTotCnt(CntcSttusVO cntcSttusVO) throws Exception {
		// ????? ??????count ???????????
		return systemConnectionRepository.findSystemConnectionStats(cntcSttusVO.getSearchKeyword()).size();
	}

	/**
	 * ????? ???.
	 **/
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
