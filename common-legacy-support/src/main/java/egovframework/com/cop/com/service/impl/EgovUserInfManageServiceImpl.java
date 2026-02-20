package egovframework.com.cop.com.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cop.com.service.EgovUserInfManageService;
import egovframework.com.cop.com.service.UserInfVO;
import com.company.project.domain.user.repository.UserInfRepository;
import com.company.project.domain.user.vo.UserInfSearchResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import jakarta.annotation.Resource;

/**
 * ??? ??????????????????? ?????
 * 
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.4.6  ????         ????
 *
 *      </pre>
 **/
@Service("EgovUserInfManageService")
public class EgovUserInfManageServiceImpl extends EgovAbstractServiceImpl implements EgovUserInfManageService {

	@Resource(name = "userInfRepositoryImpl")
	private UserInfRepository userInfRepository;

	/**
	 * ?????????????. (??????)
	 **/
	@Override
	public Map<String, Object> selectClubOprtrList(UserInfVO userVO) throws Exception {
		return Map.of("resultList", List.of(), "resultCnt", "0");
	}

	/**
	 * ??????????????. (??????)
	 **/
	@Override
	public Map<String, Object> selectClubUserList(UserInfVO userVO) throws Exception {
		return Map.of("resultList", List.of(), "resultCnt", "0");
	}

	/**
	 * ???? ?? ?????.
	 **/
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
	 * ???? ??????????.
	 **/
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
	 * ?????????????????.
	 **/
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
	 * ????? ???????????????. (??????)
	 **/
	@Override
	public List<UserInfVO> selectAllClubUser(UserInfVO userVO) throws Exception {
		return List.of();
	}

	/**
	 * ?????????????????????.
	 **/
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
