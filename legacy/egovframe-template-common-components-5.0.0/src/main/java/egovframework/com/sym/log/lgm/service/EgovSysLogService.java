package egovframework.com.sym.log.lgm.service;

import java.util.Map;

/**
 * @Class Name : EgovSysLogService.java
 * @Description : 濡쒓렇愿由??쒖뒪??瑜??꾪븳 ?쒕퉬???명꽣?섏씠??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------      -------     -------------------
 *    2009. 3. 11.  ?댁궪??     理쒖큹?앹꽦
 *    2011. 7. 01.  ?닿린??     ?⑦궎吏 遺꾨━(sym.log -> sym.log.lgm)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */

public interface EgovSysLogService {
	
	/**
	 * ?쒖뒪??濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param SysLog
	 */
	public void logInsertSysLog(SysLog sysLog) throws Exception;

	/**
	 * ?쒖뒪??濡쒓렇?뺣낫瑜??붿빟?쒕떎.
	 *
	 * @param
	 */
	public void logInsertSysLogSummary() throws Exception;
	
	/**
	 * ?쒖뒪??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param SysLog
	 */
	public Map<String, Object> selectSysLogInf(SysLog sysLog) throws Exception;

	/**
	 * ?쒖뒪?쒕줈洹??곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param sysLog
	 * @return sysLog
	 * @throws Exception
	 */
	public SysLog selectSysLog(SysLog sysLog) throws Exception;

}
