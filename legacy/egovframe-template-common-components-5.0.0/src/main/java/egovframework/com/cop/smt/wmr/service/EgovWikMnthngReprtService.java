package egovframework.com.cop.smt.wmr.service;

import java.util.Map;


/**
 * 媛쒖슂
 * - 二쇨컙?붽컙蹂닿퀬?????Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 二쇨컙?붽컙蹂닿퀬??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 二쇨컙?붽컙蹂닿퀬??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 19-7-2010 ?ㅼ쟾 10:12:47
 *   <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovWikMnthngReprtService {
	
	/**
	 * 蹂닿퀬??紐⑸줉??議고쉶?쒕떎.
	 * @param ReportrVO
	 * @return  Map<String, Object>
	 * 
	 * @param reportrVO
	 */
	public Map<String, Object> selectReportrList(ReportrVO reportrVO) throws Exception;
	
	/**
	 * ?ъ슜??吏곸쐞紐??뺣낫瑜?議고쉶?쒕떎.
	 * @param String
	 * @return  String
	 * 
	 * @param String
	 */
	public String selectWrterClsfNm(String wrterId) throws Exception;
	
	/**
	 * 二쇨컙?붽컙蹂닿퀬 紐⑸줉??議고쉶?쒕떎.
	 * @param WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * @return  Map<String, Object> - 二쇨컙?붽컙蹂닿퀬 List
	 * 
	 * @param wikMnthngReprtVO
	 */
	public Map<String, Object> selectWikMnthngReprtList(WikMnthngReprtVO wikMnthngReprtVO) throws Exception;

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * @return  WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * 
	 * @param wikMnthngReprtVO
	 */
	public WikMnthngReprtVO selectWikMnthngReprt(WikMnthngReprtVO wikMnthngReprtVO) throws Exception;

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??섏젙?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * 
	 * @param wikMnthngReprt
	 */
	public void updateWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception;

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??깅줉?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * 
	 * @param wikMnthngReprt
	 */
	public void insertWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception;

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??뱀씤?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * 
	 * @param wikMnthngReprt
	 */
	public void confirmWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception;

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜???젣?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * 
	 * @param wikMnthngReprt
	 */
	public void deleteWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception;

}
