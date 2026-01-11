package egovframework.com.cmm.service.impl;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.company.project.domain.code.CommonCode;
import com.company.project.domain.code.CommonCodeRepository;
import com.company.project.domain.group.GroupManageRepository;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import jakarta.annotation.Resource;

/**
 * 공통코드등 전체 업무에서 공용해서 사용해야 하는 서비스를 정의하기위한 서비스 구현 클래스
 * 
 * @author 공통 서비스 개발팀 이삼섭
 * @since 2009.03.11
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 개정이력(Modification Information) ==
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.03.11  이삼섭          최초 생성
 *   2024.10.29  이백행          @Override 표기
 *   2025.07.16  이백행          2025년 컨트리뷰션 `throws Exception` 제거
 *   2026.01.11  Antigravity     JPA 전환 (MyBatis CmmUseDAO 제거)
 *
 *      </pre>
 */
@Service("EgovCmmUseService")
public class EgovCmmUseServiceImpl extends EgovAbstractServiceImpl implements EgovCmmUseService {

	@Resource(name = "commonCodeRepository")
	private CommonCodeRepository commonCodeRepository;

	@Resource(name = "groupManageRepository")
	private GroupManageRepository groupManageRepository;

	// @Resource(name = "organizationManageRepository")
	// private OrganizationManageRepository organizationManageRepository;

	/**
	 * 공통코드를 조회한다.
	 *
	 * @param comDefaultCodeVO
	 * @return
	 */
	@Override
	public List<CmmnDetailCode> selectCmmCodeDetail(ComDefaultCodeVO comDefaultCodeVO) {
		return commonCodeRepository.findByCodeGroupIdAndUseAt(comDefaultCodeVO.getCodeId(), "Y").stream()
				.map(this::toCmmnDetailCode)
				.collect(Collectors.toList());
	}

	/**
	 * ComDefaultCodeVO의 리스트를 받아서 여러개의 코드 리스트를 맵에 담아서 리턴한다.
	 *
	 * @param comDefaultCodeVOs
	 * @return
	 */
	@Override
	public Map<String, List<CmmnDetailCode>> selectCmmCodeDetails(List<ComDefaultCodeVO> comDefaultCodeVOs) {
		Map<String, List<CmmnDetailCode>> map = new HashMap<>();
		for (ComDefaultCodeVO comDefaultCodeVO : comDefaultCodeVOs) {
			map.put(comDefaultCodeVO.getCodeId(), selectCmmCodeDetail(comDefaultCodeVO));
		}
		return map;
	}

	/**
	 * 조직정보를 코드형태로 리턴한다.
	 *
	 * @param 조회조건정보 vo
	 * @return 조직정보 List
	 */
	@Override
	public List<CmmnDetailCode> selectOgrnztIdDetail(ComDefaultCodeVO comDefaultCodeVO) {
		// TODO: OrganizationManageRepository 구현 필요
		return Collections.emptyList();
	}

	/**
	 * 그룹정보를 코드형태로 리턴한다.
	 *
	 * @param 조회조건정보 vo
	 * @return 그룹정보 List
	 */
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
