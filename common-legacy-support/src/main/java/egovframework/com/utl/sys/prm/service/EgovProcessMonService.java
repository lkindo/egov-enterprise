package egovframework.com.utl.sys.prm.service;

import java.util.List;
import java.util.Map;

/**
 * ??- PROCESS????????Service Interface?????.
 *
 * ??? - PROCESS?????????, ??, ???? ?????????. - PROCESS??????? ?,
 * ??????.
 *
 * @author ??
 * @version 1.0
 * @created 08-9-2010 ?? 3:54:45
 **/
public interface EgovProcessMonService {

	/**
	 * ???PROCESS?? ?????.
	 *
	 * @param processMonVO - PROCESS?? Vo
	 * @return List - PROCESS?? ?
	 *
	 * @param processMonVO
	 **/
	public List<ProcessMonVO> selectProcessMonList(ProcessMonVO processMonVO) throws Exception;

	/**
	 * PROCESS?? ????????.
	 *
	 * @param HttpMonVO - PROCESS?? Vo
	 * @return int - PROCESS?? ? ?????
	 *
	 * @param httpMonVO
	 **/
	int selectProcessMonTotCnt(ProcessMonVO searchVO) throws Exception;

	/**
	 * ???PROCESS???????????.
	 *
	 * @param processMonVO - PROCESS?? Vo
	 * @return processMonVO - PROCESS?? Vo
	 *
	 * @param processMonVO
	 **/
	ProcessMonVO selectProcessMon(ProcessMonVO processMonVO) throws Exception;

	/**
	 * PROCESS?? ????????.
	 *
	 * @param processNm - PROCESS?? model
	 *
	 * @param processNm
	 **/
	public void insertProcessMon(ProcessMon processMon) throws Exception;

	/**
	 * ????PROCESS?? ???????.
	 *
	 * @param processNm - PROCESS?? model
	 *
	 * @param processNm
	 **/
	public void updateProcessMon(ProcessMon processMon) throws Exception;

	/**
	 * ????PROCESS?? ????????.
	 *
	 * @param processNm - PROCESS?? model
	 *
	 * @param processNm
	 **/
	public void deleteProcessMon(ProcessMon processMon) throws Exception;

	/**
	 * ?? ?????????.
	 *
	 * @param ProcessMonVO - ??????VO
	 * @return List<ProcessMonVO> - ??????List
	 *
	 * @param processMonVO
	 **/
	public Map<String, Object> selectProcessMonLogList(ProcessMonLogVO processMonLogVO) throws Exception;

	/**
	 * ?? ????????????.
	 *
	 * @param ProcessMonVO - ??????model
	 * @return ProcessMonVO - ??????model
	 *
	 * @param processMonVO
	 **/
	public ProcessMonLogVO selectProcessMonLog(ProcessMonLogVO processMonLogVO) throws Exception;

	/**
	 * ?? ?? ??????.
	 *
	 * @param ProcessMon - ?? ??????model
	 *
	 * @param processMon
	 **/
	public void updateProcessMonSttus(ProcessMon processMon) throws Exception;

	/**
	 * ?? ???????.
	 *
	 * @param ProcessMonLog - ?? ????model
	 *
	 * @param processMonLog
	 **/
	public void insertProcessMonLog(ProcessMonLog processMonLog) throws Exception;

}
