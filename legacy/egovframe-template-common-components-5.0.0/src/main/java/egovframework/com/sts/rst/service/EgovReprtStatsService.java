**
 * 媛쒖슂
 * - 蹂닿퀬?쒗넻怨꾩뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 蹂닿퀬?쒗넻怨꾩뿉 ????깅줉, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 蹂닿퀬?쒗넻怨꾩쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:09:15
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.8.3   lee.m.j          理쒖큹 ?앹꽦 *  
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 *  </pre>
 */

package egovframework.com.sts.rst.service;

import java.util.List;


public interface EgovReprtStatsService {
	
	/**
	 * 蹂닿퀬???듦퀎?뺣낫????곷ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return List - 蹂닿퀬?쒗넻怨?紐⑸줉
	 */
	public List<ReprtStatsVO> selectReprtStatsList(ReprtStatsVO reprtVO) throws Exception;

	/**
	 * 蹂닿퀬?쒗넻怨꾨ぉ濡??섏씠吏?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return int
	 */
	public int selectReprtStatsListTotCnt(ReprtStatsVO reprtVO) throws Exception;

    /**
	 * 蹂닿퀬?쒗넻怨꾨ぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return int
	 */
	public int selectReprtStatsListBarTotCnt(ReprtStatsVO reprtStatsVO) throws Exception;

	/**
	 * 蹂닿퀬???듦퀎?뺣낫???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return ReprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 */
	public List<ReprtStatsVO> selectReprtStats(ReprtStatsVO reprtVO) throws Exception;

	/**
	 * 蹂닿퀬???듦퀎?뺣낫瑜??앹꽦??????ν븳??
	 * @param reprtStats - 蹂닿퀬?쒗넻怨?model
	 */
	public void insertReprtStats(ReprtStats reprt) throws Exception;

	/**
	 * ?깅줉?쇱옄蹂??듦퀎?뺣낫瑜?洹몃옒?꾨줈 ?쒗쁽?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return List - 蹂닿퀬?쒗넻怨?紐⑸줉
	 */
	public List<ReprtStatsVO> selectReprtStatsBarList(ReprtStatsVO reprtStatsVO) throws Exception;	
	
	/**
	 * 蹂닿퀬?쒖쑀?뺣퀎 ?듦퀎?뺣낫瑜?洹몃옒?꾨줈 ?쒗쁽?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return List - 蹂닿퀬?쒗넻怨?紐⑸줉
	 */
	public List<ReprtStatsVO> selectReprtStatsByReprtTyList(ReprtStatsVO reprtStatsVO) throws Exception;
	
	/**
	 * 吏꾪뻾?곹깭蹂??듦퀎?뺣낫瑜?洹몃옒?꾨줈 ?쒗쁽?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return List - 蹂닿퀬?쒗넻怨?紐⑸줉
	 */
	public List<ReprtStatsVO> selectReprtStatsByReprtSttusList(ReprtStatsVO reprtStatsVO) throws Exception;	
}
