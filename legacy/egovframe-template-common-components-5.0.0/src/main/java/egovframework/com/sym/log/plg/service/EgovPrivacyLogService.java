package egovframework.com.sym.log.plg.service;

import java.util.Map;

/**
 * @Class Name : EgovPrivacyLogService.java
 * @Description : 媛쒖씤?뺣낫 議고쉶 ?대젰 愿由щ? ?꾪븳 ?명꽣?섏씠??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2014.09.11	?쒖??꾨젅?꾩썙??	理쒖큹?앹꽦
* @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 */
public interface EgovPrivacyLogService {
	
	/**
	 * 媛쒖씤?뺣낫 議고쉶 濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param privacyLog
	 */
	public void innerInsertPrivacyLog(PrivacyLog privacyLog) throws Exception;
	
	/**
	 * 媛쒖씤?뺣낫 議고쉶 濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param privacyLog
	 */
	public Map<String, Object> selectPrivacyLogList(PrivacyLog privacyLog) throws Exception;
	
	/**
	 * 媛쒖씤?뺣낫 議고쉶 濡쒓렇 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param privacyLog
	 * @return privacyLog
	 * @throws Exception
	 */
	public PrivacyLog selectPrivacyLog(PrivacyLog privacyLog) throws Exception;
}
