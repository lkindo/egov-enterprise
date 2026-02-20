package egovframework.com.cmm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.company.project.domain.code.CommonCode;
import com.company.project.domain.code.CommonCodeRepository;
import com.company.project.domain.group.GroupManageRepository;
import com.company.project.domain.organization.OrganizationManageRepository;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import jakarta.annotation.Resource;

/**
 * ????? ???? ???? ????? ?? ????? ???? ????? ?????
 * 
 * @author ????????? ????
 * @since 2009.03.11
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.11  ????         ????
 *   2024.10.29  ????         @Override ??
 *   2025.07.16  ????         2025????????`throws Exception` ??
 *   2026.01.11  Antigravity     JPA ? (MyBatis CmmUseDAO ??)
 *
 *      </pre>
 **/
@Service("EgovCmmUseService")
public class EgovCmmUseServiceImpl extends EgovAbstractServiceImpl implements EgovCmmUseService {

	@Resource(name = "commonCodeRepository")
	private CommonCodeRepository commonCodeRepository;

	@Resource(name = "groupManageRepository")
	private GroupManageRepository groupManageRepository;

	@Resource(name = "organizationManageRepository")
	private OrganizationManageRepository organizationManageRepository;

	/**
	 * ???????.
	 *
	 * @param comDefaultCodeVO
	 * @return
	 **/
	@Override
	public List<CmmnDetailCode> selectCmmCodeDetail(ComDefaultCodeVO comDefaultCodeVO) {
		return commonCodeRepository.findByCodeGroupIdAndUseAt(comDefaultCodeVO.getCodeId(), "Y").stream()
				.map(this::toCmmnDetailCode)
				.collect(Collectors.toList());
	}

	/**
	 * ComDefaultCodeVO????? ??????? ????? ????????.
	 *
	 * @param comDefaultCodeVOs
	 * @return
	 **/
	@Override
	public Map<String, List<CmmnDetailCode>> selectCmmCodeDetails(List<ComDefaultCodeVO> comDefaultCodeVOs) {
		Map<String, List<CmmnDetailCode>> map = new HashMap<>();
		for (ComDefaultCodeVO comDefaultCodeVO : comDefaultCodeVOs) {
			map.put(comDefaultCodeVO.getCodeId(), selectCmmCodeDetail(comDefaultCodeVO));
		}
		return map;
	}

	/**
	 * ?????????.
	 *
	 * @param ??? vo
	 * @return ? List
	 **/
	@Override
	public List<CmmnDetailCode> selectOgrnztIdDetail(ComDefaultCodeVO comDefaultCodeVO) {
		return organizationManageRepository.findAll().stream()
				.map(org -> {
					CmmnDetailCode detailCode = new CmmnDetailCode();
					detailCode.setCode(org.getOrgnztId());
					detailCode.setCodeNm(org.getOrgnztNm());
					detailCode.setCodeDc(org.getOrgnztDc());
					return detailCode;
				})
				.collect(Collectors.toList());
	}

	/**
	 * ?????????.
	 *
	 * @param ??? vo
	 * @return ? List
	 **/
	@Override
	public List<CmmnDetailCode> selectGroupIdDetail(ComDefaultCodeVO comDefaultCodeVO) {
		return groupManageRepository.findAll().stream()
				.map(group -> {
					CmmnDetailCode code = new CmmnDetailCode();
					code.setCode(group.getGroupId());
					code.setCodeNm(group.getGroupNm());
					code.setCodeDc(group.getGroupDc());
					return code;
				})
				.collect(Collectors.toList());
	}

	private CmmnDetailCode toCmmnDetailCode(CommonCode commonCode) {
		CmmnDetailCode code = new CmmnDetailCode();
		code.setCodeId(commonCode.getCodeGroupId());
		code.setCode(commonCode.getCode());
		code.setCodeNm(commonCode.getCodeNm());
		code.setCodeDc(commonCode.getCodeDc());
		return code;
	}
}
