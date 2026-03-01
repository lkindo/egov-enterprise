package egovframework.com.utl.sys.dbm.service.impl;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.utl.sys.dbm.service.DbMntrng;
import egovframework.com.utl.sys.dbm.service.DbMntrngLog;
import egovframework.com.utl.sys.dbm.service.EgovDbMntrngService;
import jakarta.annotation.Resource;

/**
 * DB?쒕퉬?ㅻえ?덊꽣留곴?由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("egovDbMntrngService")
public class EgovDbMntrngServiceImpl extends EgovAbstractServiceImpl implements EgovDbMntrngService {

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留갆AO
	 */
	@Resource(name = "dbMntrngDao")
	private DbMntrngDao dao;

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ??젣?쒕떎.
	 * @param dbMntrng    ??젣???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	@Override
	public void deleteDbMntrng(DbMntrng dbMntrng)
	  throws Exception{
		dao.deleteDbMntrng(dbMntrng);
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ?깅줉?쒕떎.
	 * @param dbMntrng    ?깅줉???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	@Override
	public void insertDbMntrng(DbMntrng dbMntrng)
	  throws Exception{
		// ?곹깭媛믪쓣 珥덇린移섎줈 ?ㅼ젙?쒕떎.
		dbMntrng.setMntrngSttus("01");
		dao.insertDbMntrng(dbMntrng);
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곷줈洹몃? ?깅줉?쒕떎.
	 * @param dbMntrngLog    ?깅줉???DB?쒕퉬?ㅻえ?덊꽣留곷줈洹퇹odel
	 * @exception Exception Exception
	 */
	@Override
	public void insertDbMntrngLog(DbMntrngLog dbMntrngLog)
	  throws Exception{
		dao.insertDbMntrngLog(dbMntrngLog);
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ?곸꽭議고쉶 ?쒕떎.
	 * @return DB?쒕퉬?ㅻえ?덊꽣留곸젙蹂?
	 *
	 * @param dbMntrng 議고쉶???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	@Override
	public DbMntrng selectDbMntrng(DbMntrng dbMntrng)
	  throws Exception{
		return dao.selectDbMntrng(dbMntrng);
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곷줈洹몄쓣 ?곸꽭議고쉶 ?쒕떎.
	 * @return DB?쒕퉬?ㅻえ?덊꽣留곷줈洹몄젙蹂?
	 *
	 * @param dbMntrng 議고쉶???DB?쒕퉬?ㅻえ?덊꽣留곷줈洹퇹odel
	 * @exception Exception Exception
	 */
	@Override
	public DbMntrngLog selectDbMntrngLog(DbMntrngLog dbMntrngLog)
	  throws Exception{
		return dao.selectDbMntrngLog(dbMntrngLog);
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓽 紐⑸줉??議고쉶 ?쒕떎.
	 * @return DB?쒕퉬?ㅻえ?덊꽣留곷ぉ濡?
	 *
	 * @param searchVO 	議고쉶?뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<DbMntrng> selectDbMntrngList(DbMntrng searchVO)
	  throws Exception{
		List<DbMntrng> result = dao.selectDbMntrngList(searchVO);
		return result;
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectDbMntrngListCnt(DbMntrng searchVO)
	  throws Exception{
		int cnt = dao.selectDbMntrngListCnt(searchVO);
		return cnt;
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곷줈洹몄쓽 紐⑸줉??議고쉶 ?쒕떎.
	 * @return DB?쒕퉬?ㅻえ?덊꽣留곷줈洹몃ぉ濡?
	 *
	 * @param searchVO 	議고쉶?뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<DbMntrngLog> selectDbMntrngLogList(DbMntrngLog searchVO)
	  throws Exception{
		List<DbMntrngLog> result = dao.selectDbMntrngLogList(searchVO);
		return result;
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곷줈洹?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectDbMntrngLogListCnt(DbMntrngLog searchVO)
	  throws Exception{
		int cnt = dao.selectDbMntrngLogListCnt(searchVO);
		return cnt;
	}

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸젙蹂대? ?섏젙?쒕떎.
	 *
	 * @param dbMntrng    ?섏젙???DB?쒕퉬?ㅻえ?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	@Override
	public void updateDbMntrng(DbMntrng dbMntrng)
	  throws Exception{
		dao.updateDbMntrng(dbMntrng);
	}


}
