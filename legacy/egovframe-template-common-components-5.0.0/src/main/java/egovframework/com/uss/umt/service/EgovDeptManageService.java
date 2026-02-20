package egovframework.com.uss.umt.service;

import java.util.List;

public interface EgovDeptManageService {

	/**
	 * 遺?쒕? 愿由ы븯湲??꾪빐 ?깅줉??遺?쒕ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param deptManageVO - 遺??Vo
	 * @return List - 遺??紐⑸줉
	 * 
	 * @param deptManageVO
	 */
	public List<DeptManageVO> selectDeptManageList(DeptManageVO deptManageVO) throws Exception;

	/**
	 * 遺?쒕ぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param deptManageVO - 遺??Vo
	 * @return int - 遺??移댁슫????
	 * 
	 * @param deptManageVO
	 */
	public int selectDeptManageListTotCnt(DeptManageVO deptManageVO) throws Exception;
	
	/**
	 * ?깅줉??遺?쒖쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param deptManageVO - 遺??Vo
	 * @return deptManageVO - 遺??Vo
	 * 
	 * @param deptManageVO
	 */
	public DeptManageVO selectDeptManage(DeptManageVO deptManageVO) throws Exception;

	/**
	 * 遺?쒖젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param deptManageVO - 遺??model
	 * 
	 * @param deptManageVO
	 */
	public void insertDeptManage(DeptManageVO deptManageVO) throws Exception;

	/**
	 * 湲??깅줉??遺?쒖젙蹂대? ?섏젙?쒕떎.
	 * @param deptManageVO - 遺??model
	 * 
	 * @param deptManageVO
	 */
	public void updateDeptManage(DeptManageVO deptManageVO) throws Exception;

	/**
	 * 湲??깅줉??遺?쒖젙蹂대? ??젣?쒕떎.
	 * @param deptManageVO - 遺??model
	 * 
	 * @param deptManageVO
	 */
	public void deleteDeptManage(DeptManageVO deptManageVO) throws Exception;
}
