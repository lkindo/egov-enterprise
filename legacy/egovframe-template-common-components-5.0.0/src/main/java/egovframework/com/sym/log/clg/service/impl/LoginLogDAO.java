package egovframework.com.sym.log.clg.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.log.clg.service.LoginLog;

/**
 * @Class Name : LoginLogDAO.java
 * @Description : ?쒖뒪??濡쒓렇 愿由щ? ?꾪븳 ?곗씠???묎렐 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------       -------     -------------------
 *    2009. 3. 11.  ?댁궪??      理쒖큹?앹꽦
 *    2011. 7. 01.  ?닿린??      ?⑦궎吏 遺꾨━(sym.log -> sym.log.clg)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
@Repository("loginLogDAO")
public class LoginLogDAO extends EgovComAbstractDAO {

	/**
	 * ?묒냽濡쒓렇瑜?湲곕줉?쒕떎.
	 *
	 * @param LoginLog
	 * @return
	 * @throws Exception
	 */
	public void logInsertLoginLog(LoginLog loginLog) throws Exception{
		insert("LoginLog.logInsertLoginLog", loginLog);
	}

	/**
	 * ?묒냽濡쒓렇 ?곸꽭蹂닿린瑜?議고쉶?쒕떎.
	 *
	 * @param loginLog
	 * @return loginLog
	 * @throws Exception
	 */
	public LoginLog selectLoginLog(LoginLog loginLog) throws Exception{

		return (LoginLog) selectOne("LoginLog.selectLoginLog", loginLog);
	}

	/**
	 * ?묒냽濡쒓렇瑜?紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param loginLog
	 * @return
	 * @throws Exception
	 */
	public List<LoginLog> selectLoginLogInf(LoginLog loginLog) throws Exception{
		return selectList("LoginLog.selectLoginLogInf", loginLog);
	}

	/**
	 * ?묒냽濡쒓렇 紐⑸줉???レ옄瑜?議고쉶?쒕떎.
	 * @param loginLog
	 * @return
	 * @throws Exception
	 */
	public int selectLoginLogInfCnt(LoginLog loginLog) throws Exception{

		return (Integer)selectOne("LoginLog.selectLoginLogInfCnt", loginLog);
	}

}
