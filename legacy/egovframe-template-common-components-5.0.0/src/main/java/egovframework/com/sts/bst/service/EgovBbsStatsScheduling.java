package egovframework.com.sts.bst.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;


/**
 * 寃뚯떆臾??듦퀎 吏묎퀎瑜??꾪븳 ?ㅼ?以꾨쭅 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.04.16
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.04.16  諛뺤???         理쒖큹 ?앹꽦
 *  2011.06.30  ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.bst)
 *
 *  </pre>
 */

@Service("egovBbsStatsScheduling")
public class EgovBbsStatsScheduling extends EgovAbstractServiceImpl {

	/** EgovBbsStatsService */
	@Resource(name = "bbsStatsService")
    private EgovBbsStatsService bbsStatsService;

	/**
	 * 寃뚯떆臾??듦퀎瑜??꾪븳 吏묎퀎瑜??섎（?⑥쐞濡??묒뾽?섎뒗 諛곗튂 ?꾨줈洹몃옩
	 * @exception Exception
	 */
	public void summaryBbsStats() throws Exception {
		bbsStatsService.summaryBbsStats();
	}
}
