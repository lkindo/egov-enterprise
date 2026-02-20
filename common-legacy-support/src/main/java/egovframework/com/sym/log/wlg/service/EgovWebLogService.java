package egovframework.com.sym.log.wlg.service;

import java.util.Map;

/**
 * @Class Name : EgovWebLogService.java
 * @Description : ????? ? ?????????
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

public interface EgovWebLogService {

	/**
	 * ??????.
	 *
	 * @param WebLog
	 **/
	public void logInsertWebLog(WebLog webLog) throws Exception;

	/**
	 * ?????????.
	 *
	 * @param
	 **/
	public void logInsertWebLogSummary() throws Exception;

	/**
	 * ?????????.
	 *
	 * @param webLog
	 * @return webLog
	 * @throws Exception
	 **/
	public WebLog selectWebLog(WebLog webLog) throws Exception;

	/**
	 * ???? ?????.
	 *
	 * @param WebLog
	 **/
	public Map<String, Object> selectWebLogInf(WebLog webLog) throws Exception;

}
