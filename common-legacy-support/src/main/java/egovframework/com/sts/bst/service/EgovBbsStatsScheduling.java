package egovframework.com.sts.bst.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import org.springframework.context.annotation.Lazy;

/**
 * ????????? ?????????
 * 
 * @author ???????? ???
 * @since 2009.04.16
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------
 *  2009.04.16  ???         ????
 *  2011.06.30  ????         ??? ???sts -> sts.bst)
 *
 *      </pre>
 **/

@Service("egovBbsStatsScheduling")
public class EgovBbsStatsScheduling extends EgovAbstractServiceImpl {

	/** EgovBbsStatsService **/
	@Lazy
	@Resource(name = "egovBbsStatsService")
	private EgovBbsStatsService bbsStatsService;

	/**
	 * ??????? ?????????? ?????
	 * 
	 * @exception Exception
	 **/
	public void summaryBbsStats() throws Exception {
		bbsStatsService.summaryBbsStats();
	}
}
