package egovframework.com.sym.log.ulg.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.log.ulg.service.UserLog;

/**
 * @Class Name : UserLogDAO.java
 * @Description : ?ъ슜濡쒓렇 愿由щ? ?꾪븳 ?곗씠???묎렐 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.   ?댁궪??        理쒖큹?앹꽦
 *    2011. 7. 01.   ?닿린??        ?⑦궎吏 遺꾨━(sym.log -> sym.log.ulg)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
@Repository("userLogDAO")
public class UserLogDAO extends EgovComAbstractDAO {

	/**
	 * ?ъ슜??濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	public void logInsertUserLog() throws Exception{
		insert("UserLog.logInsertUserLog", null);
	}

	/**
	 * ?ъ슜??濡쒓렇?뺣낫 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param userLog
	 * @return userLog
	 * @throws Exception
	 */
	public UserLog selectUserLog(UserLog userLog) throws Exception{

		return (UserLog) selectOne("UserLog.selectUserLog", userLog);
	}

	/**
	 * ?ъ슜??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param UserLog
	 * @return
	 * @throws Exception
	 */
	public List<UserLog> selectUserLogInf(UserLog userLog) throws Exception{
		return selectList("UserLog.selectUserLogInf", userLog);
	}

	/**
	 * ?ъ슜??濡쒓렇?뺣낫 紐⑸줉???レ옄瑜?議고쉶?쒕떎.
	 * @param UserLog
	 * @return
	 * @throws Exception
	 */
	public int selectUserLogInfCnt(UserLog userLog) throws Exception{

		return (Integer)selectOne("UserLog.selectUserLogInfCnt", userLog);
	}

}
