**
 * 媛쒖슂
 * - 濡쒓렇?몄젙梨낆뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 濡쒓렇?몄젙梨낆뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 濡쒓렇?몄젙梨낆쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:54
 *   <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 * 
 *  ?섏젙??              ?섏젙??           ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2009.08.03   ?대Ц以            理쒖큹 ?앹꽦
 *  2021.02.18   ?좎슜??           selectLoginPolicyResult() ??젣
 * </pre>
 */

package egovframework.com.uat.uap.service;

import java.util.List;


public interface EgovLoginPolicyService {
	
	/**
	 * 濡쒓렇?몄젙梨?紐⑸줉??議고쉶?쒕떎.
	 * @param loginPolicyVO - 濡쒓렇?몄젙梨?VO
	 * @return List - 濡쒓렇?몄젙梨?紐⑸줉
	 */
	public List<LoginPolicyVO> selectLoginPolicyList(LoginPolicyVO loginPolicyVO) throws Exception;

	/**
	 * 濡쒓렇?몄젙梨?紐⑸줉 ?섎? 議고쉶?쒕떎.
	 * @param loginPolicyVO - 濡쒓렇?몄젙梨?VO
	 * @return int
	 */
	public int selectLoginPolicyListTotCnt(LoginPolicyVO loginPolicyVO) throws Exception;
	
	/**
	 * 濡쒓렇?몄젙梨?紐⑸줉???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param loginPolicyVO - 濡쒓렇?몄젙梨?VO
	 * @return LoginPolicyVO - 濡쒓렇?몄젙梨?VO
	 */
	public LoginPolicyVO selectLoginPolicy(LoginPolicyVO loginPolicyVO) throws Exception;

	/**
	 * 濡쒓렇?몄젙梨??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param loginPolicy - 濡쒓렇?몄젙梨?model
	 */
	public void insertLoginPolicy(LoginPolicy loginPolicy) throws Exception;

	/**
	 * 湲??깅줉??濡쒓렇?몄젙梨??뺣낫瑜??섏젙?쒕떎.
	 * @param loginPolicy - 濡쒓렇?몄젙梨?model
	 */
	public void updateLoginPolicy(LoginPolicy loginPolicy) throws Exception;

	/**
	 * 湲??깅줉??濡쒓렇?몄젙梨??뺣낫瑜???젣?쒕떎.
	 * @param loginPolicy - 濡쒓렇?몄젙梨?model
	 */
	public void deleteLoginPolicy(LoginPolicy loginPolicy) throws Exception;

	/**
	 * 濡쒓렇?몄젙梨낆뿉 ????꾩옱 諛섏쁺?섏뼱 ?덈뒗 寃곌낵瑜?議고쉶?쒕떎.
	 * @param loginPolicyVO - 濡쒓렇?몄젙梨?VO
	 * @return LoginPolicyVO - 濡쒓렇?몄젙梨?VO
	 */
	/*
	 * public LoginPolicyVO selectLoginPolicyResult(LoginPolicyVO loginPolicyVO)
	 * throws Exception;
	 */
}
