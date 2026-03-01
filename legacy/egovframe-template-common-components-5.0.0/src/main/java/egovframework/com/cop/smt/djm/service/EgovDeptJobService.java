package egovframework.com.cop.smt.djm.service;

import java.util.List;
import java.util.Map;

/**
 * 媛쒖슂
 * - 遺?쒖뾽臾댁뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 遺?쒖뾽臾댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 遺?쒖뾽臾댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:05
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.6.28	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovDeptJobService {
	
	/**
	 * ?대떦??紐⑸줉??議고쉶?쒕떎.
	 * @param ChargerVO
	 * @return  Map<String, Object>
	 * 
	 * @param chargerVO
	 */
	public Map<String, Object> selectChargerList(ChargerVO chargerVO) throws Exception;
	
	
	/**
	 * 遺??紐⑸줉??議고쉶?쒕떎.
	 * @param DeptVO
	 * @return  List
	 * 
	 * @param deptVO
	 */
	public Map<String, Object> selectDeptList(DeptVO deptVO) throws Exception;
	
	/**
	 * 遺???뺣낫瑜?議고쉶?쒕떎.
	 * @param String
	 * @return  String
	 * 
	 * @param String
	 */
	public String selectDept(String deptVO) throws Exception;
	
	/**
	 * 遺?쒖뾽臾댄븿 紐⑸줉??議고쉶?쒕떎.
	 * @param DeptJobBxVO
	 * @return  List
	 * 
	 * @param deptJobBxVO
	 */
	public Map<String, Object> selectDeptJobBxList(DeptJobBxVO deptJobBxVO) throws Exception;
	
	/**
	 * 遺?쒖뾽臾댄븿 紐⑸줉 ?꾩껜瑜?議고쉶?쒕떎.
	 * @param DeptJobBxVO
	 * @return  List
	 * 
	 * @param deptJobBxVO
	 */
	public List<DeptJobBxVO> selectDeptJobBxListAll() throws Exception;

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param DeptJobBxVO
	 * @return  DeptJobBxVO
	 * 
	 * @param deptJobBxVO
	 */
	public DeptJobBxVO selectDeptJobBx(DeptJobBxVO deptJobBxVO) throws Exception;

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜??섏젙?쒕떎.
	 * @param DeptJobBxVO
	 * @return
	 * 
	 * @param deptJobBxVO
	 */
	public void updateDeptJobBx(DeptJobBxVO deptJobBxVO) throws Exception;

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫???쒖떆?쒖꽌瑜??섏젙?쒕떎.
	 * @param DeptJobBx
	 * @return boolean
	 * 
	 * @param deptJobBx
	 */
	public boolean updateDeptJobBxOrdr(DeptJobBxVO deptJobBxVO) throws Exception;
	
	/**
	 * ?깅줉??遺?쒖뾽臾댄븿???쒖꽌瑜?議고쉶?쒕떎.
	 * @param String
	 * @return  int
	 * 
	 * @param deptId
	 */
	public int selectDeptJobBxOrdr(String deptId) throws Exception;
	
	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜??깅줉?쒕떎.
	 * @param DeptJobBxVO
	 * @return
	 * 
	 * @param deptJobBxVO
	 */
	public void insertDeptJobBx(DeptJobBxVO deptJobBxVO) throws Exception;
	
	/**
	 * 遺?쒕궡 遺?쒖뾽臾댄븿紐낆쓽 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param DeptJobBx
	 * @return int
	 * 
	 * @param deptJobBx
	 */
	public int selectDeptJobBxCheck(DeptJobBx deptJobBx) throws Exception;

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜???젣?쒕떎.
	 * @param DeptJobBx
	 * @return
	 * 
	 * @param deptJobBx
	 */
	public void deleteDeptJobBx(DeptJobBx deptJobBx) throws Exception;

	/**
	 * 遺?쒖뾽臾?紐⑸줉??議고쉶?쒕떎.
	 * @param DeptJobVO
	 * @return  List
	 * 
	 * @param deptJobVO
	 */
	public Map<String, Object> selectDeptJobList(DeptJobVO deptJobVO) throws Exception;

	/**
	 * 遺?쒖뾽臾??뺣낫瑜?議고쉶?쒕떎.
	 * @param DeptJobVO
	 * @return DeptJobVO
	 * 
	 * @param deptJobVO
	 */
	public DeptJobVO selectDeptJob(DeptJobVO deptJobVO) throws Exception;

	/**
	 * 遺?쒖뾽臾??뺣낫瑜??섏젙?쒕떎.
	 * @param DeptJob
	 * @return
	 * 
	 * @param deptJob
	 */
	public void updateDeptJob(DeptJob deptJob) throws Exception;

	/**
	 * 遺?쒖뾽臾??뺣낫瑜??깅줉?쒕떎.
	 * @param DeptJob
	 * @return
	 * 
	 * @param deptJob
	 */
	public void insertDeptJob(DeptJob deptJob) throws Exception;

	/**
	 * 遺?쒖뾽臾??뺣낫瑜???젣?쒕떎.
	 * @param DeptJob
	 * @return
	 * 
	 * @param deptJob
	 */
	public void deleteDeptJob(DeptJob deptJob) throws Exception;

}
