package egovframework.com.cop.smt.wmr.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.smt.wmr.service.ReportrVO;
import egovframework.com.cop.smt.wmr.service.WikMnthngReprt;
import egovframework.com.cop.smt.wmr.service.WikMnthngReprtVO;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;

/**
 * 媛쒖슂
 * - 二쇨컙?붽컙蹂닿퀬?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 二쇨컙?붽컙蹂닿퀬??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 二쇨컙?붽컙蹂닿퀬??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 19-7-2010 ?ㅼ쟾 10:12:48
 *   <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("WikMnthngReprtDAO")
public class WikMnthngReprtDAO extends EgovComAbstractDAO {
	
	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 蹂닿퀬?먮? 遺덈윭?⑤떎.
	 * @param ReportrVO
	 * @return List
	 * 
	 * @param reportrVO
	 */	
	public List<ReportrVO> selectReportrList(ReportrVO reportrVO) throws Exception{
		return selectList("WikMnthngReprtDAO.selectReportrList", reportrVO);
	}
	
	/**
	 * 蹂닿퀬??紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param ReportrVO
	 * @return int
	 * 
	 * @param reportrVO
	 */
	public int selectReportrListCnt(ReportrVO reportrVO) throws Exception{
		return (Integer)selectOne("WikMnthngReprtDAO.selectReportrListCnt", reportrVO);
	}
	
	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 吏곸쐞紐낆쓣 遺덈윭?⑤떎.
	 * @param DeptVO
	 * @return String
	 * 
	 * @param DeptVO
	 */
	public String selectWrterClsfNm(String wrterId) throws Exception{
		return (String)selectOne("WikMnthngReprtDAO.selectWrterClsfNm", wrterId);
	}
	
	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 二쇨컙?붽컙蹂닿퀬瑜?遺덈윭?⑤떎.
	 * @param WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * @return List<WikMnthngReprtVO> - 二쇨컙?붽컙蹂닿퀬 List
	 * 
	 * @param wikMnthngReprtVO
	 */
	public List<WikMnthngReprtVO> selectWikMnthngReprtList(WikMnthngReprtVO wikMnthngReprtVO) throws Exception{
		//?좎쭨愿??
		wikMnthngReprtVO.setSearchBgnDe(wikMnthngReprtVO.getSearchBgnDe().replaceAll("-", ""));
		wikMnthngReprtVO.setSearchEndDe(wikMnthngReprtVO.getSearchEndDe().replaceAll("-", ""));
		
		List<WikMnthngReprtVO> resultList = selectList("WikMnthngReprtDAO.selectWikMnthngReprtList", wikMnthngReprtVO);
		for(int i=0; i < resultList.size(); i++){
			WikMnthngReprtVO resultVO = resultList.get(i);
			resultVO.setReprtDe(EgovDateUtil.convertDate(resultVO.getReprtDe(), "0000", "yyyy-MM-dd"));
			resultVO.setReprtBgnDe(EgovDateUtil.convertDate(resultVO.getReprtBgnDe(), "0000", "yyyy-MM-dd"));
			resultVO.setReprtEndDe(EgovDateUtil.convertDate(resultVO.getReprtEndDe(), "0000", "yyyy-MM-dd"));
			resultList.set(i, resultVO);
		}
		return resultList;
	}

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 二쇨컙?붽컙蹂닿퀬 紐⑸줉??遺덈윭?⑤떎.
	 * @param WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * @return WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * 
	 * @param wikMnthngReprtVO
	 */
	public WikMnthngReprtVO selectWikMnthngReprt(WikMnthngReprtVO wikMnthngReprtVO) throws Exception{
		WikMnthngReprtVO resultVO = (WikMnthngReprtVO)selectOne("WikMnthngReprtDAO.selectWikMnthngReprt", wikMnthngReprtVO);
		resultVO.setReprtDe(EgovDateUtil.convertDate(resultVO.getReprtDe(), "0000", "yyyy-MM-dd"));
		resultVO.setReprtBgnDe(EgovDateUtil.convertDate(resultVO.getReprtBgnDe(), "0000", "yyyy-MM-dd"));
		resultVO.setReprtEndDe(EgovDateUtil.convertDate(resultVO.getReprtEndDe(), "0000", "yyyy-MM-dd"));
		return resultVO;
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??섏젙?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * 
	 * @param wikMnthngReprt
	 */
	public void updateWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception{
		//?좎쭨愿??
		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		wikMnthngReprt.setReprtDe(EgovStringUtil.isNullToString(wikMnthngReprt.getReprtDe()).replaceAll("-", ""));
		wikMnthngReprt.setReprtBgnDe(EgovStringUtil.isNullToString(wikMnthngReprt.getReprtBgnDe()).replaceAll("-", ""));
		wikMnthngReprt.setReprtEndDe(EgovStringUtil.isNullToString(wikMnthngReprt.getReprtEndDe()).replaceAll("-", ""));
		update("WikMnthngReprtDAO.updateWikMnthngReprt", wikMnthngReprt);
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??깅줉?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * 
	 * @param wikMnthngReprt
	 */
	public void insertWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception{
		//?좎쭨愿??
		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		wikMnthngReprt.setReprtDe(EgovStringUtil.isNullToString(wikMnthngReprt.getReprtDe()).replaceAll("-", ""));
		wikMnthngReprt.setReprtBgnDe(EgovStringUtil.isNullToString(wikMnthngReprt.getReprtBgnDe()).replaceAll("-", ""));
		wikMnthngReprt.setReprtEndDe(EgovStringUtil.isNullToString(wikMnthngReprt.getReprtEndDe()).replaceAll("-", ""));
		insert("WikMnthngReprtDAO.insertWikMnthngReprt", wikMnthngReprt);
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜???젣?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * 
	 * @param wikMnthngReprt
	 */
	public void deleteWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception{
		delete("WikMnthngReprtDAO.deleteWikMnthngReprt", wikMnthngReprt);
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??뱀씤?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 * 
	 * @param wikMnthngReprt
	 */
	public void confirmWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception{
		update("WikMnthngReprtDAO.confirmWikMnthngReprt", wikMnthngReprt);
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * @return int - 二쇨컙?붽컙蹂닿퀬 紐⑸줉 媛쒖닔
	 * 
	 * @param wikMnthngReprtVO
	 */
	public int selectWikMnthngReprtListCnt(WikMnthngReprtVO wikMnthngReprtVO) throws Exception{
		//?좎쭨愿??
		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		wikMnthngReprtVO.setSearchBgnDe(EgovStringUtil.isNullToString(wikMnthngReprtVO.getSearchBgnDe()).replaceAll("-", ""));
		wikMnthngReprtVO.setSearchEndDe(EgovStringUtil.isNullToString(wikMnthngReprtVO.getSearchEndDe()).replaceAll("-", ""));
		
		return (Integer)selectOne("WikMnthngReprtDAO.selectWikMnthngReprtListCnt", wikMnthngReprtVO);
	}

}