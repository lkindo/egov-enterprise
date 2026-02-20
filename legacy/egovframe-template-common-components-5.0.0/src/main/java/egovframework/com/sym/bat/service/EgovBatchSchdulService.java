package egovframework.com.sym.bat.service;

import java.util.List;

/**
 * 諛곗튂?ㅼ?以꾧?由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.17   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public interface EgovBatchSchdulService {

	/**
	 * 諛곗튂?ㅼ?以꾩쓣  ??젣?쒕떎.
	 *
	 * @param batchSchdul    ??젣???諛곗튂?ㅼ?以꼖odel
	 * @exception Exception Exception
	 */
	public void deleteBatchSchdul(BatchSchdul batchSchdul) throws Exception;

	/**
	 * 諛곗튂?ㅼ?以꾩쓣 ?깅줉?쒕떎.
	 *
	 * @param batchSchdul    ?깅줉???諛곗튂?ㅼ?以꼖odel
	 * @exception Exception Exception
	 */
	public void insertBatchSchdul(BatchSchdul batchSchdul) throws Exception;

	/**
	 * 諛곗튂?ㅼ?以꾩쓣  ?곸꽭議고쉶 ?쒕떎.
	 * @return 諛곗튂?ㅼ?以꾩젙蹂?
	 *
	 * @param batchSchdul    議고쉶???諛곗튂?ㅼ?以꼖odel
	 * @exception Exception Exception
	 */
	public BatchSchdul selectBatchSchdul(BatchSchdul batchSchdul) throws Exception;

	/**
	 * 諛곗튂?ㅼ?以?紐⑸줉??議고쉶?쒕떎.
	 * @return 諛곗튂?ㅼ?以꾨ぉ濡?
	 *
	 * @param searchVO    議고쉶議곌굔VO
	 * @exception Exception Exception
	 */
	public List<BatchSchdul> selectBatchSchdulList(BatchSchdul searchVO) throws Exception;

	/**
	 * 諛곗튂?ㅼ?以?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectBatchSchdulListCnt(BatchSchdul searchVO) throws Exception;

	/**
	 * 諛곗튂?ㅼ?以꾩쓣 ?섏젙?쒕떎.
	 *
	 * @param batchSchdul    ?섏젙???諛곗튂?ㅼ?以꼖odel
	 * @exception Exception Exception
	 */
	public void updateBatchSchdul(BatchSchdul batchSchdul) throws Exception;

	/**
	 * 諛곗튂寃곌낵瑜??깅줉?쒕떎.
	 * @param batchResult    ?깅줉???諛곗튂寃곌낵model
	 * @exception Exception Exception
	 */
	public void insertBatchResult(BatchResult batchResult) throws Exception;

	/**
	 * 諛곗튂寃곌낵?뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param batchResult    ?섏젙???諛곗튂寃곌낵model
	 * @exception Exception Exception
	 */
	public void updateBatchResult(BatchResult batchResult) throws Exception;

}