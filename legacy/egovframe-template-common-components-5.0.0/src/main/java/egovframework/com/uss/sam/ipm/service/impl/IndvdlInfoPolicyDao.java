package egovframework.com.uss.sam.ipm.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.sam.ipm.service.IndvdlInfoPolicy;

/**
 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜?泥섎━?섎뒗 Dao Class 援ы쁽
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
@Repository("onlineIndvdlInfoPolicyDao")
public class IndvdlInfoPolicyDao extends EgovComAbstractDAO {

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? 紐⑸줉???쒕떎.
	 * 
	 * @param searchVO 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectIndvdlInfoPolicyList(ComDefaultVO searchVO) throws Exception {
		return selectList("IndvdlInfoPolicy.selectIndvdlInfoPolicy", searchVO);
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * 
	 * @param searchVO 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectIndvdlInfoPolicyListCnt(ComDefaultVO searchVO) throws Exception {
		return (Integer) selectOne("IndvdlInfoPolicy.selectIndvdlInfoPolicyCnt", searchVO);
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * 
	 * @param indvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫媛 ?닿? VO
	 * @return IndvdlInfoPolicy
	 * @throws Exception
	 */
	public IndvdlInfoPolicy selectIndvdlInfoPolicyDetail(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception {
		return (IndvdlInfoPolicy) selectOne("IndvdlInfoPolicy.selectIndvdlInfoPolicyDetail", indvdlInfoPolicy);
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ?깅줉?쒕떎.
	 * 
	 * @param qindvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫媛 ?닿? VO
	 * @throws Exception
	 */
	public void insertIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception {
		insert("IndvdlInfoPolicy.insertIndvdlInfoPolicy", indvdlInfoPolicy);
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ?섏젙?쒕떎.
	 * 
	 * @param indvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫媛 ?닿? VO
	 * @throws Exception
	 */
	public void updateIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception {
		update("IndvdlInfoPolicy.updateIndvdlInfoPolicy", indvdlInfoPolicy);
	}

	/**
	 * 媛쒖씤?뺣낫蹂댄샇?뺤콉瑜??? ??젣?쒕떎.
	 * 
	 * @param indvdlInfoPolicy 媛쒖씤?뺣낫蹂댄샇?뺤콉 ?뺣낫媛 ?닿? VO
	 * @throws Exception
	 */
	public void deleteIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception {
		delete("IndvdlInfoPolicy.deleteIndvdlInfoPolicy", indvdlInfoPolicy);
	}

}
