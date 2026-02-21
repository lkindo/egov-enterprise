package egovframework.com.sym.log.wlg.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;

/**
 * @Class Name : EgovWebLogScheduling.java
 * @Description : ?????? ??????????
 * @Modification Information
 *
 *    ????        ????        ????
 *    -------        -------     -------------------
 *    2009. 3. 11.   ????        ???
 *    2011. 7. 01.   ????        ??? ???sym.log -> sym.log.wlg)
 *
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 **/

@Service("egovWebLogScheduling")
public class EgovWebLogScheduling extends EgovAbstractServiceImpl {

	@Resource(name="EgovWebLogService")
	private EgovWebLogService webLogService;

	/**
	 * ?????????.
	 * ???????? ????? 6?? ???????.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 **/
	public void webLogSummary() throws Exception {
		webLogService.logInsertWebLogSummary();
	}

}
