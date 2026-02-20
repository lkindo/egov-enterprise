package egovframework.com.utl.sys.htm.service;

import java.util.List;
import java.util.Map;

/**
 * 媛쒖슂 - HTTP?쒕퉬??紐⑤땲?곕쭅?????Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜 - HTTP?쒕퉬??紐⑤땲?곕쭅??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎. - HTTP?쒕퉬??紐⑤땲?곕쭅??議고쉶湲곕뒫? 紐⑸줉議고쉶,
 * ?곸꽭議고쉶濡?援щ텇?쒕떎.
 *
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 17-6-2010 ?ㅽ썑 5:12:43
 */
public interface EgovHttpMonService {

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return List - HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉
	 *
	 * @param httpMonVO
	 */
	public List<HttpMonVO> selectHttpMonList(HttpMonVO searchVO) throws Exception;

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 *
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return int - HTTP?쒕퉬???좏깉 移댁슫????
	 *
	 * @param httpMonVO
	 */
	int selectHttpMonTotCnt(HttpMonVO searchVO) throws Exception;

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留곸쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 *
	 * @param httpMonVO
	 */
	HttpMon selectHttpMonDetail(HttpMon httpMon) throws Exception;

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 *
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	void insertHttpMon(HttpMon httpMon) throws Exception;

	/**
	 * 湲??깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留??뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	void updateHttpMon(HttpMon httpMon) throws Exception;

	/**
	 * 湲??깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留??뺣낫瑜???젣?쒕떎.
	 *
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	void deleteHttpMon(HttpMon httpMon) throws Exception;

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹?紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return List - HTTP?쒕퉬?ㅻえ?덊꽣留?紐⑸줉
	 *
	 * @param httpMonVO
	 */
	public Map<String, Object> selectHttpMonLogList(HttpMonLogVO httpMonLogVO) throws Exception;

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 *
	 * @param HttpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return int - HTTP?쒕퉬???좏깉 移댁슫????
	 *
	 * @param httpMonVO
	 */
	// int selectHttpMonLogTotCnt(HttpMonLogVO searchVO) throws Exception;

	/**
	 * ?깅줉??HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹몄쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 * @return httpMonVO - HTTP?쒕퉬?ㅻえ?덊꽣留?Vo
	 *
	 * @param httpMonVO
	 */
	HttpMonLog selectHttpMonDetailLog(HttpMonLog httpMonLog) throws Exception;

	/**
	 * HTTP?쒕퉬?ㅻえ?덊꽣留곷줈洹??뺣낫瑜??깅줉?쒕떎.
	 *
	 * @param siteUrl - HTTP?쒕퉬?ㅻえ?덊꽣留?model
	 *
	 * @param siteUrl
	 */
	void insertHttpMonLog(HttpMonLog httpMonLog) throws Exception;

	/**
	 * HTTP?쒕퉬??紐⑤땲?곕쭅 寃곌낵瑜??섏젙?쒕떎.
	 *
	 * @param HttpMon - HTTP?쒕퉬??紐⑤땲?곕쭅???model
	 *
	 * @param httpMon
	 */
	public void updateHttpMonSttus(HttpMon httpMon) throws Exception;

}
