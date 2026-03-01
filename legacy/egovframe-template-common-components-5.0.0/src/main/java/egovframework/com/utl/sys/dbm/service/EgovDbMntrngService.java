package egovframework.com.utl.sys.dbm.service;
import java.util.List;


/**
 * DB?쒕퉬?ㅻえ?덊꽣留곴?由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
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
public interface EgovDbMntrngService {

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣  ??젣?쒕떎.
	 *
	 * @param dbMntrng    ??젣???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	public void deleteDbMntrng(DbMntrng dbMntrng)
	  throws Exception;

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ?깅줉?쒕떎.
	 *
	 * @param dbMntrng    ?깅줉???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	public void insertDbMntrng(DbMntrng dbMntrng)
	  throws Exception;

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곷줈洹몃? ?깅줉?쒕떎.
	 *
	 * @param dbMntrngLog    ?깅줉???DB?쒕퉬?ㅻえ?덊꽣留곷줈洹퇹odel
	 * @exception Exception Exception
	 */
	public void insertDbMntrngLog(DbMntrngLog dbMntrngLog)
	  throws Exception;

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣  ?곸꽭議고쉶 ?쒕떎.
	 * @return DB?쒕퉬?ㅻえ?덊꽣留곸젙蹂?
	 *
	 * @param dbMntrng    議고쉶???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	public DbMntrng selectDbMntrng(DbMntrng dbMntrng)
	  throws Exception;

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곷줈洹몃?  ?곸꽭議고쉶 ?쒕떎.
	 * @return DB?쒕퉬?ㅻえ?덊꽣留곷줈洹몄젙蹂?
	 *
	 * @param dbMntrng    議고쉶???DB?쒕퉬?ㅻえ?덊꽣留곷줈洹퇹odel
	 * @exception Exception Exception
	 */
	public DbMntrngLog selectDbMntrngLog(DbMntrngLog dbMntrngLog)
	  throws Exception;

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留?紐⑸줉??議고쉶?쒕떎.
	 * @return DB?쒕퉬?ㅻえ?덊꽣留곷ぉ濡?
	 *
	 * @param searchVO    議고쉶議곌굔VO
	 * @exception Exception Exception
	 */
	public List<DbMntrng> selectDbMntrngList(DbMntrng searchVO)
	  throws Exception;

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectDbMntrngListCnt(DbMntrng searchVO)
	  throws Exception;

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곷줈洹?紐⑸줉??議고쉶?쒕떎.
	 * @return DB?쒕퉬?ㅻえ?덊꽣留곷줈洹몃ぉ濡?
	 *
	 * @param searchVO    議고쉶議곌굔VO
	 * @exception Exception Exception
	 */
	public List<DbMntrngLog> selectDbMntrngLogList(DbMntrngLog searchVO)
	  throws Exception;

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곷줈洹?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectDbMntrngLogListCnt(DbMntrngLog searchVO)
	  throws Exception;

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ?섏젙?쒕떎.
	 *
	 * @param dbMntrng    ?섏젙???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	public void updateDbMntrng(DbMntrng dbMntrng)
	  throws Exception;


}
