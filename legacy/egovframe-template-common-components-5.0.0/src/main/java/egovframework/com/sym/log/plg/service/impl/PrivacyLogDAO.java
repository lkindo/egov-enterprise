package egovframework.com.sym.log.plg.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.log.plg.service.PrivacyLog;

@Repository("privacyLogDAO")
public class PrivacyLogDAO extends EgovComAbstractDAO {

	/**
	 * 媛쒖씤?뺣낫議고쉶 濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	public void insertPrivacyLog(PrivacyLog privacyLog) throws Exception{
		insert("PrivacyLog.insertPrivacyLog", privacyLog);
	}

	/**
	 * 媛쒖씤?뺣낫議고쉶 濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param privacyLog
	 * @return
	 * @throws Exception
	 */
	public List<PrivacyLog> selectPrivacyLogList(PrivacyLog privacyLog) throws Exception{
		return selectList("PrivacyLog.selectPrivacyLogList", privacyLog);
	}
	
	/**
	 * 媛쒖씤?뺣낫議고쉶 濡쒓렇?뺣낫 紐⑸줉???レ옄瑜?議고쉶?쒕떎.
	 * @param privacyLog
	 * @return
	 * @throws Exception
	 */
	public int selectPrivacyLogListCount(PrivacyLog privacyLog) throws Exception{
		return (Integer)selectOne("PrivacyLog.selectPrivacyLogListCount", privacyLog);
	}

	/**
	 * 媛쒖씤?뺣낫議고쉶 濡쒓렇?뺣낫 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param privacyLog
	 * @return privacyLog
	 * @throws Exception
	 */
	public PrivacyLog selectPrivacyLog(PrivacyLog privacyLog) throws Exception{
		return (PrivacyLog) selectOne("PrivacyLog.selectPrivacyLog", privacyLog);
	}

}
