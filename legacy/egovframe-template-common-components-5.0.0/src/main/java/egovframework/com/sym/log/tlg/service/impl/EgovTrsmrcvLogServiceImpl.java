package egovframework.com.sym.log.tlg.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.sym.log.tlg.service.EgovTrsmrcvLogService;
import egovframework.com.sym.log.tlg.service.TrsmrcvLog;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovTrsmrcvLogServiceImpl.java
 * @Description : ?≪닔??濡쒓렇 愿由щ? ?꾪븳 ?쒕퉬??援ы쁽 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.   ?댁궪??        理쒖큹?앹꽦
 *    2011. 7. 01.   ?닿린??        ?⑦궎吏 遺꾨━(sym.log -> sym.log.tlg)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
@Service("EgovTrsmrcvLogService")
public class EgovTrsmrcvLogServiceImpl extends EgovAbstractServiceImpl implements
	EgovTrsmrcvLogService {

	@Resource(name="trsmrcvLogDAO")
	private TrsmrcvLogDAO trsmrcvLogDAO;

    /** ID Generation */
	@Resource(name="egovTrsmrcvLogIdGnrService")
	private EgovIdGnrService egovTrsmrcvLogIdGnrService;

	/**
	 * ?≪닔?좊줈洹??뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param TrsmrcvLog
	 */
	@Override
	public void logInsertTrsmrcvLog(TrsmrcvLog trsmrcvLog) throws Exception {
		String requstId = egovTrsmrcvLogIdGnrService.getNextStringId();
		trsmrcvLog.setRequstId(requstId);

		trsmrcvLogDAO.logInsertTrsmrcvLog(trsmrcvLog);
	}

	/**
	 * ?≪닔??濡쒓렇?뺣낫瑜??붿빟?쒕떎.
	 *
	 * @param
	 */
	@Override
	public void logInsertTrsmrcvLogSummary() throws Exception {

		trsmrcvLogDAO.logInsertTrsmrcvLogSummary();
	}

	/**
	 * ?≪닔??濡쒓렇?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param trsmrcvLog
	 * @return trsmrcvLog
	 * @throws Exception
	 */
	@Override
	public TrsmrcvLog selectTrsmrcvLog(TrsmrcvLog trsmrcvLog) throws Exception{

		return trsmrcvLogDAO.selectTrsmrcvLog(trsmrcvLog);
	}

	/**
     * ?≪닔??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
     *
     * @param TrsmrcvLog
     */
    @Override
    public Map<String, Object> selectTrsmrcvLogInf(TrsmrcvLog trsmrcvLog) throws Exception {
        List<TrsmrcvLog> resultList = trsmrcvLogDAO.selectTrsmrcvLogInf(trsmrcvLog);
        int totCnt = trsmrcvLogDAO.selectTrsmrcvLogInfCnt(trsmrcvLog);

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", resultList);
        map.put("resultCnt", totCnt);

        return map;
    }

}
