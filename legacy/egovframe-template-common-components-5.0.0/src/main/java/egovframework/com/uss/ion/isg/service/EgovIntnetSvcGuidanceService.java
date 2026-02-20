/**
 * 媛쒖슂
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡?????Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:03
 */

package egovframework.com.uss.ion.isg.service;

import java.util.List;

public interface EgovIntnetSvcGuidanceService {
	
	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???명꽣?룹꽌鍮꾩뒪?덈궡 紐⑸줉??議고쉶?쒕떎.
	 * @param intnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return List - ?명꽣?룹꽌鍮꾩뒪?덈궡 紐⑸줉
	 */
	public List<IntnetSvcGuidanceVO> selectIntnetSvcGuidanceList(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception;

	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param mainImageVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return int
	 */
	public int selectIntnetSvcGuidanceListTotCnt(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception;
	
	/**
	 * ?깅줉???명꽣?룹꽌鍮꾩뒪?덈궡???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param intnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return IntnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 */
	public IntnetSvcGuidanceVO selectIntnetSvcGuidance(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception;

	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param intnetSvcGuidance - ?명꽣?룹꽌鍮꾩뒪?덈궡 model
	 */
	public IntnetSvcGuidanceVO insertIntnetSvcGuidance(IntnetSvcGuidance intnetSvcGuidance, IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception;

	/**
	 * 湲??깅줉???명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜??섏젙?쒕떎.
	 * @param intnetSvcGuidance - ?명꽣?룹꽌鍮꾩뒪?덈궡 model
	 */
	public void updateIntnetSvcGuidance(IntnetSvcGuidance intnetSvcGuidance) throws Exception;

	/**
	 * 湲??깅줉???명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜???젣?쒕떎.
	 * @param intnetSvcGuidance - ?명꽣?룹꽌鍮꾩뒪?덈궡 model
	 */
	public void deleteIntnetSvcGuidance(IntnetSvcGuidance intnetSvcGuidance) throws Exception;
	
	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫 ?곸슜寃곌낵瑜?議고쉶?쒕떎.
	 * @param intnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return List - ?명꽣?룹꽌鍮꾩뒪?덈궡 紐⑸줉
	 */
	public List<IntnetSvcGuidanceVO> selectIntnetSvcGuidanceResult(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception;
	
}
