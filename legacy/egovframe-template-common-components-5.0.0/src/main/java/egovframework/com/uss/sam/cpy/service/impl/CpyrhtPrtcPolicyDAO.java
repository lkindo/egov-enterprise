package egovframework.com.uss.sam.cpy.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.sam.cpy.service.CpyrhtPrtcPolicyDefaultVO;
import egovframework.com.uss.sam.cpy.service.CpyrhtPrtcPolicyVO;

/**
 *
 * ??묎텒蹂댄샇?뺤콉?댁슜??泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??         ?섏젙??      ?섏젙?댁슜
 *  -----------    --------    ---------------------------
 *   2009.04.01     諛뺤젙洹?      理쒖큹 ?앹꽦
 *
 *      </pre>
 */
@Repository("CpyrhtPrtcPolicyDAO")
public class CpyrhtPrtcPolicyDAO extends EgovComAbstractDAO {

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲 紐⑸줉??????곸꽭?댁슜??議고쉶?쒕떎.
	 * 
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
	public CpyrhtPrtcPolicyVO selectCpyrhtPrtcPolicyDetail(CpyrhtPrtcPolicyVO vo) throws Exception {

		return (CpyrhtPrtcPolicyVO) selectOne("CpyrhtPrtcPolicyDAO.selectCpyrhtPrtcPolicyDetail", vo);

	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
	public List<EgovMap> selectCpyrhtPrtcPolicyList(CpyrhtPrtcPolicyDefaultVO searchVO) throws Exception {

		return selectList("CpyrhtPrtcPolicyDAO.selectCpyrhtPrtcPolicyList", searchVO);

	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
	public int selectCpyrhtPrtcPolicyListTotCnt(CpyrhtPrtcPolicyDefaultVO searchVO) {

		return (Integer) selectOne("CpyrhtPrtcPolicyDAO.selectCpyrhtPrtcPolicyListTotCnt", searchVO);

	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲???깅줉?쒕떎.
	 * 
	 * @param vo
	 * @exception Exception
	 */
	public void insertCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception {

		insert("CpyrhtPrtcPolicyDAO.insertCpyrhtPrtcPolicyCn", vo);

	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲???섏젙?쒕떎.
	 * 
	 * @param vo
	 * @exception Exception
	 */
	public void updateCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception {

		update("CpyrhtPrtcPolicyDAO.updateCpyrhtPrtcPolicyCn", vo);

	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲????젣?쒕떎.
	 * 
	 * @param vo
	 * @exception Exception
	 */
	public void deleteCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception {

		delete("CpyrhtPrtcPolicyDAO.deleteCpyrhtPrtcPolicyCn", vo);

	}

}
