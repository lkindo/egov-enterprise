/**
 * 媛쒖슂
 * - ?ъ슜?먮??ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ъ슜?먮??ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?ъ슜?먮??ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?대Ц以
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:09:36
 */

package egovframework.com.uss.ion.uas.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.uas.service.EgovUserAbsnceService;
import egovframework.com.uss.ion.uas.service.UserAbsnce;
import egovframework.com.uss.ion.uas.service.UserAbsnceVO;
import jakarta.annotation.Resource;

@Service("egovUserAbsnceService")
public class EgovUserAbsnceServiceImpl extends EgovAbstractServiceImpl implements EgovUserAbsnceService {

	@Resource(name="userAbsnceDAO")
	private UserAbsnceDAO userAbsnceDAO;

	/**
	 * ?ъ슜?먮??ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???ъ슜?먮???紐⑸줉??議고쉶?쒕떎.
	 * @param userAbsnceVO - ?ъ슜?먮???VO
	 * @return List - ?ъ슜?먮???紐⑸줉
	 */
	@Override
	public List<UserAbsnceVO> selectUserAbsnceList(UserAbsnceVO userAbsnceVO) throws Exception {
		return userAbsnceDAO.selectUserAbsnceList(userAbsnceVO);
	}

	/**
	 * ?ъ슜?먮??ъ젙蹂대ぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param userAbsnceVO - ?ъ슜?먮???VO
	 * @return int - ?ъ슜?먮???移댁슫????
	 */
	@Override
	public int selectUserAbsnceListTotCnt(UserAbsnceVO userAbsnceVO) throws Exception {
		return userAbsnceDAO.selectUserAbsnceListTotCnt(userAbsnceVO);
	}

	/**
	 * ?깅줉???ъ슜?먮????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param userAbsnceVO - ?ъ슜?먮???VO
	 * @return UserAbsnceVO - ?ъ슜?먮???VO
	 */
	@Override
	public UserAbsnceVO selectUserAbsnce(UserAbsnceVO userAbsnceVO) throws Exception {
		return userAbsnceDAO.selectUserAbsnce(userAbsnceVO);
	}

	/**
	 * ?ъ슜?먮??ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param userAbsnce - ?ъ슜?먮???model
	 * @return UserAbsnceVO - ?ъ슜?먮???VO
	 */
	@Override
	public UserAbsnceVO insertUserAbsnce(UserAbsnce userAbsnce, UserAbsnceVO userAbsnceVO) throws Exception {
		userAbsnceDAO.insertUserAbsnce(userAbsnce);
		userAbsnceVO.setUserId(userAbsnce.getUserId());
		return selectUserAbsnce(userAbsnceVO);
	}

	/**
	 * 湲??깅줉???ъ슜?먮??ъ젙蹂대? ?섏젙?쒕떎.
	 * @param userAbsnce - ?ъ슜?먮???model
	 */
	@Override
	public void updateUserAbsnce(UserAbsnce userAbsnce) throws Exception {
		userAbsnceDAO.updateUserAbsnce(userAbsnce);
	}

	/**
	 * 湲??깅줉???ъ슜?먮??ъ젙蹂대? ??젣?쒕떎.
	 * @param userAbsnce - ?ъ슜?먮???model
	 */
	@Override
	public void deleteUserAbsnce(UserAbsnce userAbsnce) throws Exception {
		userAbsnceDAO.deleteUserAbsnce(userAbsnce);
	}

	/**
	 * ?ъ슜?먮??ъ젙蹂닿? ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param userAbsnceVO - ?ъ슜?먮???VO
	 * @return UserAbsnceVO - ?ъ슜?먮???VO
	 */
	@Override
	public UserAbsnceVO selectUserAbsnceResult(UserAbsnceVO userAbsnceVO) throws Exception {
		return null;
	}
}
