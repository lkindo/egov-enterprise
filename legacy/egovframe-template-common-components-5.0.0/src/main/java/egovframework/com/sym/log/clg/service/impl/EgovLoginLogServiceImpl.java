package egovframework.com.sym.log.clg.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.sym.log.clg.service.EgovLoginLogService;
import egovframework.com.sym.log.clg.service.LoginLog;
import jakarta.annotation.Resource;

/**
 * ?묒냽濡쒓렇 愿由щ? ?꾪븳 ?쒕퉬??援ы쁽 ?대옒??
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11  ?댁궪??         理쒖큹 ?앹꽦
 *   2011.07.01  ?닿린??         ?⑦궎吏 遺꾨━(stm.log -> sym.log.clg)
 *   2025.07.10  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Service("EgovLoginLogService")
public class EgovLoginLogServiceImpl extends EgovAbstractServiceImpl implements EgovLoginLogService {

	@Resource(name = "loginLogDAO")
	private LoginLogDAO loginLogDAO;

	/** ID Generation */
	@Resource(name = "egovLoginLogIdGnrService")
	private EgovIdGnrService egovLoginLogIdGnrService;

	/**
	 * ?묒냽濡쒓렇瑜?湲곕줉?쒕떎.
	 *
	 * @param LoginLog
	 */
	@Override
	public void logInsertLoginLog(LoginLog loinLog) throws Exception {
		String logId = egovLoginLogIdGnrService.getNextStringId();
		loinLog.setLogId(logId);

		loginLogDAO.logInsertLoginLog(loinLog);
	}

	/**
	 * ?묒냽濡쒓렇瑜?議고쉶?쒕떎.
	 *
	 * @param loginLog
	 * @return loginLog
	 * @throws Exception
	 */
	@Override
	public LoginLog selectLoginLog(LoginLog loginLog) throws Exception {

		return loginLogDAO.selectLoginLog(loginLog);
	}

	/**
	 * ?묒냽濡쒓렇 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param LoginLog
	 */
	@Override
	public Map<String, Object> selectLoginLogInf(LoginLog loinLog) throws Exception {
		List<LoginLog> resultList = loginLogDAO.selectLoginLogInf(loinLog);
		int resultCnt = loginLogDAO.selectLoginLogInfCnt(loinLog);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", resultList);
		map.put("resultCnt", resultCnt);

		return map;
	}

}
