package egovframework.com.sym.log.clg.service;

import java.util.Map;


/**
 * @Class Name : EgovLoginLogService.java
 * @Description : ?쒖뒪??濡쒓렇 愿由щ? ?꾪븳 ?쒕퉬???명꽣?섏씠??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------      -------     -------------------
 *    2009. 3. 11. ?댁궪??       理쒖큹?앹꽦
 *    2011. 7. 01. ?닿린??       ?⑦궎吏 遺꾨━(sym.log -> sym.log.clg)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
public interface EgovLoginLogService {

	/**
	 * ?묒냽濡쒓렇瑜?湲곕줉?쒕떎.
	 *
	 * @param LoginLog
	 */
	public void logInsertLoginLog(LoginLog loinLog) throws Exception;

	/**
	 * ?묒냽濡쒓렇瑜?議고쉶?쒕떎.
	 *
	 * @param loginLog
	 * @return loginLog
	 * @throws Exception
	 */
	public LoginLog selectLoginLog(LoginLog loginLog) throws Exception;

	/**
	 * ?묒냽濡쒓렇 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param LoginLog
	 */
	public Map<String, Object> selectLoginLogInf(LoginLog loinLog) throws Exception;

}
