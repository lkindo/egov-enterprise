package egovframework.com.sym.log.ulg.service;

import java.util.Map;

/**
 * ?ъ슜濡쒓렇 愿由щ? ?꾪븳 ?쒕퉬???명꽣?섏씠??
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009.03.11
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11  ?댁궪??         理쒖큹 ?앹꽦
 *   2011.07.01  ?닿린??         ?⑦궎吏 遺꾨━(sym.log -> sym.log.ulg)
 *   2025.07.14  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
public interface EgovUserLogService {

	/**
	 * ?ъ슜??濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param
	 */
	public void logInsertUserLog() throws Exception;

	/**
	 * ?ъ슜?먮줈洹??곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param userLog
	 * @return userLog
	 * @throws Exception
	 */
	public UserLog selectUserLog(UserLog userLog) throws Exception;

	/**
	 * ?ъ슜??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param UserLog
	 */
	public Map<String, Object> selectUserLogInf(UserLog userLog) throws Exception;

}
