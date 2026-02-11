package egovframework.com.cop.com.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cop.com.service.EgovUserInfManageService;
import egovframework.com.cop.com.service.UserInfVO;
import com.company.project.domain.user.UserInfRepository;
import com.company.project.domain.user.UserInfSearchResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import jakarta.annotation.Resource;

/**
 * 협업에서 사용할 사용자 조회 서비스 기능 구현 클래스
 * 
 * @author 공통서비스개발팀 이삼섭
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.4.6  이삼섭          최초 생성
 *
 *      </pre>
 */
@Service("EgovUserInfManageService")
public class EgovUserInfManageServiceImpl extends EgovAbstractServiceImpl implements EgovUserInfManageService {

	@Resource(name = "userInfRepositoryImpl")
	private UserInfRepository userInfRepository;

	/**
	 * 동호회 운영자 목록을 조회한다. (사용 안함)
	 */
	@Override
	public Map<String, Object> selectClubOprtrList(UserInfVO userVO) throws Exception {
		return Map.of("resultList", List.of(), "resultCnt", "0");
	}

	/**
	 * 동호회 사용자 목록을 조회한다. (사용 안함)
	 */
	@Override
	public Map<String, Object> selectClubUserList(UserInfVO userVO) throws Exception {
		return Map.of("resultList", List.of(), "resultCnt", "0");
	}

	/**
	 * 커뮤니티 관리자 목록을 조회한다.
	 */
	@Override
	public Map<String, Object> selectCmmntyMngrList(UserInfVO userVO) throws Exception {
		Pageable pageable = PageRequest.of(userVO.getPageIndex() - 1, userVO.getPageUnit());
		Page<UserInfSearchResult> page = userInfRepository.selectCmmntyMngrList(userVO.getTrgetId(),
				userVO.getSearchCnd(),
				userVO.getSearchWrd(), pageable);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", mapToVOList(page.getContent()));
		map.put("resultCnt", Long.toString(page.getTotalElements()));

		return map;
	}

	/**
	 * 커뮤니티 사용자 목록을 조회한다.
	 */
	@Override
	public Map<String, Object> selectCmmntyUserList(UserInfVO userVO) throws Exception {
		Pageable pageable = PageRequest.of(userVO.getPageIndex() - 1, userVO.getPageUnit());
		Page<UserInfSearchResult> page = userInfRepository.selectCmmntyUserList(userVO.getTrgetId(),
				userVO.getSearchCnd(),
				userVO.getSearchWrd(), pageable);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", mapToVOList(page.getContent()));
		map.put("resultCnt", Long.toString(page.getTotalElements()));

		return map;
	}

	/**
	 * 사용자 정보에 대한 목록을 조회한다.
	 */
	@Override
	public Map<String, Object> selectUserList(UserInfVO userVO) throws Exception {
		Pageable pageable = PageRequest.of(userVO.getPageIndex() - 1, userVO.getPageUnit());
		Page<UserInfSearchResult> page = userInfRepository.selectUserList(userVO.getSearchCnd(), userVO.getSearchWrd(),
				pageable);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", mapToVOList(page.getContent()));
		map.put("resultCnt", Long.toString(page.getTotalElements()));

		return map;
	}

	/**
	 * 동호회에 대한 모든 사용자 목록을 조회한다. (사용 안함)
	 */
	@Override
	public List<UserInfVO> selectAllClubUser(UserInfVO userVO) throws Exception {
		return List.of();
	}

	/**
	 * 커뮤니티에 대한 모든 사용자 목록을 조회한다.
	 */
	@Override
	public List<UserInfVO> selectAllCmmntyUser(UserInfVO userVO) throws Exception {
		return mapToVOList(userInfRepository.selectAllCmmntyUser(userVO.getTrgetId()));
	}

	private List<UserInfVO> mapToVOList(List<UserInfSearchResult> results) {
		return results.stream().map(this::mapToVO).toList();
	}

	private UserInfVO mapToVO(UserInfSearchResult result) {
		UserInfVO vo = new UserInfVO();
		vo.setUniqId(result.getUniqId());
		vo.setUserId(result.getUserId());
		vo.setUserNm(result.getUserNm());
		vo.setUserZip(result.getUserZip());
		vo.setUserAdres(result.getUserAdres());
		vo.setUserEmail(result.getUserEmail());
		vo.setUseAt(result.getUseAt() != null ? result.getUseAt() : "Y");
		vo.setTrgetId(result.getTrgetId());
		return vo;
	}
}
