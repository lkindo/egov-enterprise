package egovframework.com.sts.bst.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sts.bst.service.EgovBbsStatsService;
import egovframework.com.sts.com.StatsVO;
import jakarta.annotation.Resource;

/**
 * 寃뚯떆臾??듦퀎 寃??鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
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
@Service("bbsStatsService")
public class EgovBbsStatsServiceImpl extends EgovAbstractServiceImpl implements
	EgovBbsStatsService {

    @Resource(name="bbsStatsDAO")
    private BbsStatsDAO bbsStatsDAO;

    /**
	 * 寃뚯떆臾??앹꽦湲???듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    @Override
	public List<StatsVO> selectBbsCretCntStats(StatsVO vo) throws Exception {
        return bbsStatsDAO.selectBbsCretCntStats(vo);
	}

    /**
	 * 寃뚯떆臾?珥앹“?뚯닔 ?듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    @Override
	public List<StatsVO> selectBbsTotCntStats(StatsVO vo) throws Exception {
        return bbsStatsDAO.selectBbsTotCntStats(vo);
	}

    /**
	 * 寃뚯떆臾??됯퇏議고쉶???듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    @Override
	public List<StatsVO> selectBbsAvgCntStats(StatsVO vo) throws Exception {
        return bbsStatsDAO.selectBbsAvgCntStats(vo);
	}

    /**
	 * 理쒓퀬議고쉶 寃뚯떆臾??듦퀎?뺣낫瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    @Override
	public List<StatsVO> selectBbsMaxCntStats(StatsVO vo) throws Exception {
        return bbsStatsDAO.selectBbsMaxCntStats(vo);
	}

    /**
	 * 理쒖냼議고쉶 寃뚯떆臾??듦퀎?뺣낫瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    @Override
	public List<StatsVO> selectBbsMinCntStats(StatsVO vo) throws Exception {
        return bbsStatsDAO.selectBbsMinCntStats(vo);
	}

    /**
	 * 寃뚯떆臾?理쒓퀬寃뚯떆???듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    @Override
	public List<StatsVO> selectBbsMaxUserStats(StatsVO vo) throws Exception {
        return bbsStatsDAO.selectBbsMaxUserStats(vo);
	}

    /**
	 * 寃뚯떆臾??듦퀎瑜??꾪븳 吏묎퀎瑜??섎（?⑥쐞濡??묒뾽?섎뒗 諛곗튂 ?꾨줈洹몃옩
	 * @exception Exception
	 */
	@Override
	public void summaryBbsStats() throws Exception {
		bbsStatsDAO.summaryBbsStats();
	}
}
