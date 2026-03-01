package egovframework.com.utl.sys.nsm.service.impl;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.utl.sys.nsm.service.EgovNtwrkSvcMntrngService;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrng;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngLog;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngLogVO;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:43
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??           ?섏젙??          ?섏젙?댁슜
 *  ----------  --------   ---------------------------
 *  2010.06.28  ?μ쿋??          理쒖큹 ?앹꽦
 *  2020.06.25	?좎슜??    ?ㅼ?以꾨윭 ?ㅽ뻾???ㅻ쪟 ?섏젙
 *  </pre>

 *
 */
@Service("EgovNtwrkSvcMntrngService")
public class EgovNtwrkSvcMntrngServiceImpl extends EgovAbstractServiceImpl implements EgovNtwrkSvcMntrngService {

	@Resource(name = "NtwrkSvcMntrngDAO")
    private NtwrkSvcMntrngDAO ntwrkSvcMntrngDAO;

	@Resource(name="egovNtwrkSvcMntrngLogIdGnrService")
	private EgovIdGnrService idgenServiceNtwrkSvcMntrng;
	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???紐⑸줉??議고쉶?쒕떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???VO
	 * @return  Map<String, Object> - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 List
	 *
	 * @param ntwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???VO
	 */
	@Override
	public Map<String, Object> selectNtwrkSvcMntrngList(NtwrkSvcMntrngVO ntwrkSvcMntrngVO) throws Exception{
		List<NtwrkSvcMntrngVO> result = ntwrkSvcMntrngDAO.selectNtwrkSvcMntrngList(ntwrkSvcMntrngVO);
		int cnt = ntwrkSvcMntrngDAO.selectNtwrkSvcMntrngListCnt(ntwrkSvcMntrngVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸쓣 議고쉶?쒕떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???VO
	 * @return  NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???VO
	 *
	 * @param ntwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???VO
	 */
	@Override
	public NtwrkSvcMntrngVO selectNtwrkSvcMntrng(NtwrkSvcMntrngVO ntwrkSvcMntrngVO) throws Exception{
		return ntwrkSvcMntrngDAO.selectNtwrkSvcMntrng(ntwrkSvcMntrngVO);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸쓣 ?섏젙?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 *
	 * @param ntwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 */
	@Override
	public void updateNtwrkSvcMntrng(NtwrkSvcMntrng ntwrkSvcMntrng) throws Exception{
		ntwrkSvcMntrngDAO.updateNtwrkSvcMntrng(ntwrkSvcMntrng);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸쓣 ?깅줉?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 *
	 * @param ntwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 */
	@Override
	public void insertNtwrkSvcMntrng(NtwrkSvcMntrng ntwrkSvcMntrng) throws Exception{
		ntwrkSvcMntrng.setMntrngSttus("01");
		ntwrkSvcMntrngDAO.insertNtwrkSvcMntrng(ntwrkSvcMntrng);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸쓣 ?깅줉?섍린 ?꾪븳 以묐났 議고쉶瑜??섑뻾?쒕떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???VO
	 * @return  int
	 *
	 * @param ntwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???VO
	 */
	@Override
	public int selectNtwrkSvcMntrngCheck(NtwrkSvcMntrngVO ntwrkSvcMntrngVO) throws Exception{
		return ntwrkSvcMntrngDAO.selectNtwrkSvcMntrngCheck(ntwrkSvcMntrngVO);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸쓣 ??젣?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 *
	 * @param ntwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 */
	@Override
	public void deleteNtwrkSvcMntrng(NtwrkSvcMntrng ntwrkSvcMntrng) throws Exception{
		ntwrkSvcMntrngDAO.deleteNtwrkSvcMntrng(ntwrkSvcMntrng);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 寃곌낵瑜??섏젙?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 *
	 * @param ntwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 */
	@Override
	public void updateNtwrkSvcMntrngSttus(NtwrkSvcMntrng ntwrkSvcMntrng) throws Exception{
		ntwrkSvcMntrngDAO.updateNtwrkSvcMntrngSttus(ntwrkSvcMntrng);

		NtwrkSvcMntrngLog ntwrkSvcMntrngLog = new NtwrkSvcMntrngLog();
		ntwrkSvcMntrngLog.setLogId(idgenServiceNtwrkSvcMntrng.getNextStringId());
		ntwrkSvcMntrngLog.setSysIp(ntwrkSvcMntrng.getSysIp());
		ntwrkSvcMntrngLog.setSysPort(ntwrkSvcMntrng.getSysPort());
		ntwrkSvcMntrngLog.setSysNm(ntwrkSvcMntrng.getSysNm());
		ntwrkSvcMntrngLog.setMntrngSttus(ntwrkSvcMntrng.getMntrngSttus());
		ntwrkSvcMntrngLog.setLogInfo(ntwrkSvcMntrng.getLogInfo());
		ntwrkSvcMntrngLog.setCreatDt(ntwrkSvcMntrng.getCreatDt());
		insertNtwrkSvcMntrngLog(ntwrkSvcMntrngLog);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 紐⑸줉??議고쉶?쒕떎.
	 * @param NtwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  Map<String, Object> - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 List
	 *
	 * @param ntwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 VO
	 */
	@Override
	public Map<String, Object> selectNtwrkSvcMntrngLogList(NtwrkSvcMntrngLogVO ntwrkSvcMntrngLogVO) throws Exception{
		List<NtwrkSvcMntrngLogVO> result = ntwrkSvcMntrngDAO.selectNtwrkSvcMntrngLogList(ntwrkSvcMntrngLogVO);
		int cnt = ntwrkSvcMntrngDAO.selectNtwrkSvcMntrngLogListCnt(ntwrkSvcMntrngLogVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇瑜?議고쉶?쒕떎.
	 * @param NtwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  NtwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 VO
	 *
	 * @param ntwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 VO
	 */
	@Override
	public NtwrkSvcMntrngLogVO selectNtwrkSvcMntrngLog(NtwrkSvcMntrngLogVO ntwrkSvcMntrngLogVO) throws Exception{
		return ntwrkSvcMntrngDAO.selectNtwrkSvcMntrngLog(ntwrkSvcMntrngLogVO);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇瑜??깅줉?쒕떎.
	 * @param NtwrkSvcMntrngLog - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 model
	 *
	 * @param ntwrkSvcMntrngLog - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 model
	 */
	@Override
	public void insertNtwrkSvcMntrngLog(NtwrkSvcMntrngLog ntwrkSvcMntrngLog) throws Exception{
		ntwrkSvcMntrngLog.setLastUpdusrId("Logger");
		ntwrkSvcMntrngDAO.insertNtwrkSvcMntrngLog(ntwrkSvcMntrngLog);
	}
}
