package egovframework.com.sym.log.lgm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.sym.log.lgm.service.EgovSysLogService;
import egovframework.com.sym.log.lgm.service.SysLog;
import jakarta.annotation.Resource;

/**
 * 濡쒓렇愿由??쒖뒪??瑜??꾪븳 ?쒕퉬??援ы쁽 ?대옒??
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
 *   2025.07.11  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Service("EgovSysLogService")
public class EgovSysLogServiceImpl extends EgovAbstractServiceImpl implements EgovSysLogService {
	@Resource(name = "SysLogDAO")
	private SysLogDAO sysLogDAO;

	/** ID Generation */
	@Resource(name = "egovSysLogIdGnrService")
	private EgovIdGnrService egovSysLogIdGnrService;

	/**
	 * ?쒖뒪??濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param SysLog
	 */
	@Override
	public void logInsertSysLog(SysLog sysLog) throws Exception {
		String requstId = egovSysLogIdGnrService.getNextStringId();
		sysLog.setRequstId(requstId);

		sysLogDAO.logInsertSysLog(sysLog);

	}

	/**
	 * ?쒖뒪??濡쒓렇?뺣낫瑜??붿빟?쒕떎.
	 *
	 * @param
	 */
	@Override
	public void logInsertSysLogSummary() throws Exception {
		sysLogDAO.logInsertSysLogSummary();

	}

	/**
	 * ?쒖뒪??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param SysLog
	 */
	@Override
	public Map<String, Object> selectSysLogInf(SysLog sysLog) throws Exception {

		List<SysLog> resultList = sysLogDAO.selectSysLogInf(sysLog);
		int resultCnt = sysLogDAO.selectSysLogInfCnt(sysLog);

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", resultList);
		map.put("resultCnt", resultCnt);

		return map;
	}

	/**
	 * ?쒖뒪??濡쒓렇 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param sysLog
	 * @return sysLog
	 * @throws Exception
	 */
	@Override
	public SysLog selectSysLog(SysLog sysLog) throws Exception {
		return sysLogDAO.selectSysLog(sysLog);
	}

}
