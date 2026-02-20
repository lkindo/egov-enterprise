package egovframework.com.sts.cst.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sts.com.StatsVO;

/**
 * ?묒냽 ?듦퀎 寃??DAO ?대옒??
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
 *  2011.06.30  ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.cst)
 *
 *  </pre>
 */
@Repository("conectStatsDAO")
public class ConectStatsDAO extends EgovComAbstractDAO {

	/**
	 * ?묒냽 ?듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    public List<StatsVO> selectConectStats(StatsVO vo) throws Exception {
        return selectList("ConectStatsDAO.selectConectStats", vo);
    }
}
