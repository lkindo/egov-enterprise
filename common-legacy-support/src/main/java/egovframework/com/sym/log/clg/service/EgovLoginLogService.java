package egovframework.com.sym.log.clg.service;

import java.util.Map;

/**
 * @Class Name : EgovLoginLogService.java
 * @Description : ????????? ? ?????????
 * @Modification Information
 *
 *               ????????????
 *               ------- ------- -------------------
 *               2009. 3. 11. ???????
 *               2011. 7. 01. ??????? ???sym.log -> sym.log.clg)
 *
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 **/
public interface EgovLoginLogService {

	/**
	 * ?????.
	 *
	 * @param LoginLog
	 **/
	public void logInsertLoginLog(LoginLog loinLog) throws Exception;

	/**
	 * ??????.
	 *
	 * @param loginLog
	 * @return loginLog
	 * @throws Exception
	 **/
	public LoginLog selectLoginLog(LoginLog loginLog) throws Exception;

	/**
	 * ????????.
	 *
	 * @param LoginLog
	 **/
	public Map<String, Object> selectLoginLogInf(LoginLog loinLog) throws Exception;

	/**
	 * ? ?????.
	 *
	 * @throws Exception
	 **/
	public void logInsertLoginLogSummary() throws Exception;

}
