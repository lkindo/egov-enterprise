package egovframework.com.sym.log.tlg.service;

import java.util.Map;

/**
 * @Class Name : EgovTrsmrcvLogService.java
 * @Description : ????????? ? ?????????
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
public interface EgovTrsmrcvLogService {

	/**
	 * ???????????.
	 *
	 * @param TrsmrcvLog
	 **/
	public void logInsertTrsmrcvLog(TrsmrcvLog trsmrcvLog) throws Exception;

	/**
	 * ???????????.
	 *
	 * @param
	 **/
	public void logInsertTrsmrcvLogSummary() throws Exception;


	/**
	 * ???? ???.
	 *
	 * @param trsmrcvLog
	 * @return trsmrcvLog
	 * @throws Exception
	 **/
	public TrsmrcvLog selectTrsmrcvLog(TrsmrcvLog trsmrcvLog) throws Exception;

	/**
     * ?????? ?????.
     *
     * @param TrsmrcvLog
     **/
    public Map<String, Object> selectTrsmrcvLogInf(TrsmrcvLog trsmrcvLog) throws Exception;

}
