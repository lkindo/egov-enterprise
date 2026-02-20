package egovframework.com.uss.sam.ipm.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜?泥섎━?섎뒗 Service Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??         ?섏젙??      ?섏젙?댁슜
 *  -----------    --------    ---------------------------
 *   2009.07.03     ?λ룞??      理쒖큹 ?앹꽦
 *
 *      </pre>
 */
public interface EgovIndvdlInfoPolicyService {

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param searchVO 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectIndvdlInfoPolicyList(ComDefaultVO searchVO) throws Exception;

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * 
	 * @param searchVO 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectIndvdlInfoPolicyListCnt(ComDefaultVO searchVO) throws Exception;

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * 
	 * @param indvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public IndvdlInfoPolicy selectIndvdlInfoPolicyDetail(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception;

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ?깅줉?쒕떎.
	 * 
	 * @param indvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void insertIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception;

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ?섏젙?쒕떎.
	 * 
	 * @param indvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void updateIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception;

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ??젣?쒕떎.
	 * 
	 * @param indvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void deleteIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception;

}
