package egovframework.com.sym.log.tlg.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;

/**
 * @Class Name : EgovTrsmrcvLogScheduling.java
 * @Description : ?????????? ??????????
 * @Modification Information
 *
 *    ????        ????        ????
 *    -------        -------     -------------------
 *    2009. 3. 11.   ????        ???
 *    2011. 7. 01.   ????        ??? ???sym.log -> sym.log.tlg)
 *
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 **/
@Service("egovTrsmrcvLogScheduling")
public class EgovTrsmrcvLogScheduling extends EgovAbstractServiceImpl {

	@Resource(name="EgovTrsmrcvLogService")
	private EgovTrsmrcvLogService trsmrcvLogService;

	/**
	 * ???????????.
	 * ???????? ????? 6?? ???????.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 **/
	public void trsmrcvLogSummary() throws Exception {
		trsmrcvLogService.logInsertTrsmrcvLogSummary();
	}

}
