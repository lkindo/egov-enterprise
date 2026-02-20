package egovframework.com.cop.smt.sdm.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.smt.sdm.service.DeptSchdulManageVO;
/**
 * 遺?쒖씪?뺢?由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  ?λ룞??         理쒖큹 ?앹꽦
 *   2016.08.01  ?λ룞??         ?쒖??꾨젅?꾩썙??v3.6 媛쒖꽑
 *
 * </pre>
 */
@Repository("deptSchdulManageDao")
public class DeptSchdulManageDao extends EgovComAbstractDAO {
	
    /**
	 * 遺??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectDeptSchdulManageAuthorGroupPopup(ComDefaultVO searchVO){
		return selectList("DeptSchdulManage.selectDeptSchdulAuthorGroupPopup", searchVO);
	}

    /**
	 * ?꾩씠??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectDeptSchdulManageEmpLyrPopup(ComDefaultVO searchVO){
		return selectList("DeptSchdulManage.selectDeptSchdulEmpLyrPopup", searchVO);
	}
	
    /**
	 * 遺?쒖씪??紐⑸줉??Map(map)?뺤떇?쇰줈 議고쉶?쒕떎. 
	 * @param Map(map) - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @exception Exception
	 */
	public List<EgovMap> selectDeptSchdulManageMainList(Map<String, String> map) throws Exception{
		 return selectList("DeptSchdulManage.selectDeptSchdulManageMainList", map);
	}
	
    /**
	 * 遺?쒖씪??紐⑸줉??Map(map)?뺤떇?쇰줈 議고쉶?쒕떎. 
	 * @param Map(map) - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @exception Exception
	 */
	public List<EgovMap> selectDeptSchdulManageRetrieve(Map<String, String> map) throws Exception{
		 return selectList("DeptSchdulManage.selectDeptSchdulManageRetrieve", map);
	}
	
	
    /**
	 * 遺?쒖씪??紐⑸줉??VO(model)?뺤떇?쇰줈 議고쉶?쒕떎. 
	 * @param deptSchdulManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return DeptSchdulManageVO
	 * @exception Exception
	 */
	public DeptSchdulManageVO selectDeptSchdulManageDetailVO(DeptSchdulManageVO deptSchdulManageVO) throws Exception{
		return (DeptSchdulManageVO)selectOne("DeptSchdulManage.selectDeptSchdulManageDetailVO", deptSchdulManageVO);
	}
	
    /**
	 * 遺?쒖씪??紐⑸줉??議고쉶?쒕떎. 
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @exception Exception
	 */
	public List<EgovMap> selectDeptSchdulManageList(ComDefaultVO searchVO) throws Exception{
		return selectList("DeptSchdulManage.selectDeptSchdulManage", searchVO);
	}
	
    /**
	 * 遺?쒖씪?뺣?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param deptSchdulManageVO - 遺?쒖씪???뺣낫 ?닿? VO
	 * @return List
	 * @exception Exception
	 */
	public List<EgovMap> selectDeptSchdulManageDetail(DeptSchdulManageVO deptSchdulManageVO) throws Exception{
		return selectList("DeptSchdulManage.selectDeptSchdulManageDetail", deptSchdulManageVO);
	}

    /**
	 * 遺?쒖씪?뺣?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @exception Exception
	 */
	public int selectDeptSchdulManageListCnt(ComDefaultVO searchVO) throws Exception{
		return (Integer)selectOne("DeptSchdulManage.selectDeptSchdulManageCnt", searchVO);
	}
	
    /**
	 * 遺?쒖씪?뺣?(?? ?깅줉?쒕떎.
	 * @param qdeptSchdulManageVO - 遺?쒖씪???뺣낫 ?닿? VO
	 * @exception Exception
	 */
	public void insertDeptSchdulManage(DeptSchdulManageVO deptSchdulManageVO) throws Exception{
		insert("DeptSchdulManage.insertDeptSchdulManage", deptSchdulManageVO);
	}

    /**
	 * 遺?쒖씪?뺣?(?? ?섏젙?쒕떎.
	 * @param deptSchdulManageVO - 遺?쒖씪???뺣낫 ?닿? VO
	 * @exception Exception
	 */
	public void updateDeptSchdulManage(DeptSchdulManageVO deptSchdulManageVO) throws Exception{
		insert("DeptSchdulManage.updateDeptSchdulManage", deptSchdulManageVO);
	}
	
    /**
	 * 遺?쒖씪?뺣?(?? ??젣?쒕떎.
	 * @param deptSchdulManageVO - 遺?쒖씪???뺣낫 ?닿? VO
	 * @exception Exception
	 */
	public void deleteDeptSchdulManage(DeptSchdulManageVO deptSchdulManageVO) throws Exception{
		// ?쇱? ??젣
		delete("DeptSchdulManage.deleteDiaryManage", deptSchdulManageVO);
		// 遺?쒖씪????젣
		delete("DeptSchdulManage.deleteDeptSchdulManage", deptSchdulManageVO);
	}
}
