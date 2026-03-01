package egovframework.com.uss.ion.ctn.service;

import java.util.List;

/**
 * 媛쒖슂
 * - 寃쎌“愿由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 寃쎌“愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 寃쎌“愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public interface EgovCtsnnManageService {

	/**
	 * 寃쎌“愿由??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉??議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return List - 寃쎌“愿由?紐⑸줉
	 */
	public List<CtsnnManageVO> selectCtsnnManageList(CtsnnManageVO ctsnnManageVO) throws Exception;

	/**
	 * 寃쎌“愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return int - 寃쎌“愿由?移댁슫????
	 */
	public int selectCtsnnManageListTotCnt(CtsnnManageVO ctsnnManageVO) throws Exception ;
	
	/**
	 * ?깅줉??寃쎌“愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return CtsnnManageVO - 寃쎌“愿由?VO
	 */
	public CtsnnManageVO selectCtsnnManage(CtsnnManageVO ctsnnManageVO) throws Exception;

	/**
	 * 寃쎌“愿由??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	public void insertCtsnnManage(CtsnnManage ctsnnManage) throws Exception;

	/**
	 * 湲??깅줉??寃쎌“愿由??뺣낫瑜??섏젙?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	public void updtCtsnnManage(CtsnnManage ctsnnManage) throws Exception;

	/**
	 * 湲??깅줉??寃쎌“愿由??뺣낫瑜???젣?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	public void deleteCtsnnManage(CtsnnManage ctsnnManage) throws Exception;

    /*** ?뱀씤泥섎━愿??***/
	/**
	 * 寃쎌“愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌??寃쎌“愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return List - 寃쎌“愿由?紐⑸줉
	 */
	public List<CtsnnManageVO> selectCtsnnManageConfmList(CtsnnManageVO ctsnnManageVO) throws Exception;

	/**
	 * 寃쎌“愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌??寃쎌“愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return int - 寃쎌“愿由?移댁슫????
	 */
	public int selectCtsnnManageConfmListTotCnt(CtsnnManageVO ctsnnManageVO) throws Exception ;
	
	/**
	 * 寃쎌“?뺣낫瑜??뱀씤泥섎━ ?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	public void updtCtsnnManageConfm(CtsnnManage ctsnnManage) throws Exception;
}
