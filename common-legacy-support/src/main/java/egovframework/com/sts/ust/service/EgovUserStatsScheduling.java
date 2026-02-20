package egovframework.com.sts.ust.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;

/**
 * ???????????? ?????????
 * 
 * @author ???????? ???
 * @since 2009.04.16
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????    ????         ????
 *  -------    --------    ---------------------------
 *  2009.04.16  ???         ????
 *  2011.06.30  ????         ??? ???sts -> sts.sst)
 *
 *      </pre>
 **/

@Service("egovUserStatsScheduling")
public class EgovUserStatsScheduling extends EgovAbstractServiceImpl {

	/** EgovUserStatsService **/
	@Resource(name = "userStatsService")
	private EgovUserStatsService userStatsService;

	/**
	 * ?????????? ?????????? ?????
	 * 
	 * @exception Exception
	 **/
	public void summaryUserStats() throws Exception {
		userStatsService.summaryUserStats();
	}
}
