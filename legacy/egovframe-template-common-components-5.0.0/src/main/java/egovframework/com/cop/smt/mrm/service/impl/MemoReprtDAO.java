package egovframework.com.cop.smt.mrm.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.smt.mrm.service.MemoReprt;
import egovframework.com.cop.smt.mrm.service.MemoReprtVO;
import egovframework.com.cop.smt.mrm.service.ReportrVO;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;

/**
 * 媛쒖슂
 * - 硫붾え蹂닿퀬?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 硫붾え蹂닿퀬??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 硫붾え蹂닿퀬??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 19-7-2010 ?ㅼ쟾 10:14:53
 *  <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("MemoReprtDAO")
public class MemoReprtDAO extends EgovComAbstractDAO {
	
	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 蹂닿퀬?먮? 遺덈윭?⑤떎.
	 * @param ReportrVO
	 * @return List
	 * 
	 * @param reportrVO
	 */
	public List<ReportrVO> selectReportrList(ReportrVO reportrVO) throws Exception{
		return selectList("MemoReprtDAO.selectReportrList", reportrVO);
	}
	
	/**
	 * 蹂닿퀬??紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param ReportrVO
	 * @return int
	 * 
	 * @param reportrVO
	 */
	public int selectReportrListCnt(ReportrVO reportrVO) throws Exception{
		return (Integer)selectOne("MemoReprtDAO.selectReportrListCnt", reportrVO);
	}
	
	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 吏곸쐞紐낆쓣 遺덈윭?⑤떎.
	 * @param DeptVO
	 * @return String
	 * 
	 * @param DeptVO
	 */
	public String selectWrterClsfNm(String wrterId) throws Exception{
		return (String)selectOne("MemoReprtDAO.selectWrterClsfNm", wrterId);
	}
	
	/**
	 * 二쇱뼱吏?議곌굔???곕Ⅸ 硫붾え蹂닿퀬 紐⑸줉??遺덈윭?⑤떎.
	 * @param MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * @return List<MemoReprtVO> - 硫붾え蹂닿퀬 List
	 * 
	 * @param memoReprtVO
	 */
	public List<MemoReprtVO> selectMemoReprtList(MemoReprtVO memoReprtVO) throws Exception{
		//?좎쭨愿??
		memoReprtVO.setSearchBgnDe(memoReprtVO.getSearchBgnDe().replaceAll("-", ""));
		memoReprtVO.setSearchEndDe(memoReprtVO.getSearchEndDe().replaceAll("-", ""));
		
		List<MemoReprtVO> resultList = selectList("MemoReprtDAO.selectMemoReprtList", memoReprtVO);
		for(int i=0; i < resultList.size(); i++){
			MemoReprtVO resultVO = resultList.get(i);
			resultVO.setReprtDe(EgovDateUtil.convertDate(resultVO.getReprtDe(), "0000", "yyyy-MM-dd"));
			resultList.set(i, resultVO);
		}
		return resultList;
	}

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 硫붾え蹂닿퀬瑜?遺덈윭?⑤떎.
	 * @param MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * @return MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * 
	 * @param memoReprtVO
	 */
	public MemoReprtVO selectMemoReprt(MemoReprtVO memoReprtVO) throws Exception{
		MemoReprtVO resultVO = (MemoReprtVO)selectOne("MemoReprtDAO.selectMemoReprt", memoReprtVO);
		resultVO.setReprtDe(EgovDateUtil.convertDate(resultVO.getReprtDe(), "0000", "yyyy-MM-dd"));
		return resultVO;
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫??蹂닿퀬??議고쉶?쇱떆瑜??섏젙?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * 
	 * @param memoReprt
	 */
	public void readMemoReprt(MemoReprt memoReprt) throws Exception{
		update("MemoReprtDAO.readMemoReprt", memoReprt);
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜??섏젙?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * 
	 * @param memoReprt
	 */
	public void updateMemoReprt(MemoReprt memoReprt) throws Exception{
		//?좎쭨愿??
		memoReprt.setReprtDe(EgovStringUtil.isNullToString(memoReprt.getReprtDe()).replaceAll("-", ""));//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		update("MemoReprtDAO.updateMemoReprt", memoReprt);
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫??吏?쒖궗??쓣 ?깅줉?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * 
	 * @param memoReprt
	 */
	public void updateMemoReprtDrctMatter(MemoReprt memoReprt) throws Exception{
		update("MemoReprtDAO.updateMemoReprtDrctMatter", memoReprt);
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜??깅줉?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * 
	 * @param memoReprt
	 */
	public void insertMemoReprt(MemoReprt memoReprt) throws Exception{
		//?좎쭨愿??
		memoReprt.setReprtDe(EgovStringUtil.isNullToString(memoReprt.getReprtDe()).replaceAll("-", ""));//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		insert("MemoReprtDAO.insertMemoReprt", memoReprt);
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜???젣?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 * 
	 * @param memoReprt
	 */
	public void deleteMemoReprt(MemoReprtVO memoReprtVO) throws Exception{
		delete("MemoReprtDAO.deleteMemoReprt", memoReprtVO);
	}

	/**
	 * 硫붾え蹂닿퀬 紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * @return int - 硫붾え蹂닿퀬 紐⑸줉 媛쒖닔
	 * 
	 * @param memoReprtVO
	 */
	public int selectMemoReprtListCnt(MemoReprtVO memoReprtVO) throws Exception{
		//?좎쭨愿??
		memoReprtVO.setSearchBgnDe(memoReprtVO.getSearchBgnDe().replaceAll("-", ""));
		memoReprtVO.setSearchEndDe(memoReprtVO.getSearchEndDe().replaceAll("-", ""));
		
		return (Integer)selectOne("MemoReprtDAO.selectMemoReprtListCnt", memoReprtVO);
	}

}
