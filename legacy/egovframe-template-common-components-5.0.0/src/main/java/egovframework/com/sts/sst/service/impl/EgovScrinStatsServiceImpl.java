package egovframework.com.sts.sst.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.sst.service.EgovScrinStatsService;
import jakarta.annotation.Resource;

/**
 * ?붾㈃ ?듦퀎 寃??鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
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
 *  2011.06.30  ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.sst)
 *
 *  </pre>
 */
@Service("scrinStatsService")
public class EgovScrinStatsServiceImpl extends EgovAbstractServiceImpl implements
	EgovScrinStatsService {

    @Resource(name="scrinStatsDAO")
    private ScrinStatsDAO scrinStatsDAO;

    /**
	 * ?붾㈃ ?듦퀎瑜?議고쉶?쒕떎
	 * @param vo StatsVO
	 * @return List
	 * @exception Exception
	 */
    @Override
	public List<StatsVO> selectScrinStats(StatsVO vo) throws Exception {
        return scrinStatsDAO.selectScrinStats(vo);
	}
}
