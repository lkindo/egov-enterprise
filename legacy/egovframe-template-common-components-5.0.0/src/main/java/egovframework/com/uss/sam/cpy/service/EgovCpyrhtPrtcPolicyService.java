package egovframework.com.uss.sam.cpy.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * ??묎텒蹂댄샇?뺤콉?댁슜??泥섎━?섎뒗 ?쒕퉬???대옒??
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
public interface EgovCpyrhtPrtcPolicyService {

	/**
	 * ??묎텒蹂댄샇?뺤콉?댁슜 湲??議고쉶?쒕떎.
	 * 
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
	CpyrhtPrtcPolicyVO selectCpyrhtPrtcPolicyDetail(CpyrhtPrtcPolicyVO vo) throws Exception;

	/**
	 * ??묎텒蹂댄샇?뺤콉?댁슜 湲 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
	List<EgovMap> selectCpyrhtPrtcPolicyList(CpyrhtPrtcPolicyDefaultVO searchVO) throws Exception;

	/**
	 * ??묎텒蹂댄샇?뺤콉?댁슜 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
	int selectCpyrhtPrtcPolicyListTotCnt(CpyrhtPrtcPolicyDefaultVO searchVO);

	/**
	 * ??묎텒蹂댄샇?뺤콉?댁슜 湲???깅줉?쒕떎.
	 * 
	 * @param vo
	 * @exception Exception
	 */
	void insertCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception;

	/**
	 * ??묎텒蹂댄샇?뺤콉?댁슜 湲???섏젙?쒕떎.
	 * 
	 * @param vo
	 * @exception Exception
	 */
	void updateCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception;

	/**
	 * ??묎텒蹂댄샇?뺤콉?댁슜 湲????젣?쒕떎.
	 * 
	 * @param vo
	 * @exception Exception
	 */
	void deleteCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception;

}
