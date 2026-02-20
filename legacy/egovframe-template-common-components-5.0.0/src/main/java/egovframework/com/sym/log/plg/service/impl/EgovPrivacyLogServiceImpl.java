package egovframework.com.sym.log.plg.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.sym.log.plg.service.EgovPrivacyLogService;
import egovframework.com.sym.log.plg.service.PrivacyLog;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovPrivacyLogServiceImpl.java
 * @Description : 媛쒖씤?뺣낫 議고쉶 ?대젰 愿由щ? ?꾪븳 援ы쁽 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2014.09.11	?쒖??꾨젅?꾩썙??	理쒖큹?앹꽦
* @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 */
@Service("egovPrivacyLogService")
public class EgovPrivacyLogServiceImpl extends EgovAbstractServiceImpl implements EgovPrivacyLogService {

	@Resource(name="privacyLogDAO")
	private PrivacyLogDAO privacyLogDAO;

    /** ID Generation */
	@Resource(name="egovPrivacyLogIdGnrService")
	private EgovIdGnrService egovPrivacyLogIdGnrService;


	/**
	 * 媛쒖씤?뺣낫議고쉶 濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param privacyLog
	 */
	@Override
	public void innerInsertPrivacyLog(PrivacyLog privacyLog) throws Exception {

		privacyLog.setRequestId(egovPrivacyLogIdGnrService.getNextStringId());

		privacyLogDAO.insertPrivacyLog(privacyLog);
	}

	/**
	 * 媛쒖씤?뺣낫議고쉶 濡쒓렇?뺣낫 ?곸젣?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param privacyLog
	 * @return privacyLog
	 * @throws Exception
	 */
	@Override
	public Map<String, Object> selectPrivacyLogList(PrivacyLog privacyLog) throws Exception {

		List<PrivacyLog> result = privacyLogDAO.selectPrivacyLogList(privacyLog);
		int count = privacyLogDAO.selectPrivacyLogListCount(privacyLog);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(count));

		return map;
	}

	/**
	 * 媛쒖씤?뺣낫議고쉶 濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param privacyLog
	 */
	@Override
	public PrivacyLog selectPrivacyLog(PrivacyLog privacyLog) throws Exception {
		return privacyLogDAO.selectPrivacyLog(privacyLog);
	}

}
