package egovframework.com.uss.sam.ipm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.sam.ipm.service.EgovIndvdlInfoPolicyService;
import egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy;
import jakarta.annotation.Resource;

/**
 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜?泥섎━?섎뒗 ServiceImpl Class 援ы쁽
 *
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see
 *
 *      <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??         ?섏젙??      ?섏젙?댁슜
 *  -----------    --------    ---------------------------
 *   2009.07.03     ?λ룞??      理쒖큹 ?앹꽦
 *
 *      </pre>
 */
@Service("egovIndvdlInfoPolicyService")
public class EgovIndvdlInfoPolicyServiceImpl extends EgovAbstractServiceImpl implements EgovIndvdlInfoPolicyService {

	@Resource(name = "onlineIndvdlInfoPolicyDao")
	private IndvdlInfoPolicyDao dao;

	@Resource(name = "egovIndvdlInfoPolicyIdGnrService")
	private EgovIdGnrService idgenService;

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? 紐⑸줉??議고쉶 ?쒕떎.
	 *
	 * @param OnlinePoll ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectIndvdlInfoPolicyList(ComDefaultVO searchVO) throws Exception {
		return dao.selectIndvdlInfoPolicyList(searchVO);
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 *
	 * @param searchVO 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectIndvdlInfoPolicyListCnt(ComDefaultVO searchVO) throws Exception {
		return dao.selectIndvdlInfoPolicyListCnt(searchVO);
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ?곸꽭議고쉶 ?쒕떎.
	 *
	 * @param searchVO 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public IndvdlInfoPolicy selectIndvdlInfoPolicyDetail(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception {
		return dao.selectIndvdlInfoPolicyDetail(indvdlInfoPolicy);
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ?깅줉?쒕떎.
	 *
	 * @param indvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void insertIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception {
		String sMakeId = idgenService.getNextStringId();
		indvdlInfoPolicy.setIndvdlInfoId(sMakeId);
		dao.insertIndvdlInfoPolicy(indvdlInfoPolicy);
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ?섏젙?쒕떎.
	 *
	 * @param indvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void updateIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception {
		dao.updateIndvdlInfoPolicy(indvdlInfoPolicy);
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ??젣?쒕떎.
	 *
	 * @param indvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void deleteIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception {
		dao.deleteIndvdlInfoPolicy(indvdlInfoPolicy);
	}

}
