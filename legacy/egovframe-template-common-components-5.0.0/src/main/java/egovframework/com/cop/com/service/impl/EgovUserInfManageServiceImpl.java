package egovframework.com.cop.com.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cop.com.service.EgovUserInfManageService;
import egovframework.com.cop.com.service.UserInfVO;
import jakarta.annotation.Resource;

/**
 * ?묒뾽?먯꽌 ?ъ슜???ъ슜??議고쉶 ?쒕퉬??湲곕뒫 援ы쁽 ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.4.6  ?댁궪??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("EgovUserInfManageService")
public class EgovUserInfManageServiceImpl extends EgovAbstractServiceImpl implements EgovUserInfManageService {

	@Resource(name = "EgovUserInfManageDAO")
	private EgovUserInfManageDAO userInfDAO;

	/**
	 * ?숉샇???댁쁺??紐⑸줉??議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cop.com.service.EgovUserInfManageService#selectClubOprtrList(egovframework.com.cop.com.service.UserInfVO)
	 */
	@Override
	public Map<String, Object> selectClubOprtrList(UserInfVO userVO) throws Exception {
		List<UserInfVO> result = userInfDAO.selectClubOprtrList(userVO);
		int cnt = userInfDAO.selectClubOprtrListCnt(userVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?숉샇???ъ슜??紐⑸줉??議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cop.com.service.EgovUserInfManageService#selectClubUserList(egovframework.com.cop.com.service.UserInfVO)
	 */
	@Override
	public Map<String, Object> selectClubUserList(UserInfVO userVO) throws Exception {
		List<UserInfVO> result = userInfDAO.selectClubUserList(userVO);
		int cnt = userInfDAO.selectClubUserListCnt(userVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * 而ㅻ??덊떚 愿由ъ옄 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cop.com.service.EgovUserInfManageService#selectCmmntyMngrList(egovframework.com.cop.com.service.UserInfVO)
	 */
	@Override
	public Map<String, Object> selectCmmntyMngrList(UserInfVO userVO) throws Exception {
		List<UserInfVO> result = userInfDAO.selectCmmntyMngrList(userVO);
		int cnt = userInfDAO.selectCmmntyMngrListCnt(userVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * 而ㅻ??덊떚 ?ъ슜??紐⑸줉??議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cop.com.service.EgovUserInfManageService#selectCmmntyUserList(egovframework.com.cop.com.service.UserInfVO)
	 */
	@Override
	public Map<String, Object> selectCmmntyUserList(UserInfVO userVO) throws Exception {
		List<UserInfVO> result = userInfDAO.selectCmmntyUserList(userVO);
		int cnt = userInfDAO.selectCmmntyUserListCnt(userVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?ъ슜???뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cop.com.service.EgovUserInfManageService#selectUserList(egovframework.com.cop.com.service.UserInfVO)
	 */
	@Override
	public Map<String, Object> selectUserList(UserInfVO userVO) throws Exception {
		List<UserInfVO> result = userInfDAO.selectUserList(userVO);
		int cnt = userInfDAO.selectUserListCnt(userVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?숉샇?뚯뿉 ???紐⑤뱺 ?ъ슜??紐⑸줉??議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cop.com.service.EgovUserInfManageService#selectAllClubUser(egovframework.com.cop.com.service.UserInfVO)
	 */
	@Override
	public List<UserInfVO> selectAllClubUser(UserInfVO userVO) throws Exception {
		return userInfDAO.selectAllClubUser(userVO);
	}

	/**
	 * 而ㅻ??덊떚?????紐⑤뱺 ?ъ슜??紐⑸줉??議고쉶?쒕떎.
	 *
	 * @see egovframework.com.cop.com.service.EgovUserInfManageService#selectAllCmmntyUser(egovframework.com.cop.com.service.UserInfVO)
	 */
	@Override
	public List<UserInfVO> selectAllCmmntyUser(UserInfVO userVO) throws Exception {
		return userInfDAO.selectAllCmmntyUser(userVO);
	}
}
