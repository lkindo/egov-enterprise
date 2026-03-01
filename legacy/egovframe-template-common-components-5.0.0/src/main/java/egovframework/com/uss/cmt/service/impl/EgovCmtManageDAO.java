package egovframework.com.uss.cmt.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.cmt.service.CmtDefaultVO;
import egovframework.com.uss.cmt.service.CmtManageVO;

/**
 * 異쒗눜洹쇨?由ъ뿉 愿???곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author ?쒖??꾨젅?꾩썙??媛쒕컻?
 * @since 2014.11.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??         ?섏젙??        ?섏젙?댁슜
 *  ----------    ----------    ---------------------------
 *  2014.11.10     媛쒕컻?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("cmtManageDAO")
public class EgovCmtManageDAO extends EgovComAbstractDAO {

	public List<CmtManageVO> selectCmtInfoList(CmtDefaultVO cmtSearchVO) {
		return selectList("cmtManageDAO.selectCmtList_S", cmtSearchVO);
	}

	/**
	* 異쒓렐 湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	* @param cmtManageVO ?낅Т?ъ슜???깅줉?뺣낫
	* @return String result ?깅줉寃곌낵
	*/
	public String insertWrkStartCmtInfo(CmtManageVO cmtManageVO) {
		return Integer.toString(insert("cmtManageDAO.insertWrkStartCmtInfo_S", cmtManageVO));
	}

	/**
	* ?닿렐 湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	* @param cmtManageVO ?낅Т?ъ슜???깅줉?뺣낫
	* @return String result ?깅줉寃곌낵
	*/
	public int insertWrkEndCmtInfo(CmtManageVO cmtManageVO) {
		return update("cmtManageDAO.insertWrkEndCmtInfo_S", cmtManageVO);
	}

	/**
	 * ?닿렐?뺣낫 ?낅젰???꾪븳 異쒓렐?뺣낫 id 議고쉶
	 * @param cmtManageVO
	 * @return String wrktmId
	 */

	public String selectWrktmId(CmtManageVO cmtManageVO) {
		return (String) selectOne("cmtManageDAO.selectWrktmId_S", cmtManageVO);
	}

	/**
	 * ?닿렐?뺣낫 ?낅젰???꾪븳 異쒓렐?뺣낫議고쉶
	 * @param cmtManageVO
	 * @return cmtManageVO
	 */

	public CmtManageVO selectWrkStartInfo(CmtManageVO cmtManageVO) {
		CmtManageVO cmtVO = (CmtManageVO) selectOne("cmtManageDAO.selectWrkStartInfo_S", cmtManageVO);

		return cmtVO;
	}

}
