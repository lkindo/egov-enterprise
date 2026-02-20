package egovframework.com.sts.ust.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sts.com.StatsVO;

/**
 * ?ъ슜???듦퀎 寃??DAO ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??    ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.03.19  諛뺤???         理쒖큹 ?앹꽦
 *  2011.06.30  ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.sst)
 *
 *  </pre>
 */
@Repository("userStatsDAO")
public class UserStatsDAO extends EgovComAbstractDAO {

	/**
	 * ?ъ슜???듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    public List<StatsVO> selectUserStats(StatsVO vo) throws Exception {
        return selectList("UserStatsDAO.selectUserStats", vo);
    }

    /**
	 * ?ъ슜???듦퀎瑜??꾪븳 吏묎퀎瑜??섎（?⑥쐞濡??묒뾽?섎뒗 諛곗튂 ?꾨줈洹몃옩
	 * @exception Exception
	 */
    public void summaryUserStats() throws Exception {
        insert("UserStatsDAO.summaryUserStats", null);
    }
}
