package egovframework.com.sym.log.lgm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.log.lgm.service.SysLog;

/**
* @Class Name : SysLogDAO.java
* @Description : 濡쒓렇愿由??쒖뒪??瑜??꾪븳 ?곗씠???묎렐 ?대옒??
* @Modification Information
*
*    ?섏젙??        ?섏젙??        ?섏젙?댁슜
*    -------        -------     -------------------
*    2009. 3. 11.   ?댁궪??        理쒖큹?앹꽦
*    2011. 7. 01.   ?닿린??        ?⑦궎吏 遺꾨━(sym.log -> sym.log.lgm)
*
* @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
* @since 2009. 3. 11.
* @version
* @see
*
*/
@Repository("SysLogDAO")
public class SysLogDAO extends EgovComAbstractDAO{

	/**
	 * ?쒖뒪??濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param SysLog
	 * @return
	 * @throws Exception
	 */
	public void logInsertSysLog(SysLog sysLog) {
		insert("SysLog.logInsertSysLog", sysLog);
		
	}

	/**
	 * ?쒖뒪??濡쒓렇?뺣낫瑜??붿빟?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	public void logInsertSysLogSummary() {
		insert("SysLog.logInsertSysLogSummary", null);
		delete("SysLog.logDeleteSysLogSummary", null);
		
	}

	/**
	 * ?쒖뒪??濡쒓렇紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param sysLog
	 * @return sysLog
	 * @throws Exception
	 */
	public List<SysLog> selectSysLogInf(SysLog sysLog) {
		return selectList("SysLog.selectSysLogInf", sysLog);
	}

	/**
	 * ?쒖뒪??濡쒓렇?뺣낫 紐⑸줉???レ옄瑜?議고쉶?쒕떎.
	 * @param sysLog
	 * @return
	 * @throws Exception
	 */
	public int selectSysLogInfCnt(SysLog sysLog) {
		return (Integer)selectOne("SysLog.selectSysLogInfCnt", sysLog);
	}

	/**
	 * ?쒖뒪??濡쒓렇 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param sysLog
	 * @return sysLog
	 * @throws Exception
	 */
	public SysLog selectSysLog(SysLog sysLog) {
		return (SysLog) selectOne("SysLog.selectSysLog", sysLog);
	}
}
