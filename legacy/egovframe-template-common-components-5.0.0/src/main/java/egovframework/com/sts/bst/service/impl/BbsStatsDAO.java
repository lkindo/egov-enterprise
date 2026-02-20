package egovframework.com.sts.bst.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sts.com.StatsVO;

/**
 * 寃뚯떆臾??듦퀎 寃??DAO ?대옒??
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
 *  2018.05.02  ?좎슜??         summaryBbsStats() ?섏젙
 *                        寃뚯떆?먯쑀?뺣퀎 肄붾뱶遺꾨쪟 蹂寃?(COM004 => COM101)
 *                        寃뚯떆?먯냽?깅퀎(COM009) 肄붾뱶遺꾨쪟 ?ъ슜?섏? ?딆쓬
 *
 *  </pre>
 */
@Repository("bbsStatsDAO")
public class BbsStatsDAO extends EgovComAbstractDAO {

	/**
	 * 寃뚯떆臾??앹꽦湲???듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    public List<StatsVO> selectBbsCretCntStats(StatsVO vo) throws Exception {
        return selectList("BbsStatsDAO.selectBbsCretCntStats", vo);
    }

    /**
	 * 寃뚯떆臾?珥앹“?뚯닔 ?듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    public List<StatsVO> selectBbsTotCntStats(StatsVO vo) throws Exception {
        return selectList("BbsStatsDAO.selectBbsTotCntStats", vo);
    }

    /**
	 * 寃뚯떆臾??됯퇏議고쉶???듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    public List<StatsVO> selectBbsAvgCntStats(StatsVO vo) throws Exception {
        return selectList("BbsStatsDAO.selectBbsAvgCntStats", vo);
    }

    /**
	 * 理쒓퀬議고쉶 寃뚯떆臾??듦퀎?뺣낫瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    public List<StatsVO> selectBbsMaxCntStats(StatsVO vo) throws Exception {
        return selectList("BbsStatsDAO.selectBbsMaxCntStats", vo);
    }

    /**
	 * 理쒖냼議고쉶 寃뚯떆臾??듦퀎?뺣낫瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    public List<StatsVO> selectBbsMinCntStats(StatsVO vo) throws Exception {
        return selectList("BbsStatsDAO.selectBbsMinCntStats", vo);
    }

    /**
	 * 寃뚯떆臾?理쒓퀬寃뚯떆???듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    public List<StatsVO> selectBbsMaxUserStats(StatsVO vo) throws Exception {
        return selectList("BbsStatsDAO.selectBbsMaxUserStats", vo);
    }

    /**
	 * 寃뚯떆臾??듦퀎瑜??꾪븳 吏묎퀎瑜??섎（?⑥쐞濡??묒뾽?섎뒗 諛곗튂 ?꾨줈洹몃옩
	 * @exception Exception
	 */
    public void summaryBbsStats() throws Exception {

    	StatsVO parVO = new StatsVO();

    	StatsVO sumVO = null;
    	StatsVO resultVO = null;

    	// 寃뚯떆???좏삎蹂?
    	// 1. ?듯빀寃뚯떆??
    	sumVO = new StatsVO();
    	sumVO.setStatsKind("COM101");
    	sumVO.setDetailStatsKind("BBST01");
    	parVO.setStatsKind("COM101");
    	parVO.setDetailStatsKind("BBST01");
    	// 1-0. 吏묎퀎 ?щ? 議고쉶
    	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsSummary", parVO);
    	if (resultVO == null || resultVO.getStatsKind() == null || "".equals(resultVO.getStatsKind())) {
    		// 1-1. ?앹꽦湲??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsCreatCo", parVO);
            if (resultVO != null) {
				sumVO.setCreatCo(resultVO.getCreatCo());
			} else {
				sumVO.setCreatCo(0);
			}
            // 1-2. 珥앹“?뚯닔
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTotInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setTotInqireCo(resultVO.getTotInqireCo());
			} else {
				sumVO.setTotInqireCo(0);
			}
            // 1-3. ?됯퇏議고쉶??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsAvrgInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setAvrgInqireCo(resultVO.getAvrgInqireCo());
			} else {
				sumVO.setAvrgInqireCo(0);
			}
            // 1-4. 理쒓퀬議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMxmmInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMxmmInqireBbsId() != null) {
				sumVO.setMxmmInqireBbsId(resultVO.getMxmmInqireBbsId());
			} else {
				sumVO.setMxmmInqireBbsId("");
			}
            // 1-5. 理쒖냼議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMummInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMummInqireBbsId() != null) {
				sumVO.setMummInqireBbsId(resultVO.getMummInqireBbsId());
			} else {
				sumVO.setMummInqireBbsId("");
			}
            // 1-6. 理쒓퀬寃뚯떆?륤D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTopNtcepersonId", parVO);
        	if (resultVO != null && resultVO.getTopNtcepersonId() != null) {
				sumVO.setTopNtcepersonId(resultVO.getTopNtcepersonId());
			} else {
				sumVO.setTopNtcepersonId("");
			}

        	// 1-7. 吏묎퀎 ?깅줉
        	insert("BbsStatsDAO.summaryBbsStats", sumVO);
    	}

    	// 2. 釉붾줈洹멸쾶?쒗뙋
    	sumVO = new StatsVO();
    	sumVO.setStatsKind("COM101");
    	sumVO.setDetailStatsKind("BBST02");
    	parVO.setStatsKind("COM101");
    	parVO.setDetailStatsKind("BBST02");
    	// 2-0. 吏묎퀎 ?щ? 議고쉶
    	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsSummary", parVO);
    	if (resultVO == null || resultVO.getStatsKind() == null || "".equals(resultVO.getStatsKind())) {
    		// 2-1. ?앹꽦湲??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsCreatCo", parVO);
            if (resultVO != null) {
				sumVO.setCreatCo(resultVO.getCreatCo());
			} else {
				sumVO.setCreatCo(0);
			}
            // 2-2. 珥앹“?뚯닔
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTotInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setTotInqireCo(resultVO.getTotInqireCo());
			} else {
				sumVO.setTotInqireCo(0);
			}
            // 2-3. ?됯퇏議고쉶??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsAvrgInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setAvrgInqireCo(resultVO.getAvrgInqireCo());
			} else {
				sumVO.setAvrgInqireCo(0);
			}
            // 2-4. 理쒓퀬議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMxmmInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMxmmInqireBbsId() != null) {
				sumVO.setMxmmInqireBbsId(resultVO.getMxmmInqireBbsId());
			} else {
				sumVO.setMxmmInqireBbsId("");
			}
            // 2-5. 理쒖냼議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMummInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMummInqireBbsId() != null) {
				sumVO.setMummInqireBbsId(resultVO.getMummInqireBbsId());
			} else {
				sumVO.setMummInqireBbsId("");
			}
            // 2-6. 理쒓퀬寃뚯떆?륤D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTopNtcepersonId", parVO);
        	if (resultVO != null && resultVO.getTopNtcepersonId() != null) {
				sumVO.setTopNtcepersonId(resultVO.getTopNtcepersonId());
			} else {
				sumVO.setTopNtcepersonId("");
			}

        	// 2-7. 吏묎퀎 ?깅줉
        	insert("BbsStatsDAO.summaryBbsStats", sumVO);
    	}

    	// 3. 諛⑸챸濡?
    	sumVO = new StatsVO();
    	sumVO.setStatsKind("COM101");
    	sumVO.setDetailStatsKind("BBST03");
    	parVO.setStatsKind("COM101");
    	parVO.setDetailStatsKind("BBST03");
    	// 3-0. 吏묎퀎 ?щ? 議고쉶
    	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsSummary", parVO);
    	if (resultVO == null || resultVO.getStatsKind() == null || "".equals(resultVO.getStatsKind())) {
    		// 3-1. ?앹꽦湲??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsCreatCo", parVO);
            if (resultVO != null) {
				sumVO.setCreatCo(resultVO.getCreatCo());
			} else {
				sumVO.setCreatCo(0);
			}
            // 3-2. 珥앹“?뚯닔
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTotInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setTotInqireCo(resultVO.getTotInqireCo());
			} else {
				sumVO.setTotInqireCo(0);
			}
            // 3-3. ?됯퇏議고쉶??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsAvrgInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setAvrgInqireCo(resultVO.getAvrgInqireCo());
			} else {
				sumVO.setAvrgInqireCo(0);
			}
            // 3-4. 理쒓퀬議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMxmmInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMxmmInqireBbsId() != null) {
				sumVO.setMxmmInqireBbsId(resultVO.getMxmmInqireBbsId());
			} else {
				sumVO.setMxmmInqireBbsId("");
			}
            // 3-5. 理쒖냼議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMummInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMummInqireBbsId() != null) {
				sumVO.setMummInqireBbsId(resultVO.getMummInqireBbsId());
			} else {
				sumVO.setMummInqireBbsId("");
			}
            // 3-6. 理쒓퀬寃뚯떆?륤D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTopNtcepersonId", parVO);
        	if (resultVO != null && resultVO.getTopNtcepersonId() != null) {
				sumVO.setTopNtcepersonId(resultVO.getTopNtcepersonId());
			} else {
				sumVO.setTopNtcepersonId("");
			}

        	// 3-7. 吏묎퀎 ?깅줉
        	insert("BbsStatsDAO.summaryBbsStats", sumVO);
    	}


    	// 寃뚯떆???쒗뵆由용퀎
    	// 1. 寃뚯떆??
    	sumVO = new StatsVO();
    	sumVO.setStatsKind("COM005");
    	sumVO.setDetailStatsKind("TMPT01");
    	parVO.setStatsKind("COM005");
    	parVO.setDetailStatsKind("TMPT01");
    	// 1-0. 吏묎퀎 ?щ? 議고쉶
    	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsSummary", parVO);
    	if (resultVO == null || resultVO.getStatsKind() == null || "".equals(resultVO.getStatsKind())) {
    		// 1-1. ?앹꽦湲??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsCreatCo", parVO);
            if (resultVO != null) {
				sumVO.setCreatCo(resultVO.getCreatCo());
			} else {
				sumVO.setCreatCo(0);
			}
            // 1-2. 珥앹“?뚯닔
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTotInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setTotInqireCo(resultVO.getTotInqireCo());
			} else {
				sumVO.setTotInqireCo(0);
			}
            // 1-3. ?됯퇏議고쉶??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsAvrgInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setAvrgInqireCo(resultVO.getAvrgInqireCo());
			} else {
				sumVO.setAvrgInqireCo(0);
			}
            // 1-4. 理쒓퀬議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMxmmInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMxmmInqireBbsId() != null) {
				sumVO.setMxmmInqireBbsId(resultVO.getMxmmInqireBbsId());
			} else {
				sumVO.setMxmmInqireBbsId("");
			}
            // 1-5. 理쒖냼議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMummInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMummInqireBbsId() != null) {
				sumVO.setMummInqireBbsId(resultVO.getMummInqireBbsId());
			} else {
				sumVO.setMummInqireBbsId("");
			}
            // 1-6. 理쒓퀬寃뚯떆?륤D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTopNtcepersonId", parVO);
        	if (resultVO != null && resultVO.getTopNtcepersonId() != null) {
				sumVO.setTopNtcepersonId(resultVO.getTopNtcepersonId());
			} else {
				sumVO.setTopNtcepersonId("");
			}

        	// 1-7. 吏묎퀎 ?깅줉
        	insert("BbsStatsDAO.summaryBbsStats", sumVO);
    	}

    	// 2. 而ㅻ??덊떚
    	sumVO = new StatsVO();
    	sumVO.setStatsKind("COM005");
    	sumVO.setDetailStatsKind("TMPT02");
    	parVO.setStatsKind("COM005");
    	parVO.setDetailStatsKind("TMPT02");
    	// 2-0. 吏묎퀎 ?щ? 議고쉶
    	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsSummary", parVO);
    	if (resultVO == null || resultVO.getStatsKind() == null || "".equals(resultVO.getStatsKind())) {
    		// 2-1. ?앹꽦湲??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsCreatCo", parVO);
            if (resultVO != null) {
				sumVO.setCreatCo(resultVO.getCreatCo());
			} else {
				sumVO.setCreatCo(0);
			}
            // 2-2. 珥앹“?뚯닔
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTotInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setTotInqireCo(resultVO.getTotInqireCo());
			} else {
				sumVO.setTotInqireCo(0);
			}
            // 2-3. ?됯퇏議고쉶??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsAvrgInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setAvrgInqireCo(resultVO.getAvrgInqireCo());
			} else {
				sumVO.setAvrgInqireCo(0);
			}
            // 2-4. 理쒓퀬議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMxmmInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMxmmInqireBbsId() != null) {
				sumVO.setMxmmInqireBbsId(resultVO.getMxmmInqireBbsId());
			} else {
				sumVO.setMxmmInqireBbsId("");
			}
            // 2-5. 理쒖냼議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMummInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMummInqireBbsId() != null) {
				sumVO.setMummInqireBbsId(resultVO.getMummInqireBbsId());
			} else {
				sumVO.setMummInqireBbsId("");
			}
            // 2-6. 理쒓퀬寃뚯떆?륤D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTopNtcepersonId", parVO);
        	if (resultVO != null && resultVO.getTopNtcepersonId() != null) {
				sumVO.setTopNtcepersonId(resultVO.getTopNtcepersonId());
			} else {
				sumVO.setTopNtcepersonId("");
			}

        	// 2-7. 吏묎퀎 ?깅줉
        	insert("BbsStatsDAO.summaryBbsStats", sumVO);
    	}

    	// 3. ?숉샇??
    	sumVO = new StatsVO();
    	sumVO.setStatsKind("COM005");
    	sumVO.setDetailStatsKind("TMPT03");
    	parVO.setStatsKind("COM005");
    	parVO.setDetailStatsKind("TMPT03");
    	// 3-0. 吏묎퀎 ?щ? 議고쉶
    	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsSummary", parVO);
    	if (resultVO == null || resultVO.getStatsKind() == null || "".equals(resultVO.getStatsKind())) {
    		// 3-1. ?앹꽦湲??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsCreatCo", parVO);
            if (resultVO != null) {
				sumVO.setCreatCo(resultVO.getCreatCo());
			} else {
				sumVO.setCreatCo(0);
			}
            // 3-2. 珥앹“?뚯닔
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTotInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setTotInqireCo(resultVO.getTotInqireCo());
			} else {
				sumVO.setTotInqireCo(0);
			}
            // 3-3. ?됯퇏議고쉶??
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsAvrgInqireCo", parVO);
        	if (resultVO != null) {
				sumVO.setAvrgInqireCo(resultVO.getAvrgInqireCo());
			} else {
				sumVO.setAvrgInqireCo(0);
			}
            // 3-4. 理쒓퀬議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMxmmInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMxmmInqireBbsId() != null) {
				sumVO.setMxmmInqireBbsId(resultVO.getMxmmInqireBbsId());
			} else {
				sumVO.setMxmmInqireBbsId("");
			}
            // 3-5. 理쒖냼議고쉶寃뚯떆臾퍲D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsMummInqireBbsId", parVO);
        	if (resultVO != null && resultVO.getMummInqireBbsId() != null) {
				sumVO.setMummInqireBbsId(resultVO.getMummInqireBbsId());
			} else {
				sumVO.setMummInqireBbsId("");
			}
            // 3-6. 理쒓퀬寃뚯떆?륤D
        	resultVO = (StatsVO)selectOne("BbsStatsDAO.selectBbsTopNtcepersonId", parVO);
        	if (resultVO != null && resultVO.getTopNtcepersonId() != null) {
				sumVO.setTopNtcepersonId(resultVO.getTopNtcepersonId());
			} else {
				sumVO.setTopNtcepersonId("");
			}

        	// 3-7. 吏묎퀎 ?깅줉
        	insert("BbsStatsDAO.summaryBbsStats", sumVO);
    	}
    }
}
