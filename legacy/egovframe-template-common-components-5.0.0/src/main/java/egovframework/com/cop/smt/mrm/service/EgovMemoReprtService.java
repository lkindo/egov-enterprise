package egovframework.com.cop.smt.mrm.service;

import java.util.Map;

/**
 * 媛쒖슂
 * - 硫붾え蹂닿퀬?????Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 硫붾え蹂닿퀬??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 硫붾え蹂닿퀬??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 19-7-2010 ?ㅼ쟾 10:14:53
 *  <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovMemoReprtService {
	/**
	 * 蹂닿퀬??紐⑸줉??議고쉶?쒕떎.
	 * @param ReportrVO
	 * @return  Map<String, Object>
	 * 
	 * @param reportrVO
	 */
	public Map<String, Object> selectReportrList(ReportrVO reportrVO) throws Exception;
	
	
	/**
	 * ?ъ슜??吏곸쐞紐낆쓣 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param String
	 * @return  String
	 * 
	 * @param String
	 */
	public String selectWrterClsfNm(String wrterId) throws Exception;
	
	/**
	 * 硫붾え蹂닿퀬 紐⑸줉??議고쉶?쒕떎.
	 * @param MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * @return  List<MemoReprtVO> - 硫붾え蹂닿퀬 List
	 * 
	 * @param memoReprtVO
	 */
	public Map<String, Object> selectMemoReprtList(MemoReprtVO memoReprtVO) throws Exception;

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * @return  MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * 
	 * @param memoReprtVO
	 */
	public MemoReprtVO selectMemoReprt(MemoReprtVO memoReprtVO) throws Exception;

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫??蹂닿퀬??議고쉶?쇱떆瑜??섏젙?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * 
	 * @param memoReprt
	 */
	public void readMemoReprt(MemoReprt memoReprt) throws Exception;

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜??섏젙?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * 
	 * @param memoReprt
	 */
	public void updateMemoReprt(MemoReprt memoReprt) throws Exception;

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫??吏?쒖궗??쓣 ?깅줉?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * 
	 * @param memoReprt
	 */
	public void updateMemoReprtDrctMatter(MemoReprt memoReprt) throws Exception;

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜??깅줉?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * 
	 * @param memoReprt
	 */
	public void insertMemoReprt(MemoReprt memoReprt) throws Exception;

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜???젣?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * 
	 * @param memoReprt
	 */
	public void deleteMemoReprt(MemoReprtVO memoReprtVO) throws Exception;

}