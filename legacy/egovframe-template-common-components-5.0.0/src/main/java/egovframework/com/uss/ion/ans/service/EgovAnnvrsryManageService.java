package egovframework.com.uss.ion.ans.service;

import java.io.InputStream;
import java.util.List;

/**
 * 媛쒖슂
 * - 湲곕뀗?쇨?由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 湲곕뀗?쇨?由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 湲곕뀗?쇨?由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public interface EgovAnnvrsryManageService {

	/**
	 * 湲곕뀗?쇨?由??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉??湲곕뀗?쇨?由?紐⑸줉??議고쉶?쒕떎.
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return List - 湲곕뀗?쇨?由?紐⑸줉
	 */
	public List<AnnvrsryManageVO> selectAnnvrsryManageList(AnnvrsryManageVO annvrsryManageVO) throws Exception;

	/**
	 * 湲곕뀗?쇨?由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return int - 湲곕뀗?쇨?由?移댁슫????
	 */
	public int selectAnnvrsryManageListTotCnt(AnnvrsryManageVO annvrsryManageVO) throws Exception ;
	
	/**
	 * ?깅줉??湲곕뀗?쇨?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return AnnvrsryManageVO - 湲곕뀗?쇨?由?VO
	 */
	public AnnvrsryManageVO selectAnnvrsryManage(AnnvrsryManageVO annvrsryManageVO) throws Exception;

	/**
	 * 湲곕뀗?쇨?由??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 */
	public void insertAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception;

	/**
	 * 湲??깅줉??湲곕뀗?쇨?由??뺣낫瑜??섏젙?쒕떎.
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 */
	public void updateAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception;

	/**
	 * 湲??깅줉??湲곕뀗?쇨?由??뺣낫瑜???젣?쒕떎.
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 */
	public void deleteAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception;

	/**
	 * ?깅줉??湲곕뀗?쇨?由ъ쓽 ?뚮┝ ?붾㈃??議고쉶?쒕떎.
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO 
	 * @return AnnvrsryManageVO - 湲곕뀗?쇨?由?VO
	 */
	public List<AnnvrsryManageVO> selectAnnvrsryGdcc(AnnvrsryManageVO annvrsryManageVO) throws Exception;

    /**
	 * 湲곕뀗?쇨?由??깅줉??以묐났?щ?瑜?議고쉶?쒕떎.
	 * @param annvrsryManage - 湲곕뀗?쇨?由?VO
	 * @return int
	 * @exception Exception
	 */
	public int selectAnnvrsryManageDplctAt(AnnvrsryManage annvrsryManage) throws Exception ;

	/**
	 * 湲곕뀗?쇱젙蹂?excel?앹꽦
	 * @param  inputStream InputStream
	 * @return  String
	 * @exception Exception
	 */
	public List<AnnvrsryManageVO> selectAnnvrsryManageBnde(InputStream inputStream)throws Exception;
	
	/**
	 * 湲곕뀗?쇱젙蹂대? ?쇨큵?깅줉泥섎━?쒕떎.
	 * @param annvrsryManageVO     - 湲곕뀗?쇨?由?VO
	 * @param String           - 湲곕뀗?쇱젙蹂?
    */
	public void insertAnnvrsryManageBnde(AnnvrsryManageVO annvrsryManageVO, 
			                             String checkedAnnvrsryManageForInsert) throws Exception;	
}
