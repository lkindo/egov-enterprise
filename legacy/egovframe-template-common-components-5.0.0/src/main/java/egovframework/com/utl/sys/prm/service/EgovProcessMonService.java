package egovframework.com.utl.sys.prm.service;

import java.util.List;
import java.util.Map;

/**
 * 媛쒖슂 - PROCESS紐⑤땲?곕쭅?????Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜 - PROCESS紐⑤땲?곕쭅??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎. - PROCESS紐⑤땲?곕쭅??議고쉶湲곕뒫? 紐⑸줉議고쉶,
 * ?곸꽭議고쉶濡?援щ텇?쒕떎.
 *
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 08-9-2010 ?ㅽ썑 3:54:45
 */
public interface EgovProcessMonService {

	/**
	 * ?깅줉??PROCESS紐⑤땲?곕쭅 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param processMonVO - PROCESS紐⑤땲?곕쭅 Vo
	 * @return List - PROCESS紐⑤땲?곕쭅 紐⑸줉
	 *
	 * @param processMonVO
	 */
	public List<ProcessMonVO> selectProcessMonList(ProcessMonVO processMonVO) throws Exception;

	/**
	 * PROCESS紐⑤땲?곕쭅 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 *
	 * @param HttpMonVO - PROCESS紐⑤땲?곕쭅 Vo
	 * @return int - PROCESS紐⑤땲?곕쭅 ?좏깉 移댁슫????
	 *
	 * @param httpMonVO
	 */
	int selectProcessMonTotCnt(ProcessMonVO searchVO) throws Exception;

	/**
	 * ?깅줉??PROCESS紐⑤땲?곕쭅???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param processMonVO - PROCESS紐⑤땲?곕쭅 Vo
	 * @return processMonVO - PROCESS紐⑤땲?곕쭅 Vo
	 *
	 * @param processMonVO
	 */
	ProcessMonVO selectProcessMon(ProcessMonVO processMonVO) throws Exception;

	/**
	 * PROCESS紐⑤땲?곕쭅 ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 *
	 * @param processNm - PROCESS紐⑤땲?곕쭅 model
	 *
	 * @param processNm
	 */
	public void insertProcessMon(ProcessMon processMon) throws Exception;

	/**
	 * 湲??깅줉??PROCESS紐⑤땲?곕쭅 ?뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param processNm - PROCESS紐⑤땲?곕쭅 model
	 *
	 * @param processNm
	 */
	public void updateProcessMon(ProcessMon processMon) throws Exception;

	/**
	 * 湲??깅줉??PROCESS紐⑤땲?곕쭅 ?뺣낫瑜???젣?쒕떎.
	 *
	 * @param processNm - PROCESS紐⑤땲?곕쭅 model
	 *
	 * @param processNm
	 */
	public void deleteProcessMon(ProcessMon processMon) throws Exception;

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param ProcessMonVO - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 VO
	 * @return List<ProcessMonVO> - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 List
	 *
	 * @param processMonVO
	 */
	public Map<String, Object> selectProcessMonLogList(ProcessMonLogVO processMonLogVO) throws Exception;

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param ProcessMonVO - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 model
	 * @return ProcessMonVO - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 model
	 *
	 * @param processMonVO
	 */
	public ProcessMonLogVO selectProcessMonLog(ProcessMonLogVO processMonLogVO) throws Exception;

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅 寃곌낵瑜??섏젙?쒕떎.
	 *
	 * @param ProcessMon - ?꾨줈?몄뒪 紐⑤땲?곕쭅???model
	 *
	 * @param processMon
	 */
	public void updateProcessMonSttus(ProcessMon processMon) throws Exception;

	/**
	 * ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇瑜??깅줉?쒕떎.
	 *
	 * @param ProcessMonLog - ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇 model
	 *
	 * @param processMonLog
	 */
	public void insertProcessMonLog(ProcessMonLog processMonLog) throws Exception;

}
