package egovframework.com.utl.sys.htm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.utl.sys.htm.service.HttpMon;
import egovframework.com.utl.sys.htm.service.HttpMonLog;
import egovframework.com.utl.sys.htm.service.HttpMonLogVO;
import egovframework.com.utl.sys.htm.service.HttpMonVO;

/**
 * 媛쒖슂 - HTTP?쒕퉬?ㅻえ?덊꽣留곸뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜 - HTTP?쒕퉬?ㅻえ?덊꽣留곸뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎. - HTTP?쒕퉬?ㅻえ?덊꽣留곸쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶,
 * ?곸꽭議고쉶濡?援щ텇?쒕떎.
 *
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 17-6-2010 ?ㅽ썑 5:12:45
 */
@Repository("HttpMonDAO")
public class HttpMonDAO extends EgovComAbstractDAO {

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return List - HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉
	 *
	 * @param httpMonVO
	 */
	public List<HttpMonVO> selectHttpMonList(HttpMonVO searchVO) throws Exception {
		return selectList("HttpMonDAO.selectHttpMonList", searchVO);
	}

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 *
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return int - HTTP?쒕퉬???좏깉 移댁슫????
	 *
	 * @param httpMonVO
	 */
	public int selectHttpMonTotCnt(HttpMonVO searchVO) throws Exception {
		return (Integer) selectOne("HttpMonDAO.selectHttpMonTotCnt", searchVO);
	}

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留곸쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 *
	 * @param httpMonVO
	 */
	public HttpMon selectHttpMonDetail(HttpMon httpMon) throws Exception {
		return (HttpMon) selectOne("HttpMonDAO.selectHttpMonDetail", httpMon);
	}

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 *
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	public void insertHttpMon(HttpMon httpMon) throws Exception {
		insert("HttpMonDAO.insertHttpMon", httpMon);
	}

	/**
	 * 湲??깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留??뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	public void updateHttpMon(HttpMon httpMon) throws Exception {
		update("HttpMonDAO.updateHttpMon", httpMon);
	}

	/**
	 * 湲??깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留??뺣낫瑜???젣?쒕떎.
	 *
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	public void deleteHttpMon(HttpMon httpMon) throws Exception {
		update("HttpMonDAO.deleteHttpMon", httpMon);
	}

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹?紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return List - HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉
	 *
	 * @param httpMonVO
	 */
	public List<HttpMonLogVO> selectHttpMonLogList(HttpMonLogVO httpMonLogVO) throws Exception {
		return selectList("HttpMonDAO.selectHttpMonLogList", httpMonLogVO);
	}

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 *
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return int - HTTP?쒕퉬???좏깉 移댁슫????
	 *
	 * @param httpMonVO
	 */
	public int selectHttpMonLogTotCnt(HttpMonLogVO httpMonLogVO) throws Exception {
		return (Integer) selectOne("HttpMonDAO.selectHttpMonLogTotCnt", httpMonLogVO);
	}

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹몄쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 *
	 * @param httpMonVO
	 */
	public HttpMonLog selectHttpMonDetailLog(HttpMonLog httpMonLog) throws Exception {
		return (HttpMonLog) selectOne("HttpMonDAO.selectHttpMonDetailLog", httpMonLog);
	}

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 *
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	public void insertHttpMonLog(HttpMonLog httpMonLog) throws Exception {
		insert("HttpMonDAO.insertHttpMonLog", httpMonLog);
	}

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留?寃곌낵 ?뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	public void updateHttpMonSttus(HttpMon httpMon) throws Exception {
		update("HttpMonDAO.updateHttpMonSttus", httpMon);
	}

}
