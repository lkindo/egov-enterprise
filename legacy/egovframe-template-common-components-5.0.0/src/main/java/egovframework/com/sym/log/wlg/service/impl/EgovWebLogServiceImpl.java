package egovframework.com.sym.log.wlg.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.sym.log.wlg.service.EgovWebLogService;
import egovframework.com.sym.log.wlg.service.WebLog;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovWebLogServiceImpl.java
 * @Description : ?밸줈洹?愿由щ? ?꾪븳 ?쒕퉬??援ы쁽 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.   ?댁궪??        理쒖큹?앹꽦
 *    2011. 7. 01.   ?닿린??        ?⑦궎吏 遺꾨━(sym.log -> sym.log.wlg)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
@Service("EgovWebLogService")
public class EgovWebLogServiceImpl extends EgovAbstractServiceImpl implements
	EgovWebLogService {

	@Resource(name="webLogDAO")
	private WebLogDAO webLogDAO;

    /** ID Generation */
	@Resource(name="egovWebLogIdGnrService")
	private EgovIdGnrService egovWebLogIdGnrService;

	/**
	 * ??濡쒓렇瑜?湲곕줉?쒕떎.
	 *
	 * @param WebLog
	 */
	@Override
	public void logInsertWebLog(WebLog webLog) throws Exception {
		String requstId = egovWebLogIdGnrService.getNextStringId();
		webLog.setRequstId(requstId);

		webLogDAO.logInsertWebLog(webLog);
	}

	/**
	 * ??濡쒓렇?뺣낫瑜??붿빟?쒕떎.
	 *
	 * @param
	 */
	@Override
	public void logInsertWebLogSummary() throws Exception {

		webLogDAO.logInsertWebLogSummary();
	}

	/**
	 * ??濡쒓렇?뺣낫 ?곸젣?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param webLog
	 * @return webLog
	 * @throws Exception
	 */
	@Override
	public WebLog selectWebLog(WebLog webLog) throws Exception{

		return webLogDAO.selectWebLog(webLog);
	}

	/**
	 * ??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param WebLog
	 */
	@Override
	public Map<String, Object> selectWebLogInf(WebLog webLog) throws Exception {
		List<WebLog> resultList = webLogDAO.selectWebLogInf(webLog);
		int totCnt = webLogDAO.selectWebLogInfCnt(webLog);

		Map<String, Object> map = new HashMap<>();
        map.put("resultList", resultList);
        map.put("resultCnt", totCnt);

        return map;
	}

}
