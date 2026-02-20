package egovframework.com.sts.bst.service;

import java.util.List;

import egovframework.com.sts.com.StatsVO;

/**
 * 寃뚯떆臾??듦퀎 寃??鍮꾩쫰?덉뒪 ?명꽣?섏씠???대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.03.19  諛뺤???         理쒖큹 ?앹꽦
 *  2011.06.30  ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.bst)
 *
 *  </pre>
 */
public interface EgovBbsStatsService {

	/**
	 * 寃뚯떆臾??앹꽦湲???듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
	List<StatsVO> selectBbsCretCntStats(StatsVO vo) throws Exception;

	/**
	 * 寃뚯떆臾?珥앹“?뚯닔 ?듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
	List<StatsVO> selectBbsTotCntStats(StatsVO vo) throws Exception;

	/**
	 * 寃뚯떆臾??됯퇏議고쉶???듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
	List<StatsVO> selectBbsAvgCntStats(StatsVO vo) throws Exception;

	/**
	 * 理쒓퀬議고쉶 寃뚯떆臾??듦퀎?뺣낫瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
	List<StatsVO> selectBbsMaxCntStats(StatsVO vo) throws Exception;

	/**
	 * 理쒖냼議고쉶 寃뚯떆臾??듦퀎?뺣낫瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
	List<StatsVO> selectBbsMinCntStats(StatsVO vo) throws Exception;

	/**
	 * 寃뚯떆臾?理쒓퀬寃뚯떆???듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
	List<StatsVO> selectBbsMaxUserStats(StatsVO vo) throws Exception;

	/**
	 * 寃뚯떆臾??듦퀎瑜??꾪븳 吏묎퀎瑜??섎（?⑥쐞濡??묒뾽?섎뒗 諛곗튂 ?꾨줈洹몃옩
	 * @exception Exception
	 */
	public void summaryBbsStats() throws Exception;
}
