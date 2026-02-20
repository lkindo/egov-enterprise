package egovframework.com.sym.log.ulg.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;

/**
 * @Class Name : EgovUserLogScheduling.java
 * @Description : ???? ???? ??????????
 * @Modification Information
 *
 *    ????        ????       ????
 *    -------        -------     -------------------
 *    2009. 3. 11.   ????       ???
 *    2011. 7. 01.   ????       ??? ???sym.log -> sym.log.ulg)
 *
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 **/
@Service("egovUserLogScheduling")
public class EgovUserLogScheduling extends EgovAbstractServiceImpl {

	@Resource(name="EgovUserLogService")
	private EgovUserLogService userLogService;

	/**
	 * ?????????????.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 **/
	public void userLogInsert() throws Exception {
		userLogService.logInsertUserLog();
	}

}
