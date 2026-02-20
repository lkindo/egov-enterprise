package egovframework.com.uss.umt.service;

import java.util.List;

public interface EgovDeptManageService {

	/**
	 * ???? ???? ???????????.
	 * @param deptManageVO - ???Vo
	 * @return List - ????
	 * 
	 * @param deptManageVO
	 **/
	public List<DeptManageVO> selectDeptManageList(DeptManageVO deptManageVO) throws Exception;

    /**
     * ????????. (????????
     * @param deptManageVO - ???Vo
     * @return List - ????
     **/
    public List<DeptManageVO> selectDeptManageListPaged(DeptManageVO deptManageVO) throws Exception;

	/**
	 * ???????????.
	 * @param deptManageVO - ???Vo
	 * @return int - ????????
	 * 
	 * @param deptManageVO
	 **/
	public int selectDeptManageListTotCnt(DeptManageVO deptManageVO) throws Exception;
	
	/**
	 * ?????? ???????.
	 * @param deptManageVO - ???Vo
	 * @return deptManageVO - ???Vo
	 * 
	 * @param deptManageVO
	 **/
	public DeptManageVO selectDeptManage(DeptManageVO deptManageVO) throws Exception;

	/**
	 * ????? ?????.
	 * @param deptManageVO - ???model
	 * 
	 * @param deptManageVO
	 **/
	public void insertDeptManage(DeptManageVO deptManageVO) throws Exception;

	/**
	 * ????????? ????.
	 * @param deptManageVO - ???model
	 * 
	 * @param deptManageVO
	 **/
	public void updateDeptManage(DeptManageVO deptManageVO) throws Exception;

	/**
	 * ????????? ?????.
	 * @param deptManageVO - ???model
	 * 
	 * @param deptManageVO
	 **/
	public void deleteDeptManage(DeptManageVO deptManageVO) throws Exception;
}
