package egovframework.com.utl.sys.fsm.service;

import java.util.Map;

/**
 * 媛쒖슂
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:26
 */
public interface EgovFileSysMntrngService {

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅???紐⑸줉??議고쉶?쒕떎.
	 * @param FileSysMntrngVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???VO
	 * @return  Map<String, Object> - ?뚯씪?쒖뒪??紐⑤땲?곕쭅 List
	 *
	 * @param fileSysMntrngVO
	 */
	public Map<String, Object> selectFileSysMntrngList(FileSysMntrngVO fileSysMntrngVO) throws Exception;

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓣 議고쉶?쒕떎.
	 * @param FileSysMntrngVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???VO
	 * @return  FileSysMntrngVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???VO
	 *
	 * @param fileSysMntrngVO
	 */
	public FileSysMntrngVO selectFileSysMntrng(FileSysMntrngVO fileSysMntrngVO) throws Exception;

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓣 ?섏젙?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???model
	 *
	 * @param fileSysMntrng
	 */
	public void updateFileSysMntrng(FileSysMntrng fileSysMntrng) throws Exception;

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓣 ?깅줉?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???model
	 *
	 * @param fileSysMntrng
	 */
	public void insertFileSysMntrng(FileSysMntrng fileSysMntrng) throws Exception;

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓣 ??젣?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???model
	 *
	 * @param fileSysMntrng
	 */
	public void deleteFileSysMntrng(FileSysMntrng fileSysMntrng) throws Exception;

	/**
	 * ?뚯씪?쒖뒪?쒖쓽 ?ш린瑜?議고쉶?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???model
	 * @return  int
	 *
	 * @param fileSysMntrng
	 */
	public int selectFileSysMg(FileSysMntrng fileSysMntrng) throws Exception;

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅 寃곌낵瑜??섏젙?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???model
	 *
	 * @param fileSysMntrng
	 */
	public void updateFileSysMntrngSttus(FileSysMntrng fileSysMntrng) throws Exception;

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 紐⑸줉??議고쉶?쒕떎.
	 * @param FileSysMntrngLogVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  Map<String, Object> - ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 List
	 *
	 * @param fileSysMntrngLogVO
	 */
	public Map<String, Object> selectFileSysMntrngLogList(FileSysMntrngLogVO fileSysMntrngLogVO) throws Exception;

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇瑜?議고쉶?쒕떎.
	 * @param FileSysMntrngLogVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  FileSysMntrngLogVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 VO
	 *
	 * @param fileSysMntrngLogVO
	 */
	public FileSysMntrngLogVO selectFileSysMntrngLog(FileSysMntrngLogVO fileSysMntrngLogVO) throws Exception;

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇瑜??깅줉?쒕떎.
	 * @param FileSysMntrngLog - ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 model
	 *
	 * @param fileSysMntrngLog
	 */
	public void insertFileSysMntrngLog(FileSysMntrngLog fileSysMntrngLog) throws Exception;
}
