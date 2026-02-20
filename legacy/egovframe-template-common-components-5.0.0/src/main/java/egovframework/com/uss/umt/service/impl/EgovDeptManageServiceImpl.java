package egovframework.com.uss.umt.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.uss.umt.service.DeptManageVO;
import egovframework.com.uss.umt.service.EgovDeptManageService;
import jakarta.annotation.Resource;

@Service("egovDeptManageService")
public class EgovDeptManageServiceImpl extends EgovAbstractServiceImpl implements EgovDeptManageService {

	@Resource(name="deptManageDAO")
    private DeptManageDAO deptManageDAO;

	/**
	 * 遺?쒕? 愿由ы븯湲??꾪빐 ?깅줉??遺?쒕ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param deptManageVO - 遺??Vo
	 * @return List - 遺??紐⑸줉
	 *
	 * @param deptManageVO
	 */
	@Override
	public List<DeptManageVO> selectDeptManageList(DeptManageVO deptManageVO) throws Exception {
		return deptManageDAO.selectDeptManageList(deptManageVO);
	}

	/**
	 * 遺?쒕ぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param deptManageVO - 遺??Vo
	 * @return int - 遺??移댁슫????
	 *
	 * @param deptManageVO
	 */
	@Override
	public int selectDeptManageListTotCnt(DeptManageVO deptManageVO) throws Exception {
		return deptManageDAO.selectDeptManageListTotCnt(deptManageVO);
	}

	/**
	 * ?깅줉??遺?쒖쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param deptManageVO - 遺??Vo
	 * @return deptManageVO - 遺??Vo
	 *
	 * @param deptManageVO
	 */
	@Override
	public DeptManageVO selectDeptManage(DeptManageVO deptManageVO) throws Exception {
		return deptManageDAO.selectDeptManage(deptManageVO);
	}

	/**
	 * 遺?쒖젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param deptManageVO - 遺??model
	 *
	 * @param deptManageVO
	 */
	@Override
	public void insertDeptManage(DeptManageVO deptManageVO) throws Exception {
		deptManageDAO.insertDeptManage(deptManageVO);
	}

	/**
	 * 湲??깅줉??遺?쒖젙蹂대? ?섏젙?쒕떎.
	 * @param deptManageVO - 遺??model
	 *
	 * @param deptManageVO
	 */
	@Override
	public void updateDeptManage(DeptManageVO deptManageVO) throws Exception {
		deptManageDAO.updateDeptManage(deptManageVO);
	}

	/**
	 * 湲??깅줉??遺?쒖젙蹂대? ??젣?쒕떎.
	 * @param deptManageVO - 遺??model
	 *
	 * @param deptManageVO
	 */
	@Override
	public void deleteDeptManage(DeptManageVO deptManageVO) throws Exception {
		deptManageDAO.deleteDeptManage(deptManageVO);
	}
}
