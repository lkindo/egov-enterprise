package egovframework.com.uss.ion.mtg.service;

import java.util.List;

/**
 * 媛쒖슂
 * - ?뚯쓽?ㅺ?由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?뚯쓽?ㅺ?由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?뚯쓽?ㅺ?由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public interface EgovMtgPlaceManageService {

	/**
	 * ?뚯쓽?ㅺ?由??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???뚯쓽??紐⑸줉??議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return List - ?뚯쓽?ㅺ?由?紐⑸줉
	 */
	public List<MtgPlaceManageVO> selectMtgPlaceManageList(MtgPlaceManageVO mtgPlaceManageVO) throws Exception;

	/**
	 * ?뚯쓽?ㅺ?由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return int - ?뚯쓽?ㅺ?由?移댁슫????
	 */
	public int selectMtgPlaceManageListTotCnt(MtgPlaceManageVO mtgPlaceManageVO) throws Exception ;
	
	/**
	 * ?깅줉???뚯쓽?ㅺ?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 */
	public MtgPlaceManage selectMtgPlaceManage(MtgPlaceManageVO mtgPlaceManageVO) throws Exception;

	/**
	 * ?뚯쓽?ㅺ?由??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 */
	public void insertMtgPlaceManage(MtgPlaceManage mtgPlaceManage, MtgPlaceManageVO mtgPlaceManageVO) throws Exception;

	/**
	 * 湲??깅줉???뚯쓽?ㅺ?由??뺣낫瑜??섏젙?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 */
	public void updtMtgPlaceManage(MtgPlaceManage mtgPlaceManage, MtgPlaceManageVO mtgPlaceManageVO) throws Exception;

	/**
	 * 湲??깅줉???뚯쓽?ㅺ?由??뺣낫瑜???젣?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 */
	public void deleteMtgPlaceManage(MtgPlaceManage mtgPlaceManage) throws Exception;

	/**
	 * ?뚯쓽?ㅺ?由ш? ?뱀젙?붾㈃??諛섏쁺??寃곌낵瑜?議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 */
	//
                     List<MtgPlaceManageVO> selectMtgPlaceManageResult(MtgPlaceManageVO mtgPlaceManageVO) throws Exception;

	/******** ?뚯쓽???덉빟 愿由?*************/
	/**
	 * ?뚯쓽???덉빟?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???뚯쓽???덉빟 紐⑸줉??議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return List - ?뚯쓽?ㅺ?由?紐⑸줉
	 */
	public List<MtgPlaceManageVO> selectMtgPlaceResveManageList(MtgPlaceManageVO mtgPlaceManageVO) throws Exception;

	/**
	 * ?뚯쓽?ㅼ삁???좎껌?붾㈃??議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 */
	public MtgPlaceManageVO selectMtgPlaceResve(MtgPlaceManageVO mtgPlaceManageVO) throws Exception;

	/**
	 * ?깅줉???뚯쓽???덉빟 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 */
	public MtgPlaceManageVO selectMtgPlaceResveDetail(MtgPlaceManageVO mtgPlaceManageVO) throws Exception;

	/**
	 * ?뚯쓽???덉빟?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅼ삁??model
	 */
	public void insertMtgPlaceResve(MtgPlaceResve mtgPlaceResve) throws Exception;

	/**
	 * 湲??깅줉???뚯쓽???덉빟?뺣낫瑜??섏젙?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅼ삁??model
	 */
	public void updtMtgPlaceResve(MtgPlaceResve mtgPlaceResve) throws Exception;

	/**
	 * 湲??깅줉???뚯쓽???덉빟?뺣낫瑜???젣?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅼ삁??model
	 */
	public void deleteMtgPlaceResve(MtgPlaceResve mtgPlaceResve) throws Exception;
	
	/**
	 * ?뚯쓽??以묐났?щ? 泥댄겕.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return int - 以묐났嫄댁닔
	 */
	public int mtgPlaceResveDplactCeck(MtgPlaceManageVO mtgPlaceManageVO) throws Exception;
}
