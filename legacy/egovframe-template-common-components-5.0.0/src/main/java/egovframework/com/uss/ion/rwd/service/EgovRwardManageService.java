package egovframework.com.uss.ion.rwd.service;

import java.util.List;

/**
 * 媛쒖슂
 * - ?ъ긽愿由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?ъ긽愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, ?뱀씤泥섎━ 湲곕뒫???쒓났?쒕떎.
 * - ?ъ긽愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */
public interface EgovRwardManageService {

	/**
	 * ?ъ긽愿由??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉??議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return List - ?ъ긽愿由?紐⑸줉
	 */
	public List<RwardManageVO> selectRwardManageList(RwardManageVO rwardManageVO) throws Exception;

	/**
	 * ?ъ긽愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return int - ?ъ긽愿由?移댁슫????
	 */
	public int selectRwardManageListTotCnt(RwardManageVO rwardManageVO) throws Exception ;
	
	/**
	 * ?깅줉???ъ긽愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return RwardManageVO - ?ъ긽愿由?VO
	 */
	public RwardManageVO selectRwardManage(RwardManageVO rwardManageVO) throws Exception;

	/**
	 * ?ъ긽愿由??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	public void insertRwardManage(RwardManage rwardManage) throws Exception;

	/**
	 * 湲??깅줉???ъ긽愿由??뺣낫瑜??섏젙?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	public void updtRwardManage(RwardManage rwardManage) throws Exception;

	/**
	 * 湲??깅줉???ъ긽愿由??뺣낫瑜???젣?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	public void deleteRwardManage(RwardManage rwardManage) throws Exception;

    /*** ?뱀씤泥섎━愿??***/
	/**
	 * ?ъ긽愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???ъ긽愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return List - ?ъ긽愿由?紐⑸줉
	 */
	public List<RwardManageVO> selectRwardManageConfmList(RwardManageVO rwardManageVO) throws Exception;

	/**
	 * ?ъ긽愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???ъ긽愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return int - ?ъ긽愿由?移댁슫????
	 */
	public int selectRwardManageConfmListTotCnt(RwardManageVO rwardManageVO) throws Exception ;
	
	/**
	 * ?ъ긽?뺣낫瑜??뱀씤/諛섎젮泥섎━ ?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	public void updtRwardManageConfm(RwardManage rwardManage) throws Exception;
	
}