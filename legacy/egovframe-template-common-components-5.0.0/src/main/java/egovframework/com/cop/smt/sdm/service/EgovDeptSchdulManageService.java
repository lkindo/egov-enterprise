package egovframework.com.cop.smt.sdm.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * 遺?쒖씪?뺢?由щ? 泥섎━?섎뒗 Service Class 援ы쁽
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
 *
 * </pre>
 */
public interface EgovDeptSchdulManageService {

    /**
	 * 遺??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectDeptSchdulManageAuthorGroupPopup(ComDefaultVO searchVO) throws Exception;
    /**
	 * ?꾩씠??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectDeptSchdulManageEmpLyrPopup(ComDefaultVO searchVO) throws Exception;
	
	/**
	 * 硫붿씤?섏씠吏/遺?쒖씪?뺢?由ъ“??
	 * @param map
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectDeptSchdulManageMainList(Map<String, String> map) throws Exception;
	
	/**
	 * 遺?쒖씪??紐⑸줉??議고쉶?쒕떎.
	 * @param map
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectDeptSchdulManageRetrieve(Map<String, String> map) throws Exception;
	
	/**
	 * 遺?쒖씪??紐⑸줉??VO(model)?뺤떇?쇰줈 議고쉶?쒕떎. 
	 * @param deptSchdulManageVO
	 * @return List
	 * @throws Exception
	 */
	public DeptSchdulManageVO selectDeptSchdulManageDetailVO(DeptSchdulManageVO deptSchdulManageVO) throws Exception;

	/**
	 * 遺?쒖씪??紐⑸줉??議고쉶?쒕떎. 
	 * @param searchVO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectDeptSchdulManageList(ComDefaultVO searchVO) throws Exception;
	
	/**
	 *  遺?쒖씪?뺣?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param deptSchdulManageVO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectDeptSchdulManageDetail(DeptSchdulManageVO deptSchdulManageVO) throws Exception;
	
	/**
	 * 遺?쒖씪?뺣?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO
	 * @return int
	 * @throws Exception
	 */
	public int selectDeptSchdulManageListCnt(ComDefaultVO searchVO) throws Exception;
	
	/**
	 * 遺?쒖씪?뺤쓣 ?깅줉?쒕떎.
	 * @param deptSchdulManageVO
	 * @throws Exception
	 */
	void  insertDeptSchdulManage(DeptSchdulManageVO deptSchdulManageVO) throws Exception;
	
	/**
	 * 遺?쒖씪?뺣?(?? ?섏젙?쒕떎.
	 * @param deptSchdulManageVO
	 * @throws Exception
	 */
	void  updateDeptSchdulManage(DeptSchdulManageVO deptSchdulManageVO) throws Exception;
	
	/**
	 * 遺?쒖씪?뺣?(?? ??젣?쒕떎.
	 * @param deptSchdulManageVO
	 * @throws Exception
	 */
	void  deleteDeptSchdulManage(DeptSchdulManageVO deptSchdulManageVO) throws Exception;
	
	
}
