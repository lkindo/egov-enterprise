package egovframework.com.cop.smt.mrm.service.impl;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cop.smt.mrm.service.EgovMemoReprtService;
import egovframework.com.cop.smt.mrm.service.MemoReprt;
import egovframework.com.cop.smt.mrm.service.MemoReprtVO;
import egovframework.com.cop.smt.mrm.service.ReportrVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * 硫붾え蹂닿퀬?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("EgovMemoReprtService")
public class EgovMemoReprtServiceImpl extends EgovAbstractServiceImpl implements EgovMemoReprtService {

	@Resource(name = "MemoReprtDAO")
    private MemoReprtDAO memoReprtDAO;

	@Resource(name="egovMemoReprtIdGnrService")
	private EgovIdGnrService idgenServiceMemoReprt;

	/**
	 * 蹂닿퀬??紐⑸줉??議고쉶?쒕떎.
	 * @param ReportrVO
	 * @return  Map<String, Object>
	 *
	 * @param reportrVO
	 */
	@Override
	public Map<String, Object> selectReportrList(ReportrVO reportrVO) throws Exception{
		List<ReportrVO> result = memoReprtDAO.selectReportrList(reportrVO);
		int cnt = memoReprtDAO.selectReportrListCnt(reportrVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?ъ슜??吏곸쐞紐낆쓣 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param String
	 * @return  String
	 *
	 * @param String
	 */
	@Override
	public String selectWrterClsfNm(String wrterId) throws Exception{
		return memoReprtDAO.selectWrterClsfNm(wrterId);
	}

	/**
	 * 硫붾え蹂닿퀬 紐⑸줉??議고쉶?쒕떎.
	 * @param MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * @return  Map<String, Object> - 硫붾え蹂닿퀬 List
	 *
	 * @param memoReprtVO
	 */
	@Override
	public Map<String, Object> selectMemoReprtList(MemoReprtVO memoReprtVO) throws Exception{
		List<MemoReprtVO> result = memoReprtDAO.selectMemoReprtList(memoReprtVO);
		int cnt = memoReprtDAO.selectMemoReprtListCnt(memoReprtVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param MemoReprtVO - 硫붾え蹂닿퀬 VO
	 * @return  MemoReprtVO - 硫붾え蹂닿퀬 VO
	 *
	 * @param memoReprtVO
	 */
	@Override
	public MemoReprtVO selectMemoReprt(MemoReprtVO memoReprtVO) throws Exception{
		MemoReprtVO resultVO = memoReprtDAO.selectMemoReprt(memoReprtVO);
		if(resultVO.getReportrInqireDt() == null || resultVO.getReportrInqireDt().equals("")){
			resultVO.setReprtSttus("誘명솗??);
		}else{
			String year = resultVO.getReportrInqireDt().substring(0,4);
			String month = resultVO.getReportrInqireDt().substring(4,6);
			String day = resultVO.getReportrInqireDt().substring(6,8);
			String hour = resultVO.getReportrInqireDt().substring(8,10);
			String min = resultVO.getReportrInqireDt().substring(10,12);

			String yymmddhhmm = year + "/" + month + "/" + day + "  " + hour + "??" + min + "遺?;
			resultVO.setReprtSttus("?뺤씤 (" + yymmddhhmm  + ") ");
		}

		return resultVO;
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫??蹂닿퀬??議고쉶?쇱떆瑜??섏젙?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 *
	 * @param memoReprt
	 */
	@Override
	public void readMemoReprt(MemoReprt memoReprt) throws Exception{
		java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss", java.util.Locale.KOREA);
		memoReprt.setReportrInqireDt(formatter.format(new java.util.Date()));
		memoReprtDAO.readMemoReprt(memoReprt);
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜??섏젙?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 *
	 * @param memoReprt
	 */
	@Override
	public void updateMemoReprt(MemoReprt memoReprt) throws Exception{
		memoReprtDAO.updateMemoReprt(memoReprt);
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫??吏?쒖궗??쓣 ?깅줉?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 *
	 * @param memoReprt
	 */
	@Override
	public void updateMemoReprtDrctMatter(MemoReprt memoReprt) throws Exception{
		java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss", java.util.Locale.KOREA);
		memoReprt.setDrctMatterRegistDt(formatter.format(new java.util.Date()));
		memoReprtDAO.updateMemoReprtDrctMatter(memoReprt);
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜??깅줉?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 *
	 * @param memoReprt
	 */
	@Override
	public void insertMemoReprt(MemoReprt memoReprt) throws Exception{
		memoReprt.setReprtId(idgenServiceMemoReprt.getNextStringId());
		memoReprtDAO.insertMemoReprt(memoReprt);
	}

	/**
	 * 硫붾え蹂닿퀬 ?뺣낫瑜???젣?쒕떎.
	 * @param MemoReprt - 硫붾え蹂닿퀬 model
	 *
	 * @param memoReprt
	 */
	@Override
	public void deleteMemoReprt(MemoReprtVO memoReprtVO) throws Exception{
		memoReprtDAO.deleteMemoReprt(memoReprtVO);
	}

}