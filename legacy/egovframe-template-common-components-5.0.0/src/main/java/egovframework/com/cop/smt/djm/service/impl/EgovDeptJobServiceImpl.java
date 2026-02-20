package egovframework.com.cop.smt.djm.service.impl;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cop.smt.djm.service.ChargerVO;
import egovframework.com.cop.smt.djm.service.DeptJob;
import egovframework.com.cop.smt.djm.service.DeptJobBx;
import egovframework.com.cop.smt.djm.service.DeptJobBxVO;
import egovframework.com.cop.smt.djm.service.DeptJobVO;
import egovframework.com.cop.smt.djm.service.DeptVO;
import egovframework.com.cop.smt.djm.service.EgovDeptJobService;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - 遺?쒖뾽臾댁뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 遺?쒖뾽臾댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 遺?쒖뾽臾댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:05
 *  <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.6.28	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("EgovDeptJobService")
public class EgovDeptJobServiceImpl extends EgovAbstractServiceImpl implements EgovDeptJobService {

	@Resource(name = "DeptJobDAO")
    private DeptJobDAO deptJobDAO;

	@Resource(name="egovDeptJobIdGnrService")
	private EgovIdGnrService idgenServiceDeptJob;

	@Resource(name="egovDeptJobBxIdGnrService")
	private EgovIdGnrService idgenServiceDeptJobBx;

