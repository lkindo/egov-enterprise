package egovframework.com.sym.log.lgm.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;

/**
 * @Class Name : EgovSysLogScheduling.java
 * @Description : ?????????? ??????????
 * @Modification Information
 *
 *    ????      ????        ????
 *    -------        -------     -------------------
 *    2009. 3. 11.     ????  ???
 *
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 **/
@Service("egovSysLogScheduling")
public class EgovSysLogScheduling extends EgovAbstractServiceImpl {

	@Resource(name="EgovSysLogService")
	private EgovSysLogService sysLogService;

	/**
	 * ???????????.
	 * ???????? ????? 6?? ???????.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 **/
	public void sysLogSummary() throws Exception {
		sysLogService.logInsertSysLogSummary();
	}

}
