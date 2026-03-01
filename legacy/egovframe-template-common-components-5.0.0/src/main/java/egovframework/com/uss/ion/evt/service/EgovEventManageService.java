package egovframework.com.uss.ion.evt.service;

import java.util.List;

/**
 * 媛쒖슂
 * - ?됱궗愿由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?됱궗愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?됱궗愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public interface EgovEventManageService {

	/**
	 * ?됱궗愿由??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???됱궗紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗愿由?紐⑸줉
	 */
	public List<EventManageVO> selectEventManageList(EventManageVO eventManageVO) throws Exception;

	/**
	 * ?됱궗愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int - ?됱궗愿由?移댁슫????
	 */
	public int selectEventManageListTotCnt(EventManageVO eventManageVO) throws Exception ;
	
	/**
	 * ?깅줉???됱궗愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return EventManageVO - ?됱궗愿由?VO
	 */
	public EventManageVO selectEventManage(EventManageVO eventManageVO) throws Exception;

	/**
	 * ?됱궗愿由??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void insertEventManage(EventManage eventManage) throws Exception;

	/**
	 * 湲??깅줉???됱궗愿由??뺣낫瑜??섏젙?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void updtEventManage(EventManage eventManage) throws Exception;

	/**
	 * 湲??깅줉???됱궗愿由??뺣낫瑜???젣?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void deleteEventManage(EventManage eventManage) throws Exception;

	

	/***  ?됱궗?묒닔愿由? ****/	
	
	/**
	 * ?됱궗?묒닔?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???됱궗愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗?묒닔愿由?紐⑸줉
	 */
	public List<EventManageVO> selectEventAtdrnList(EventManageVO eventManageVO) throws Exception;

	/**
	 * ?됱궗愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int - ?됱궗?묒닔愿由?移댁슫????
	 */
	public int selectEventAtdrnListTotCnt(EventManageVO eventManageVO) throws Exception ;

	/**
	 * ?됱궗?묒닔?뱀씤/諛섎젮 泥섎━瑜??꾪빐 ?깅줉???됱궗?묒닔 紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗?묒닔?뱀씤 紐⑸줉
	 */
	public List<EventManageVO> selectEventRceptConfmList(EventManageVO eventManageVO) throws Exception;

	/**
	 * ?됱궗?묒닔?뱀씤/諛섎젮 泥섎━瑜??꾪빐 ?깅줉???됱궗?묒닔 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int - ?됱궗?묒닔?뱀씤 移댁슫????
	 */
	public int selectEventRceptConfmListTotCnt(EventManageVO eventManageVO) throws Exception ;
	
	/**
	 * ?됱궗?쇱옄, ?됱궗援щ텇 議곌굔???곕Ⅸ ?됱궗紐?紐⑸줉??議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗紐?紐⑸줉
	 */
	public List<EventManageVO> selectEventNmList(EventManageVO eventManageVO) throws Exception;
	
	/**
	 * ?깅줉???됱궗愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return EventManageVO - ?됱궗愿由?VO
	 */
	public EventManageVO selectEventAtdrn(EventManageVO eventManageVO) throws Exception;

	/**
	 * ?됱궗愿由??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void insertEventAtdrn(EventAtdrn eventAtdrn) throws Exception;

	/**
	 * 湲??깅줉???됱궗愿由??뺣낫瑜???젣?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void deleteEventAtdrn(EventAtdrn eventAtdrn) throws Exception;

	/**
	 * 湲??깅줉???됱궗愿由??뺣낫瑜??뱀씤/諛섎젮泥섎━?쒕떎.
	 * @param eventManage - ?됱궗愿由?model
	 */
	public void updtEventAtdrn(EventAtdrn eventAtdrn, String checkedEventRceptForConfm) throws Exception;

	/**
	 * ?됱궗?묒닔???뺣낫瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return List - ?됱궗愿由?紐⑸줉
	 */
	public List<EventManageVO> selectEventReqstAtdrnList(EventManageVO eventManageVO) throws Exception;

	/**
	 * ?됱궗?묒닔??紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param eventManageVO - ?됱궗愿由?VO
	 * @return int - ?됱궗愿由?移댁슫????
	 */
	public int selectEventReqstAtdrnListTotCnt(EventManageVO eventManageVO) throws Exception ;
	
}
