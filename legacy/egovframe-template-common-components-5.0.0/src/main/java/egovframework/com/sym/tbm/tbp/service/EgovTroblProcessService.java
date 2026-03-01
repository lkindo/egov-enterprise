package egovframework.com.sym.tbm.tbp.service;

import java.util.List;

/**
 * 媛쒖슂
 * - ?μ븷泥섎━寃곌낵?뺣낫?????Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?μ븷泥섎━寃곌낵愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - ?μ븷泥섎━寃곌낵愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:35
 */
public interface EgovTroblProcessService {

	/**
	 * ?μ븷泥섎━?뺣낫瑜?愿由ы븯湲??꾪빐 ????μ븷泥섎━紐⑸줉??議고쉶?쒕떎.
	 * @param troblManageVO - ?μ븷泥섎━ Vo
	 * @return List - ?μ븷泥섎━ 紐⑸줉
	 */
	public List<TroblProcessVO> selectTroblProcessList(TroblProcessVO troblProcessVO) throws Exception;

	/**
	 * ?μ븷泥섎━?뺣낫紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param troblManageVO - ?μ븷愿由?Vo
	 * @return List - ?μ븷泥섎━ 紐⑸줉
	 */
	public int selectTroblProcessListTotCnt(TroblProcessVO troblProcessVO) throws Exception;
	
	/**
	 * ?깅줉???μ븷泥섎━???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param troblManageVO - ?μ븷愿由?Vo
	 * @return troblManageVO - ?μ븷愿由?Vo
	 */
	public TroblProcessVO selectTroblProcess(TroblProcessVO troblProcessVO) throws Exception;

	/**
	 * ?μ븷泥섎━?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param troblManage - ?μ븷愿由?model
	 */
	public void insertTroblProcess(TroblProcess troblProcess) throws Exception;

	/**
	 * 湲??깅줉???μ븷泥섎━?뺣낫瑜???젣?쒕떎.
	 * @param troblManage - ?μ븷愿由?model
	 */
	public void deleteTroblProcess(TroblProcess troblProcess) throws Exception;

}
