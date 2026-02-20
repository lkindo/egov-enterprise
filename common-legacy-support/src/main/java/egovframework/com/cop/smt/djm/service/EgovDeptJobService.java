package egovframework.com.cop.smt.djm.service;

import java.util.List;
import java.util.Map;

/**
 * ??
 * - ?????????Service Interface?????.
 * 
 * ???
 * - ??????????, ??, ???? ???????.
 * - ????????? ?, ??????.
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 10:59:05
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.6.28	???         ????
 *
 * </pre>
 **/
public interface EgovDeptJobService {
	
	/**
	 * ??????????.
	 * @param ChargerVO
	 * @return  Map<String, Object>
	 * 
	 * @param chargerVO
	 **/
	public Map<String, Object> selectChargerList(ChargerVO chargerVO) throws Exception;
	
	
	/**
	 * ????????.
	 * @param DeptVO
	 * @return  List
	 * 
	 * @param deptVO
	 **/
	public Map<String, Object> selectDeptList(DeptVO deptVO) throws Exception;
	
	/**
	 * ?????????.
	 * @param String
	 * @return  String
	 * 
	 * @param String
	 **/
	public String selectDept(String deptVO) throws Exception;
	
	/**
	 * ??????????.
	 * @param DeptJobBxVO
	 * @return  List
	 * 
	 * @param deptJobBxVO
	 **/
	public Map<String, Object> selectDeptJobBxList(DeptJobBxVO deptJobBxVO) throws Exception;
	
	/**
	 * ????????????.
	 * @param DeptJobBxVO
	 * @return  List
	 * 
	 * @param deptJobBxVO
	 **/
	public List<DeptJobBxVO> selectDeptJobBxListAll() throws Exception;

	/**
	 * ???????????.
	 * @param DeptJobBxVO
	 * @return  DeptJobBxVO
	 * 
	 * @param deptJobBxVO
	 **/
	public DeptJobBxVO selectDeptJobBx(DeptJobBxVO deptJobBxVO) throws Exception;

	/**
	 * ????????????.
	 * @param DeptJobBxVO
	 * @return
	 * 
	 * @param deptJobBxVO
	 **/
	public void updateDeptJobBx(DeptJobBxVO deptJobBxVO) throws Exception;

	/**
	 * ??????????????????.
	 * @param DeptJobBx
	 * @return boolean
	 * 
	 * @param deptJobBx
	 **/
	public boolean updateDeptJobBxOrdr(DeptJobBxVO deptJobBxVO) throws Exception;
	
	/**
	 * ????????????????.
	 * @param String
	 * @return  int
	 * 
	 * @param deptId
	 **/
	public int selectDeptJobBxOrdr(String deptId) throws Exception;
	
	/**
	 * ???????????.
	 * @param DeptJobBxVO
	 * @return
	 * 
	 * @param deptJobBxVO
	 **/
	public void insertDeptJobBx(DeptJobBxVO deptJobBxVO) throws Exception;
	
	/**
	 * ??? ????? ?????.
	 * @param DeptJobBx
	 * @return int
	 * 
	 * @param deptJobBx
	 **/
	public int selectDeptJobBxCheck(DeptJobBx deptJobBx) throws Exception;

	/**
	 * ?????????????.
	 * @param DeptJobBx
	 * @return
	 * 
	 * @param deptJobBx
	 **/
	public void deleteDeptJobBx(DeptJobBx deptJobBx) throws Exception;

	/**
	 * ??????????.
	 * @param DeptJobVO
	 * @return  List
	 * 
	 * @param deptJobVO
	 **/
	public Map<String, Object> selectDeptJobList(DeptJobVO deptJobVO) throws Exception;

	/**
	 * ???????????.
	 * @param DeptJobVO
	 * @return DeptJobVO
	 * 
	 * @param deptJobVO
	 **/
	public DeptJobVO selectDeptJob(DeptJobVO deptJobVO) throws Exception;

	/**
	 * ????????????.
	 * @param DeptJob
	 * @return
	 * 
	 * @param deptJob
	 **/
	public void updateDeptJob(DeptJob deptJob) throws Exception;

	/**
	 * ???????????.
	 * @param DeptJob
	 * @return
	 * 
	 * @param deptJob
	 **/
	public void insertDeptJob(DeptJob deptJob) throws Exception;

	/**
	 * ?????????????.
	 * @param DeptJob
	 * @return
	 * 
	 * @param deptJob
	 **/
	public void deleteDeptJob(DeptJob deptJob) throws Exception;

}
