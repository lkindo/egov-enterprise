package egovframework.com.uss.umt.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.umt.service.DeptManageVO;

@Repository("deptManageDAO")
public class DeptManageDAO extends EgovComAbstractDAO {

	/**
	 * 遺?쒕? 愿由ы븯湲??꾪빐 ?깅줉??遺?쒕ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param deptManageVO - 遺??Vo
	 * @return List - 遺??紐⑸줉
	 * @exception Exception
	 */
	public List<DeptManageVO> selectDeptManageList(DeptManageVO deptManageVO) throws Exception {
		return selectList("deptManageDAO.selectDeptManageList", deptManageVO);
	}

    /**
	 * 遺?쒕ぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param deptManageVO - 遺??Vo
	 * @return int - 遺??移댁슫????
	 * @exception Exception
	 */
    public int selectDeptManageListTotCnt(DeptManageVO deptManageVO) throws Exception {
        return (Integer)selectOne("deptManageDAO.selectDeptManageListTotCnt", deptManageVO);
    }

	/**
	 * ?깅줉??遺?쒖쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param deptManageVO - 遺??Vo
	 * @return deptManageVO - 遺??Vo
	 *
	 * @param bannerVO
	 */
	public DeptManageVO selectDeptManage(DeptManageVO deptManageVO) throws Exception {
		return (DeptManageVO) selectOne("deptManageDAO.selectDeptManage", deptManageVO);
	}

	/**
	 * 遺?쒖젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param deptManageVO - 遺??model
	 */
	public void insertDeptManage(DeptManageVO deptManageVO) throws Exception {
		insert("deptManageDAO.insertDeptManage", deptManageVO);
	}

	/**
	 * 湲??깅줉??遺?쒖젙蹂대? ?섏젙?쒕떎.
	 * @param deptManageVO - 遺??model
	 */
	public void updateDeptManage(DeptManageVO deptManageVO) throws Exception {
        update("deptManageDAO.updateDeptManage", deptManageVO);
	}

	/**
	 * 湲??깅줉??遺?쒖젙蹂대? ??젣?쒕떎.
	 * @param deptManageVO - 遺??model
	 *
	 * @param banner
	 */
	public void deleteDeptManage(DeptManageVO deptManageVO) throws Exception {
		delete("deptManageDAO.deleteDeptManage", deptManageVO);
	}

}
