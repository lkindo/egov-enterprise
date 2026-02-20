package egovframework.com.sym.log.tlg.service;

import java.util.Map;

/**
 * @Class Name : EgovTrsmrcvLogService.java
 * @Description : ?≪닔??濡쒓렇 愿由щ? ?꾪븳 ?쒕퉬???명꽣?섏씠??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.   ?댁궪??        理쒖큹?앹꽦
 *    2011. 7. 01.   ?닿린??        ?⑦궎吏 遺꾨━(sym.log -> sym.log.tlg)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
public interface EgovTrsmrcvLogService {

	/**
	 * ?≪닔?좊줈洹??뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param TrsmrcvLog
	 */
	public void logInsertTrsmrcvLog(TrsmrcvLog trsmrcvLog) throws Exception;

	/**
	 * ?≪닔??濡쒓렇?뺣낫瑜??붿빟?쒕떎.
	 *
	 * @param
	 */
	public void logInsertTrsmrcvLogSummary() throws Exception;


	/**
	 * ?≪닔?좊줈洹몃? 議고쉶?쒕떎.
	 *
	 * @param trsmrcvLog
	 * @return trsmrcvLog
	 * @throws Exception
	 */
	public TrsmrcvLog selectTrsmrcvLog(TrsmrcvLog trsmrcvLog) throws Exception;

	/**
     * ?≪닔??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
     *
     * @param TrsmrcvLog
     */
    public Map<String, Object> selectTrsmrcvLogInf(TrsmrcvLog trsmrcvLog) throws Exception;

}
