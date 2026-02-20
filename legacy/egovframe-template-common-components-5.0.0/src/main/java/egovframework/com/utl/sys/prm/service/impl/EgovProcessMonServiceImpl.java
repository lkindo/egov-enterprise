package egovframework.com.utl.sys.prm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.utl.sys.prm.service.EgovProcessMonService;
import egovframework.com.utl.sys.prm.service.ProcessMon;
import egovframework.com.utl.sys.prm.service.ProcessMonLog;
import egovframework.com.utl.sys.prm.service.ProcessMonLogVO;
import egovframework.com.utl.sys.prm.service.ProcessMonVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - PROCESS紐⑤땲?곕쭅?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - PROCESS紐⑤땲?곕쭅??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - PROCESS紐⑤땲?곕쭅??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 08-9-2010 ?ㅽ썑 3:54:46
 */

@Service("EgovProcessMonService")
public class EgovProcessMonServiceImpl extends EgovAbstractServiceImpl implements EgovProcessMonService {

	@Resource(name = "ProcessMonDAO")
	private ProcessMonDAO processMonDAO;

	@Resource(name="egovProcessMonIdGnrService")
	private EgovIdGnrService idgenServiceProcessMon;

	@Resource(name="egovProcessMonLogIdGnrService")
	private EgovIdGnrService idgenServiceProcessMonLog;

	/**
     * ?깅줉??PROCESS紐⑤땲?곕쭅 紐⑸줉??議고쉶?쒕떎.
     *
     * @param processMonVO - PROCESS紐⑤땲?곕쭅 Vo
     * @return List - PROCESS紐⑤땲?곕쭅 紐⑸줉
     *
     * @param processMonVO
     */
    @Override
    public List<ProcessMonVO> selectProcessMonList(ProcessMonVO processMonVO) throws Exception {
        return processMonDAO.selectProcessMonList(processMonVO);
    }

	/**
	 * PROCESS紐⑤땲?곕쭅 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param processMonVO - PROCESS紐⑤땲?곕쭅 Vo
	 * @return int - PROCESS紐⑤땲?곕쭅 ?좏깉 移댁슫????
	 *
	 * @param processMonVO
	 */
	@Override
	public int selectProcessMonTotCnt(ProcessMonVO processMonVO) throws Exception {
        return processMonDAO.selectProcessMonTotCnt(processMonVO);
	}

	/**
	 * ?깅줉??PROCESS紐⑤땲?곕쭅???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param processMonVO - PROCESS紐⑤땲?곕쭅 Vo
	 * @return processMonVO - PROCESS紐⑤땲?곕쭅 Vo
	 *
	 * @param processMonVO
	 */
	@Override
	public ProcessMonVO selectProcessMon(ProcessMonVO processMonVO) throws Exception {
		return processMonDAO.selectProcessMon(processMonVO);
	}

	/**
	 * PROCESS紐⑤땲?곕쭅 ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param processNm - PROCESS紐⑤땲?곕쭅 model
	 *
	 * @param processNm
	 */
	@Override
	public void insertProcessMon(ProcessMon processMon) throws Exception {
		processMon.setProcessId(idgenServiceProcessMon.getNextStringId());
		processMonDAO.insertProcessMon(processMon);
	}

	/**
	 * 湲??깅줉??PROCESS紐⑤땲?곕쭅 ?뺣낫瑜??섏젙?쒕떎.
	 * @param processNm - PROCESS紐⑤땲?곕쭅 model
	 *
	 * @param processNm
	 */
	@Override
	public void updateProcessMon(ProcessMon processMon) throws Exception {
		processMonDAO.updateProcessMon(processMon);
	}

	/**
	 * 湲??깅줉??PROCESS紐⑤땲?곕쭅 ?뺣낫瑜???젣?쒕떎.
	 * @param processNm - PROCESS紐⑤땲?곕쭅 model
	 *
	 * @param processNm
	 */
	@Override
	public void deleteProcessMon(ProcessMon processMon) throws Exception {
		processMonDAO.deleteProcessMon(processMon);
	}

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇 紐⑸줉??議고쉶?쒕떎.
	 * @param ProcessMonVO - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  List<ProcessMonVO> - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 List
	 *
	 * @param processMonLogVO
	 */
	@Override
	public Map<String, Object> selectProcessMonLogList(ProcessMonLogVO processMonLogVO) throws Exception {
		List<ProcessMonLogVO> result = processMonDAO.selectProcessMonLogList(processMonLogVO);
		int cnt = processMonDAO.selectProcessMonLogTotCnt(processMonLogVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param ProcessMonVO - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 model
	 * @return  ProcessMonVO - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 model
	 *
	 * @param processMonLogVO
	 */
	@Override
	public ProcessMonLogVO selectProcessMonLog(ProcessMonLogVO processMonLogVO) throws Exception {
		return processMonDAO.selectProcessMonLog(processMonLogVO);
	}

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇瑜??깅줉?쒕떎.
	 * @param processMonLog - ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇 model
	 *
	 * @param processMonLog
	 */
	@Override
	public void insertProcessMonLog(ProcessMonLog processMonLog) throws Exception{
		processMonDAO.insertProcessMonLog(processMonLog);
	}

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅 寃곌낵瑜??섏젙?쒕떎.
	 * @param processMonLog - ?꾨줈?몄뒪 紐⑤땲?곕쭅???model
	 *
	 * @param processMonLog
	 */
	@Override
	public void updateProcessMonSttus(ProcessMon processMon) throws Exception{
		processMonDAO.updateProcessMonSttus(processMon);

		ProcessMonLog processMonLog = new ProcessMonLog();
		processMonLog.setProcessId(processMon.getProcessId());
		processMonLog.setLogId(idgenServiceProcessMonLog.getNextStringId());
		processMonLog.setProcessNm(processMon.getProcessNm());
		processMonLog.setProcsSttus(processMon.getProcsSttus());
		processMonLog.setCreatDt(processMon.getCreatDt());
		processMonLog.setLogInfo(processMon.getLogInfo());
		processMonLog.setMngrNm(processMon.getMngrNm());
		processMonLog.setMngrEmailAddr(processMon.getMngrEmailAddr());
		processMonLog.setFrstRegisterId(processMon.getFrstRegisterId());
		processMonLog.setFrstRegisterPnttm(processMon.getFrstRegisterPnttm());
		processMonLog.setLastUpdusrId(processMon.getLastUpdusrId());
		insertProcessMonLog(processMonLog);
	}

}