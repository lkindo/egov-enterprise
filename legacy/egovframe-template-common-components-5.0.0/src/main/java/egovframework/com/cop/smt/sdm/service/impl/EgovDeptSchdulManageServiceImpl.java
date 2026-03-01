package egovframework.com.cop.smt.sdm.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cop.smt.sdm.service.DeptSchdulManageVO;
import egovframework.com.cop.smt.sdm.service.EgovDeptSchdulManageService;
import jakarta.annotation.Resource;
/**
 * 遺?쒖씪?뺢?由щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
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
@Service("egovDeptSchdulManageService")
public class EgovDeptSchdulManageServiceImpl extends EgovAbstractServiceImpl implements EgovDeptSchdulManageService{

	//
                     private Log log = LogFactory.getLog(this.getClass());

	@Resource(name="deptSchdulManageDao")
	private DeptSchdulManageDao dao;


	@Resource(name="deptSchdulManageIdGnrService")
	private EgovIdGnrService idgenService;

    /**
	 * 遺??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectDeptSchdulManageAuthorGroupPopup(ComDefaultVO searchVO){
		return dao.selectDeptSchdulManageAuthorGroupPopup(searchVO);
	}

    /**
	 * ?꾩씠??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectDeptSchdulManageEmpLyrPopup(ComDefaultVO searchVO){
		return dao.selectDeptSchdulManageEmpLyrPopup(searchVO);
	}

    /**
	 * 遺?쒖씪?뺢?由ъ“??
	 * @param Map(map) - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<EgovMap> selectDeptSchdulManageMainList(Map<String, String> map) throws Exception{
		return dao.selectDeptSchdulManageMainList(map);
	}

    /**
	 * 遺?쒖씪??紐⑸줉??Map(map)?뺤떇?쇰줈 議고쉶?쒕떎.
	 * @param Map(map) - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<EgovMap> selectDeptSchdulManageRetrieve(Map<String, String> map) throws Exception{
		return dao.selectDeptSchdulManageRetrieve(map);
	}

    /**
	 * 遺?쒖씪??紐⑸줉??VO(model)?뺤떇?쇰줈 議고쉶?쒕떎.
	 * @param deptSchdulManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public DeptSchdulManageVO selectDeptSchdulManageDetailVO(DeptSchdulManageVO deptSchdulManageVO) throws Exception{
		return dao.selectDeptSchdulManageDetailVO(deptSchdulManageVO);
	}

    /**
	 * 遺?쒖씪??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<EgovMap> selectDeptSchdulManageList(ComDefaultVO searchVO) throws Exception{
		return dao.selectDeptSchdulManageList(searchVO);
	}

    /**
	 * 遺?쒖씪?뺣?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param DeptSchdulManage - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<EgovMap> selectDeptSchdulManageDetail(DeptSchdulManageVO deptSchdulManageVO) throws Exception{
		return dao.selectDeptSchdulManageDetail(deptSchdulManageVO);
	}

    /**
	 * 遺?쒖씪?뺣?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectDeptSchdulManageListCnt(ComDefaultVO searchVO) throws Exception{


		return dao.selectDeptSchdulManageListCnt(searchVO);
	}

    /**
	 * 遺?쒖씪?뺣?(?? ?깅줉?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception
	 */
	@Override
	public void insertDeptSchdulManage(DeptSchdulManageVO deptSchdulManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();
		deptSchdulManageVO.setSchdulId(sMakeId);

		dao.insertDeptSchdulManage(deptSchdulManageVO);
	}

    /**
	 * 遺?쒖씪?뺣?(?? ?섏젙?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception
	 */
	@Override
	public void updateDeptSchdulManage(DeptSchdulManageVO deptSchdulManageVO) throws Exception{
		dao.updateDeptSchdulManage(deptSchdulManageVO);
	}

    /**
	 * 遺?쒖씪?뺣?(?? ??젣?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception
	 */
	@Override
	public void deleteDeptSchdulManage(DeptSchdulManageVO deptSchdulManageVO) throws Exception{
		dao.deleteDeptSchdulManage(deptSchdulManageVO);
	}
}
