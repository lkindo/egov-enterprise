package egovframework.com.cop.smt.wmr.service.impl;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cop.smt.wmr.service.EgovWikMnthngReprtService;
import egovframework.com.cop.smt.wmr.service.ReportrVO;
import egovframework.com.cop.smt.wmr.service.WikMnthngReprt;
import egovframework.com.cop.smt.wmr.service.WikMnthngReprtVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * 二쇨컙?붽컙蹂닿퀬?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 二쇨컙?붽컙蹂닿퀬??????깅줉, ?섏젙, ??젣, 議고쉶, ?뱀씤湲곕뒫???쒓났?쒕떎.
 * - 二쇨컙?붽컙蹂닿퀬??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 19-7-2010 ?ㅼ쟾 10:12:47
 *   <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("EgovWikMnthngReprtService")
public class EgovWikMnthngReprtServiceImpl extends EgovAbstractServiceImpl implements EgovWikMnthngReprtService {

	@Resource(name = "WikMnthngReprtDAO")
    private WikMnthngReprtDAO wikMnthngReprtDAO;

	@Resource(name="egovWikMnthngReprtIdGnrService")
	private EgovIdGnrService idgenServiceWikMnthngReprt;

	/**
	 * 蹂닿퀬??紐⑸줉??議고쉶?쒕떎.
	 * @param ReportrVO
	 * @return  Map<String, Object>
	 *
	 * @param reportrVO
	 */
	@Override
	public Map<String, Object> selectReportrList(ReportrVO reportrVO) throws Exception{
		List<ReportrVO> result = wikMnthngReprtDAO.selectReportrList(reportrVO);
		int cnt = wikMnthngReprtDAO.selectReportrListCnt(reportrVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?ъ슜??吏곸쐞紐??뺣낫瑜?議고쉶?쒕떎.
	 * @param String
	 * @return  String
	 *
	 * @param String
	 */
	@Override
	public String selectWrterClsfNm(String wrterId) throws Exception{
		return wikMnthngReprtDAO.selectWrterClsfNm(wrterId);
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 紐⑸줉??議고쉶?쒕떎.
	 * @param WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * @return  List<WikMnthngReprtVO> - 二쇨컙?붽컙蹂닿퀬 List
	 *
	 * @param wikMnthngReprtVO
	 */
	@Override
	public Map<String, Object> selectWikMnthngReprtList(WikMnthngReprtVO wikMnthngReprtVO) throws Exception{
		List<WikMnthngReprtVO> result = wikMnthngReprtDAO.selectWikMnthngReprtList(wikMnthngReprtVO);
		int cnt = wikMnthngReprtDAO.selectWikMnthngReprtListCnt(wikMnthngReprtVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 * @return  WikMnthngReprtVO - 二쇨컙?붽컙蹂닿퀬 VO
	 *
	 * @param wikMnthngReprtVO
	 */
	@Override
	public WikMnthngReprtVO selectWikMnthngReprt(WikMnthngReprtVO wikMnthngReprtVO) throws Exception{

		WikMnthngReprtVO resultVO = wikMnthngReprtDAO.selectWikMnthngReprt(wikMnthngReprtVO);
		if(resultVO.getConfmDt() == null || resultVO.getConfmDt().equals("")){
			String year = resultVO.getFrstRegisterPnttm().substring(0,4);
			String month = resultVO.getFrstRegisterPnttm().substring(4,6);
			String day = resultVO.getFrstRegisterPnttm().substring(6,8);
			String hour = resultVO.getFrstRegisterPnttm().substring(8,10);
			String min = resultVO.getFrstRegisterPnttm().substring(10,12);

			String yymmddhhmm = year + "/" + month + "/" + day + "  " + hour + "??" + min + "遺?;
			resultVO.setReprtSttus("?깅줉 (" + yymmddhhmm + ") ");
		}else{
			String year = resultVO.getConfmDt().substring(0,4);
			String month = resultVO.getConfmDt().substring(4,6);
			String day = resultVO.getConfmDt().substring(6,8);
			String hour = resultVO.getConfmDt().substring(8,10);
			String min = resultVO.getConfmDt().substring(10,12);

			String yymmddhhmm = year + "/" + month + "/" + day + "  " + hour + "??" + min + "遺?;
			resultVO.setReprtSttus("?뱀씤 (" + yymmddhhmm  + ") ");
		}

		return resultVO;
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??섏젙?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 *
	 * @param wikMnthngReprt
	 */
	@Override
	public void updateWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception{
		wikMnthngReprtDAO.updateWikMnthngReprt(wikMnthngReprt);
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??깅줉?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 *
	 * @param wikMnthngReprt
	 */
	@Override
	public void insertWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception{
		wikMnthngReprt.setReprtId(idgenServiceWikMnthngReprt.getNextStringId());
		wikMnthngReprtDAO.insertWikMnthngReprt(wikMnthngReprt);
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜??뱀씤?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 *
	 * @param wikMnthngReprt
	 */
	@Override
	public void confirmWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception{
		java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss", java.util.Locale.KOREA);
		wikMnthngReprt.setConfmDt(formatter.format(new java.util.Date()));
		wikMnthngReprtDAO.confirmWikMnthngReprt(wikMnthngReprt);
	}

	/**
	 * 二쇨컙?붽컙蹂닿퀬 ?뺣낫瑜???젣?쒕떎.
	 * @param WikMnthngReprt - 二쇨컙?붽컙蹂닿퀬 model
	 *
	 * @param wikMnthngReprt
	 */
	@Override
	public void deleteWikMnthngReprt(WikMnthngReprt wikMnthngReprt) throws Exception{
		wikMnthngReprtDAO.deleteWikMnthngReprt(wikMnthngReprt);
	}
}