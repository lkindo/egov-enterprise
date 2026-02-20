package egovframework.com.sym.log.wlg.service;

import java.util.Map;

/**
 * @Class Name : EgovWebLogService.java
 * @Description : ?밸줈洹?愿由щ? ?꾪븳 ?쒕퉬???명꽣?섏씠??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.   ?댁궪??        理쒖큹?앹꽦
 *    2011. 7. 01.   ?닿린??        ?⑦궎吏 遺꾨━(sym.log -> sym.log.wlg)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */

public interface EgovWebLogService {

	/**
	 * ??濡쒓렇瑜?湲곕줉?쒕떎.
	 *
	 * @param WebLog
	 */
	public void logInsertWebLog(WebLog webLog) throws Exception;

	/**
	 * ??濡쒓렇?뺣낫瑜??붿빟?쒕떎.
	 *
	 * @param
	 */
	public void logInsertWebLogSummary() throws Exception;

	/**
	 * ?밸줈洹??곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param webLog
	 * @return webLog
	 * @throws Exception
	 */
	public WebLog selectWebLog(WebLog webLog) throws Exception;

	/**
	 * ??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param WebLog
	 */
	public Map<String, Object> selectWebLogInf(WebLog webLog) throws Exception;

}
