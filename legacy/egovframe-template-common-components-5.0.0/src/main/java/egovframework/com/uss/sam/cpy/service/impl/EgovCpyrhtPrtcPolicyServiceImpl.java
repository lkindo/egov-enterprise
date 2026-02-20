package egovframework.com.uss.sam.cpy.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.uss.sam.cpy.service.CpyrhtPrtcPolicyDefaultVO;
import egovframework.com.uss.sam.cpy.service.CpyrhtPrtcPolicyVO;
import egovframework.com.uss.sam.cpy.service.EgovCpyrhtPrtcPolicyService;
import jakarta.annotation.Resource;

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
@Service("CpyrhtPrtcPolicyService")
public class EgovCpyrhtPrtcPolicyServiceImpl extends EgovAbstractServiceImpl implements EgovCpyrhtPrtcPolicyService {

	@Resource(name = "CpyrhtPrtcPolicyDAO")
	private CpyrhtPrtcPolicyDAO cpyrhtPrtcPolicyDAO;

	/** ID Generation */
	@Resource(name = "egovCpyrhtPrtcPolicyIdGnrService")
	private EgovIdGnrService idgenService;

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲??議고쉶?쒕떎.
	 *
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
	@Override
	public CpyrhtPrtcPolicyVO selectCpyrhtPrtcPolicyDetail(CpyrhtPrtcPolicyVO vo) throws Exception {
		CpyrhtPrtcPolicyVO resultVO = cpyrhtPrtcPolicyDAO.selectCpyrhtPrtcPolicyDetail(vo);
		if (resultVO == null) {
			throw processException("info.nodata.msg");
		}
		return resultVO;
	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
	@Override
	public List<EgovMap> selectCpyrhtPrtcPolicyList(CpyrhtPrtcPolicyDefaultVO searchVO) throws Exception {
		return cpyrhtPrtcPolicyDAO.selectCpyrhtPrtcPolicyList(searchVO);
	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 *
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
	@Override
	public int selectCpyrhtPrtcPolicyListTotCnt(CpyrhtPrtcPolicyDefaultVO searchVO) {
		return cpyrhtPrtcPolicyDAO.selectCpyrhtPrtcPolicyListTotCnt(searchVO);
	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲???깅줉?쒕떎.
	 *
	 * @param vo
	 * @exception Exception
	 */
	@Override
	public void insertCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception {
		egovLogger.debug(vo.toString());

		String cpyrhtId = idgenService.getNextStringId();

		vo.setCpyrhtId(cpyrhtId);

		cpyrhtPrtcPolicyDAO.insertCpyrhtPrtcPolicyCn(vo);
	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲???섏젙?쒕떎.
	 *
	 * @param vo
	 * @exception Exception
	 */
	@Override
	public void updateCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception {
		egovLogger.debug(vo.toString());

		cpyrhtPrtcPolicyDAO.updateCpyrhtPrtcPolicyCn(vo);
	}

	/**
	 * ??묎텒蹂댄샇?뺤콉 湲????젣?쒕떎.
	 *
	 * @param vo
	 * @exception Exception
	 */
	@Override
	public void deleteCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception {
		egovLogger.debug(vo.toString());

		cpyrhtPrtcPolicyDAO.deleteCpyrhtPrtcPolicyCn(vo);
	}

}
