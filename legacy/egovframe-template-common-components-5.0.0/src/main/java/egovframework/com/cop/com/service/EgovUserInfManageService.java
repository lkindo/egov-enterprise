package egovframework.com.cop.com.service;

import java.util.List;
import java.util.Map;

/**
 * ?묒뾽 湲곕뒫?먯꽌 ?ъ슜???뺣낫瑜?愿由ы븯湲??꾪븳 ?쒕퉬???명꽣?섏씠???대옒??
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
public interface EgovUserInfManageService {

	/**
	 * ?ъ슜???뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param userVO
	 * @return
	 * @throws Exception
	 */
	public Map<String, Object> selectUserList(UserInfVO userVO) throws Exception;

	/**
	 * 而ㅻ??덊떚 ?ъ슜??紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param userVO
	 * @return
	 * @throws Exception
	 */
	public Map<String, Object> selectCmmntyUserList(UserInfVO userVO) throws Exception;

	/**
	 * 而ㅻ??덊떚 愿由ъ옄 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param userVO
	 * @return
	 * @throws Exception
	 */
	public Map<String, Object> selectCmmntyMngrList(UserInfVO userVO) throws Exception;

	/**
	 * ?숉샇???ъ슜??紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param userVO
	 * @return
	 * @throws Exception
	 */
	public Map<String, Object> selectClubUserList(UserInfVO userVO) throws Exception;

	/**
	 * ?숉샇???댁쁺??紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param userVO
	 * @return
	 * @throws Exception
	 */
	public Map<String, Object> selectClubOprtrList(UserInfVO userVO) throws Exception;

	/**
	 * ?숉샇?뚯뿉 ???紐⑤뱺 ?ъ슜??紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param userVO
	 * @return
	 * @throws Exception
	 */
	public List<UserInfVO> selectAllClubUser(UserInfVO userVO) throws Exception;

	/**
	 * 而ㅻ??덊떚?????紐⑤뱺 ?ъ슜??紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param userVO
	 * @return
	 * @throws Exception
	 */
	public List<UserInfVO> selectAllCmmntyUser(UserInfVO userVO) throws Exception;
}
