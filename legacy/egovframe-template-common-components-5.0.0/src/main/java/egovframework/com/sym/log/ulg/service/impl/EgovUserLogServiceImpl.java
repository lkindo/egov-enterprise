package egovframework.com.sym.log.ulg.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.log.ulg.service.EgovUserLogService;
import egovframework.com.sym.log.ulg.service.UserLog;
import jakarta.annotation.Resource;

/**
 * ?ъ슜濡쒓렇 愿由щ? ?꾪븳 ?쒕퉬??援ы쁽 ?대옒??
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009.03.11
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11  ?댁궪??         理쒖큹 ?앹꽦
 *   2011.07.01  ?닿린??         ?⑦궎吏 遺꾨━(sym.log -> sym.log.ulg)
 *   2025.07.14  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Service("EgovUserLogService")
public class EgovUserLogServiceImpl extends EgovAbstractServiceImpl implements EgovUserLogService {

	@Resource(name = "userLogDAO")
	private UserLogDAO userLogDAO;

	/**
	 * ?ъ슜??濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param
	 */
	@Override
	public void logInsertUserLog() throws Exception {

		userLogDAO.logInsertUserLog();
	}

	/**
	 * ?ъ슜??濡쒓렇?뺣낫 ?곸젣?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param userLog
	 * @return userLog
	 * @throws Exception
	 */
	@Override
	public UserLog selectUserLog(UserLog userLog) throws Exception {

		return userLogDAO.selectUserLog(userLog);
	}

	/**
	 * ?ъ슜??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param UserLog
	 */
	@Override
	public Map<String, Object> selectUserLogInf(UserLog userLog) throws Exception {
		List<UserLog> resultList = userLogDAO.selectUserLogInf(userLog);
		int resultCnt = userLogDAO.selectUserLogInfCnt(userLog);

		Map<String, Object> resultMap = new HashMap<>();
		resultMap.put("resultList", resultList);
		resultMap.put("resultCnt", resultCnt); // ?먮뒗 Integer.toString(resultCnt) ?꾩슂??

		return resultMap;
	}

}