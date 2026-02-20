package egovframework.com.utl.sys.htm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.utl.sys.htm.service.EgovHttpMonService;
import egovframework.com.utl.sys.htm.service.HttpMon;
import egovframework.com.utl.sys.htm.service.HttpMonLog;
import egovframework.com.utl.sys.htm.service.HttpMonLogVO;
import egovframework.com.utl.sys.htm.service.HttpMonVO;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂 - HTTP?쒕퉬?ㅻえ?덊꽣留곸뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜 - HTTP?쒕퉬?ㅻえ?덊꽣留곸뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎. - HTTP?쒕퉬?ㅻえ?덊꽣留곸쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶,
 * ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author 諛뺤쥌??
 * @since 2010.06.17
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.17  諛뺤쥌??         理쒖큹 ?앹꽦
 *   2025.09.13  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
@Service("EgovHttpMonService")
public class EgovHttpMonServiceImpl extends EgovAbstractServiceImpl implements EgovHttpMonService {

	@Resource(name = "HttpMonDAO")
	private HttpMonDAO httpMonDAO;

	/** ID Generation */
	@Resource(name = "egovHttpManageIdGnrService")
	private EgovIdGnrService idgenService;

	/** ID Generation */
	@Resource(name = "egovHttpLogManageIdGnrService")
	private EgovIdGnrService idgenServiceLog;

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return List - HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉
	 *
	 * @param httpMonVO
	 */
	@Override
	public List<HttpMonVO> selectHttpMonList(HttpMonVO searchVO) throws Exception {
		return httpMonDAO.selectHttpMonList(searchVO);
	}

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return int - HTTP?쒕퉬???좏깉 移댁슫????
	 *
	 * @param httpMonVO
	 */
	@Override
	public int selectHttpMonTotCnt(HttpMonVO searchVO) throws Exception {
		return httpMonDAO.selectHttpMonTotCnt(searchVO);
	}

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留곸쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 *
	 * @param httpMonVO
	 */
	@Override
	public HttpMon selectHttpMonDetail(HttpMon httpMon) throws Exception {
		HttpMon ret = httpMonDAO.selectHttpMonDetail(httpMon);
		return ret;
	}

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	@Override
	public void insertHttpMon(HttpMon httpMon) throws Exception {
		httpMon.setSysId(idgenService.getNextStringId());
		httpMonDAO.insertHttpMon(httpMon);
	}

	/**
	 * 湲??깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留??뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	@Override
	public void updateHttpMon(HttpMon httpMon) throws Exception {
		httpMonDAO.updateHttpMon(httpMon);
	}

	/**
	 * 湲??깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留??뺣낫瑜???젣?쒕떎.
	 * 
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	@Override
	public void deleteHttpMon(HttpMon httpMon) throws Exception {
		httpMonDAO.deleteHttpMon(httpMon);
	}

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return List - HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉
	 *
	 * @param httpMonVO
	 */
	@Override
	public Map<String, Object> selectHttpMonLogList(HttpMonLogVO httpMonLogVO) throws Exception {

		List<HttpMonLogVO> result = httpMonDAO.selectHttpMonLogList(httpMonLogVO);
		int cnt = httpMonDAO.selectHttpMonLogTotCnt(httpMonLogVO);

		Map<String, Object> map = new HashMap<String, Object>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;

	}

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹몄쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 *
	 * @param httpMonVO
	 */
	@Override
	public HttpMonLog selectHttpMonDetailLog(HttpMonLog httpMonLog) throws Exception {
		return httpMonDAO.selectHttpMonDetailLog(httpMonLog);
	}

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹??뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	@Override
	public void insertHttpMonLog(HttpMonLog httpMonLog) throws Exception {
		httpMonDAO.insertHttpMonLog(httpMonLog);
	}

	/**
	 * HTTP?쒕퉬??紐⑤땲?곕쭅 寃곌낵瑜??섏젙?쒕떎.
	 * 
	 * @param httpMonLog - HTTP?쒕퉬??紐⑤땲?곕쭅???model
	 *
	 * @param httpMonLog
	 */
	@Override
	public void updateHttpMonSttus(HttpMon httpMon) throws Exception {
		httpMonDAO.updateHttpMonSttus(httpMon);

		HttpMonLog httpMonLog = new HttpMonLog();
		httpMonLog.setSysId(httpMon.getSysId());
		httpMonLog.setLogId(idgenServiceLog.getNextStringId());
		httpMonLog.setWebKind(httpMon.getWebKind());
		httpMonLog.setSiteUrl(httpMon.getSiteUrl());
		httpMonLog.setHttpSttusCd(httpMon.getHttpSttusCd());
		httpMonLog.setCreatDt(httpMon.getCreatDt());
		httpMonLog.setLogInfo(httpMon.getLogInfo());
		httpMonLog.setMngrNm(httpMon.getMngrNm());
		httpMonLog.setMngrEmailAddr(httpMon.getMngrEmailAddr());
		httpMonLog.setFrstRegisterId(httpMon.getFrstRegisterId());
		httpMonLog.setFrstRegisterPnttm(httpMon.getFrstRegisterPnttm());
		httpMonLog.setLastUpdusrId(httpMon.getLastUpdusrId());
		insertHttpMonLog(httpMonLog);
	}

}
