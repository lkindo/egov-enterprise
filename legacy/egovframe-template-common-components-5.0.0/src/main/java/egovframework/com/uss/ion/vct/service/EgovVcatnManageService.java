package egovframework.com.uss.ion.vct.service;

import java.util.List;

/**
 * 媛쒖슂
 * - ?닿?愿由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?닿?愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?닿?愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public interface EgovVcatnManageService {

	/**
	 * ?닿?愿由??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??濡쒓렇?명솕硫댁씠誘몄? 紐⑸줉??議고쉶?쒕떎.
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return List - ?닿?愿由?紐⑸줉
	 */
	public List<VcatnManageVO> selectVcatnManageList(VcatnManageVO vcatnManageVO) throws Exception;

	/**
	 * ?닿?愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return int - ?닿?愿由?移댁슫????
	 */
	public int selectVcatnManageListTotCnt(VcatnManageVO vcatnManageVO) throws Exception ;
	
	/**
	 * ?깅줉???닿?愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return VcatnManageVO - ?닿?愿由?VO
	 */
	public VcatnManageVO selectVcatnManage(VcatnManageVO vcatnManageVO) throws Exception;

	/**
	 * ?닿?愿由??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param vcatnManage - ?닿?愿由?model
	 */
	public String insertVcatnManage(VcatnManage vcatnManage, VcatnManageVO vcatnManageVO) throws Exception;

	/**
	 * 湲??깅줉???닿?愿由??뺣낫瑜??섏젙?쒕떎.
	 * @param vcatnManage - ?닿?愿由?model
	 */
	public String updtVcatnManage(VcatnManage vcatnManage, VcatnManageVO vcatnManageVO) throws Exception;

	/**
	 * 湲??깅줉???닿?愿由??뺣낫瑜???젣?쒕떎.
	 * @param vcatnManage - ?닿?愿由?model
	 */
	public void deleteVcatnManage(VcatnManage vcatnManage) throws Exception;

    /**
	 * ?닿??쇱옄 以묐났?щ? 泥댄겕
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return int
	 * @exception Exception
	 */
	public int selectVcatnManageDplctAt(VcatnManageVO vcatnManageVO) throws Exception;

		
	/*** ?뱀씤泥섎━愿??***/
	/**
	 * ?닿?愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???닿?愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return List - ?닿?愿由?紐⑸줉
	 */
	public List<VcatnManageVO> selectVcatnManageConfmList(VcatnManageVO vcatnManageVO) throws Exception;

	/**
	 * ?닿?愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???닿?愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return int - ?닿?愿由?移댁슫????
	 */
	public int selectVcatnManageConfmListTotCnt(VcatnManageVO vcatnManageVO) throws Exception ;

	/**
	 * ?좎껌???닿?瑜??뱀씤泥섎━?쒕떎.
	 * @param vcatnManage - ?닿?愿由?model
	 */
	public void updtVcatnManageConfm(VcatnManage vcatnManage) throws Exception;
	
	
    /*** ?곗감愿??***/	
	/**
	 * 媛쒖씤蹂??곗감愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return VcatnManageVO - ?닿?愿由?VO
	 */
	public VcatnManageVO selectIndvdlYrycManage(String sUsid) throws Exception;

	/**
	 * ?좎껌???닿?瑜??뱀씤泥섎━?쒕떎.
	 * @param vcatnManage - ?닿?愿由?model
	 */
	public void updtIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception;

}
