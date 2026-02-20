package egovframework.com.sym.log.plg.service;

import java.util.Map;

/**
 * @Class Name : EgovPrivacyLogService.java
 * @Description : ?? ????????? ? ?????
 * @Modification Information
 *
 *    ????        ????        ????
 *    -------        -------     -------------------
 *    2014.09.11	???????	???
* @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 **/
public interface EgovPrivacyLogService {
	
	/**
	 * ?? ??????????.
	 *
	 * @param privacyLog
	 **/
	public void innerInsertPrivacyLog(PrivacyLog privacyLog) throws Exception;
	
	/**
	 * ?? ???? ?????.
	 *
	 * @param privacyLog
	 **/
	public Map<String, Object> selectPrivacyLogList(PrivacyLog privacyLog) throws Exception;
	
	/**
	 * ?? ???????????.
	 *
	 * @param privacyLog
	 * @return privacyLog
	 * @throws Exception
	 **/
	public PrivacyLog selectPrivacyLog(PrivacyLog privacyLog) throws Exception;
}