	/**
	 * ?대떦??紐⑸줉??議고쉶?쒕떎.
	 * @param ChargerVO
	 * @return  Map<String, Object>
	 *
	 * @param chargerVO
	 */
	@Override
	public Map<String, Object> selectChargerList(ChargerVO chargerVO) throws Exception{
		List<ChargerVO> result = deptJobDAO.selectChargerList(chargerVO);
		int cnt = deptJobDAO.selectChargerListCnt(chargerVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}


	/**
	 * 遺??紐⑸줉??議고쉶?쒕떎.
	 * @param DeptVO
	 * @return  List
	 *
	 * @param deptVO
	 */
	@Override
	public Map<String, Object> selectDeptList(DeptVO deptVO) throws Exception{
		List<DeptVO> result = deptJobDAO.selectDeptList(deptVO);
		int cnt = deptJobDAO.selectDeptListCnt(deptVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * 遺???뺣낫瑜?議고쉶?쒕떎.
	 * @param String
	 * @return  String
	 *
	 * @param String
	 */
	@Override
	public String selectDept(String deptVO) throws Exception{
		return deptJobDAO.selectDept(deptVO);
	}

	/**
	 * 遺?쒖뾽臾댄븿 紐⑸줉 ?꾩껜瑜?議고쉶?쒕떎.
	 * @param DeptJobBxVO
	 * @return  List
	 *
	 * @param deptJobBxVO
	 */
	@Override
	public List<DeptJobBxVO> selectDeptJobBxListAll() throws Exception{
		return deptJobDAO.selectDeptJobBxListAll();
	}

	/**
	 * 遺?쒖뾽臾댄븿 紐⑸줉??議고쉶?쒕떎.
	 * @param DeptJobBxVO
	 * @return  List
	 *
	 * @param deptJobBxVO
	 */
	@Override
	public Map<String, Object> selectDeptJobBxList(DeptJobBxVO deptJobBxVO) throws Exception{
		List<DeptJobBxVO> result = deptJobDAO.selectDeptJobBxList(deptJobBxVO);
		int cnt = deptJobDAO.selectDeptJobBxListCnt(deptJobBxVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * 遺?쒖뾽臾댄븿??議고쉶?쒕떎.
	 * @param DeptJobBxVO
	 * @return  DeptJobBxVO
	 *
	 * @param deptJobBxVO
	 */
	@Override
	public DeptJobBxVO selectDeptJobBx(DeptJobBxVO deptJobBxVO) throws Exception{
		return deptJobDAO.selectDeptJobBx(deptJobBxVO);
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜??섏젙?쒕떎.
	 * @param DeptJobBxVO
	 * @return
	 *
	 * @param deptJobBxVO
	 */
	@Override
	public void updateDeptJobBx(DeptJobBxVO deptJobBxVO) throws Exception{
		if(deptJobDAO.selectDeptJobBxOrdr(deptJobBxVO) > 0){
			deptJobDAO.updateDeptJobBxOrdrAll(deptJobBxVO);
		}
		deptJobDAO.updateDeptJobBx(deptJobBxVO);
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫???쒖떆?쒖꽌瑜??섏젙?쒕떎.
	 * @param DeptJobBx
	 * @return boolean
	 *
	 * @param deptJobBx
	 */
	@Override
	public boolean updateDeptJobBxOrdr(DeptJobBxVO deptJobBxVO) throws Exception{

		boolean changed = false;
		if(deptJobBxVO.getOrdrCnd().equals("up")){
			deptJobBxVO.setIndictOrdr(deptJobBxVO.getIndictOrdr() - 1);
			if(deptJobDAO.selectDeptJobBxOrdr(deptJobBxVO) > 0){
				deptJobDAO.updateDeptJobBxOrdrUp(deptJobBxVO);
				deptJobDAO.updateDeptJobBxOrdr(deptJobBxVO);

				changed = true;
			}
		}else if(deptJobBxVO.getOrdrCnd().equals("down")){
			deptJobBxVO.setIndictOrdr(deptJobBxVO.getIndictOrdr() + 1);
			if(deptJobDAO.selectDeptJobBxOrdr(deptJobBxVO) > 0){
				deptJobDAO.updateDeptJobBxOrdrDown(deptJobBxVO);
				deptJobDAO.updateDeptJobBxOrdr(deptJobBxVO);

				changed = true;
			}
		}

		return changed;
	}

	/**
	 * ?깅줉??遺?쒖뾽臾댄븿???쒖꽌瑜?議고쉶?쒕떎.
	 * @param String
	 * @return  int
	 *
	 * @param deptId
	 */
	@Override
	public int selectDeptJobBxOrdr(String deptId) throws Exception{
		return deptJobDAO.selectMaxDeptJobBxOrdr(deptId);
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜??깅줉?쒕떎.
	 * @param DeptJobBxVO
	 * @return
	 *
	 * @param deptJobBxVO
	 */
	@Override
	public void insertDeptJobBx(DeptJobBxVO deptJobBxVO) throws Exception{
		deptJobBxVO.setDeptJobBxId(idgenServiceDeptJobBx.getNextStringId());
		if(deptJobDAO.selectDeptJobBxOrdr(deptJobBxVO) > 0){
			deptJobDAO.updateDeptJobBxOrdrAll(deptJobBxVO);
		}
		deptJobDAO.insertDeptJobBx(deptJobBxVO);
	}

	/**
	 * 遺?쒕궡 遺?쒖뾽臾댄븿紐낆쓽 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param DeptJobBx
	 * @return int
	 *
	 * @param deptJobBx
	 */
	@Override
	public int selectDeptJobBxCheck(DeptJobBx deptJobBx) throws Exception{
		return deptJobDAO.selectDeptJobBxCheck(deptJobBx);
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜???젣?쒕떎.
	 * @param DeptJobBx
	 * @return
	 *
	 * @param deptJobBx
	 */
	@Override
	public void deleteDeptJobBx(DeptJobBx deptJobBx) throws Exception{
		deptJobDAO.deleteDeptJobBx(deptJobBx);
	}

	/**
	 * 遺?쒖뾽臾?紐⑸줉??議고쉶?쒕떎.
	 * @param DeptJobVO
	 * @return  List
	 *
	 * @param deptJobVO
	 */
	@Override
	public Map<String, Object> selectDeptJobList(DeptJobVO deptJobVO) throws Exception{
		List<DeptJobVO> result = deptJobDAO.selectDeptJobList(deptJobVO);
		int cnt = deptJobDAO.selectDeptJobListCnt(deptJobVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * 遺?쒖뾽臾??뺣낫瑜?議고쉶?쒕떎.
	 * @param DeptJobVO
	 * @return  DeptJobVO
	 *
	 * @param deptJobVO
	 */
	@Override
	public DeptJobVO selectDeptJob(DeptJobVO deptJobVO) throws Exception{
		return deptJobDAO.selectDeptJob(deptJobVO);
	}

	/**
	 * 遺?쒖뾽臾대? ?섏젙?쒕떎.
	 * @param DeptJob
	 *
	 * @param deptJob
	 */
	@Override
	public void updateDeptJob(DeptJob deptJob) throws Exception{
		deptJobDAO.updateDeptJob(deptJob);
	}

	/**
	 * 遺?쒖뾽臾대? ?깅줉?쒕떎.
	 * @param DeptJob
	 *
	 * @param deptJob
	 */
	@Override
	public void insertDeptJob(DeptJob deptJob) throws Exception{
		deptJob.setDeptJobId(idgenServiceDeptJob.getNextStringId());
		deptJobDAO.insertDeptJob(deptJob);
	}

	/**
	 * 遺?쒖뾽臾대? ??젣?쒕떎.
	 * @param DeptJob
	 *
	 * @param deptJob
	 */
	@Override
	public void deleteDeptJob(DeptJob deptJob) throws Exception{
		deptJobDAO.deleteDeptJob(deptJob);
	}

}