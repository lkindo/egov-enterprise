package egovframework.com.utl.sys.trm.service;
import java.util.List;

/**
 * ?≪닔?좊え?덊꽣留곴?由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.21   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public interface EgovTrsmrcvMntrngService {

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣  ??젣?쒕떎.
	 *
	 * @param trsmrcvMntrng    ??젣????≪닔?좊え?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	public void deleteTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng)
	  throws Exception;

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ?깅줉?쒕떎.
	 *
	 * @param trsmrcvMntrng    ?깅줉????≪닔?좊え?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	public void insertTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng)
	  throws Exception;

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹몃? ?깅줉?쒕떎.
	 *
	 * @param trsmrcvMntrngLog    ?깅줉????≪닔?좊え?덊꽣留곷줈洹퇹odel
	 * @exception Exception Exception
	 */
	public void insertTrsmrcvMntrngLog(TrsmrcvMntrngLog trsmrcvMntrngLog)
	  throws Exception;

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣  ?곸꽭議고쉶 ?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곸젙蹂?
	 *
	 * @param trsmrcvMntrng    議고쉶????≪닔?좊え?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	public TrsmrcvMntrng selectTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng)
	  throws Exception;

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹몃?  ?곸꽭議고쉶 ?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곷줈洹몄젙蹂?
	 *
	 * @param trsmrcvMntrngLog    議고쉶????≪닔?좊え?덊꽣留곷줈洹퇹odel
	 * @exception Exception Exception
	 */
	public TrsmrcvMntrngLog selectTrsmrcvMntrngLog(TrsmrcvMntrngLog trsmrcvMntrngLog)
	  throws Exception;

	/**
	 * ?≪닔?좊え?덊꽣留?紐⑸줉??議고쉶?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곷ぉ濡?
	 *
	 * @param searchVO    議고쉶議곌굔VO
	 * @exception Exception Exception
	 */
	public List<TrsmrcvMntrng> selectTrsmrcvMntrngList(TrsmrcvMntrng searchVO)
	  throws Exception;

	/**
	 * ?≪닔?좊え?덊꽣留?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectTrsmrcvMntrngListCnt(TrsmrcvMntrng searchVO)
	  throws Exception;

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹?紐⑸줉??議고쉶?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곷줈洹몃ぉ濡?
	 *
	 * @param searchVO    議고쉶議곌굔VO
	 * @exception Exception Exception
	 */
	public List<TrsmrcvMntrngLog> selectTrsmrcvMntrngLogList(TrsmrcvMntrngLog searchVO)
	  throws Exception;

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectTrsmrcvMntrngLogListCnt(TrsmrcvMntrngLog searchVO)
	  throws Exception;

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ?섏젙?쒕떎.
	 *
	 * @param trsmrcvMntrng    ?섏젙????≪닔?좊え?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	public void updateTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng)
	  throws Exception;

	/**
	 * ?곌퀎?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * @return ?곌퀎?뺣낫紐⑸줉
	 *
	 * @param searchVO    議고쉶議곌굔VO
	 * @exception Exception Exception
	 */
	public List<CntcVO> selectCntcList(CntcVO searchVO)
	  throws Exception;
	/**
	 * ?곌퀎?뺣낫 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectCntcListCnt(CntcVO searchVO)
	  throws Exception;

}
