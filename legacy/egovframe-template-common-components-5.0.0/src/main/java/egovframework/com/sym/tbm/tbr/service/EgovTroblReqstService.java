package egovframework.com.sym.tbm.tbr.service;

import java.util.List;

/**
 * 媛쒖슂
 * - ?μ븷?좎껌?뺣낫?????Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?μ븷?좎껌 愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - ?μ븷?좎껌 愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:35
 */
public interface EgovTroblReqstService {

	/**
	 * ?μ븷?붿껌??愿由ы븯湲??꾪빐 ?깅줉???μ븷?붿껌紐⑸줉??議고쉶?쒕떎.
	 * @param troblReqstVO - ?μ븷?좎껌 Vo
	 * @return List - ?μ븷?붿껌 紐⑸줉
	 */
	public List<TroblReqstVO> selectTroblReqstList(TroblReqstVO troblReqstVO) throws Exception;

	/**
	 * ?μ븷?붿껌紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param troblReqstVO - ?μ븷?좎껌 Vo
	 * @return int - ?μ븷?붿껌 移댁슫????
	 */
	public int selectTroblReqstListTotCnt(TroblReqstVO troblReqstVO) throws Exception;
	
	/**
	 * ?깅줉???μ븷?붿껌???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param troblReqstVO - ?μ븷?좎껌 Vo
	 * @return troblReqstVO - ?μ븷?좎껌 Vo
	 */
	public TroblReqstVO selectTroblReqst(TroblReqstVO troblReqstVO) throws Exception;

	/**
	 * ?μ븷?붿껌?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param troblReqst - ?μ븷?좎껌 model
	 * @param troblReqstVO - ?μ븷?좎껌 Vo
	 */
	public TroblReqstVO insertTroblReqst(TroblReqst troblReqst, TroblReqstVO troblReqstVO) throws Exception;

	/**
	 * 湲??깅줉???μ븷?붿껌?뺣낫瑜??섏젙?쒕떎.
	 * @param troblReqst - ?μ븷?좎껌 model
	 */
	public void updateTroblReqst(TroblReqst troblReqst) throws Exception;

	/**
	 * 湲??깅줉???μ븷?붿껌?뺣낫瑜???젣?쒕떎.
	 * @param troblReqst - ?μ븷?좎껌 model
	 */
	public void deleteTroblReqst(TroblReqst troblReqst) throws Exception;

	/**
	 * ?μ븷泥섎━瑜??붿껌?쒕떎.
	 * @param troblReqst - ?μ븷?좎껌 model
	 */
	public void requstTroblReqst(TroblReqst troblReqst) throws Exception;


}