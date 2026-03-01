package egovframework.com.utl.sys.trm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.utl.sys.trm.service.CntcVO;
import egovframework.com.utl.sys.trm.service.EgovTrsmrcvMntrngService;
import egovframework.com.utl.sys.trm.service.TrsmrcvMntrng;
import egovframework.com.utl.sys.trm.service.TrsmrcvMntrngLog;
import jakarta.annotation.Resource;

/**
 * ?≪닔?좊え?덊꽣留곴?由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("egovTrsmrcvMntrngService")
public class EgovTrsmrcvMntrngServiceImpl extends EgovAbstractServiceImpl implements EgovTrsmrcvMntrngService {

	/**
	 * ?≪닔?좊え?덊꽣留갆AO
	 */
	@Resource(name = "trsmrcvMntrngDao")
	private TrsmrcvMntrngDao dao;

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ??젣?쒕떎.
	 * @param trsmrcvMntrng    ??젣????≪닔?좊え?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	@Override
	public void deleteTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng) throws Exception {
		dao.deleteTrsmrcvMntrng(trsmrcvMntrng);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ?깅줉?쒕떎.
	 * @param trsmrcvMntrng    ?깅줉????≪닔?좊え?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	@Override
	public void insertTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng) throws Exception {
		// ?곹깭媛믪쓣 珥덇린移섎줈 ?ㅼ젙?쒕떎.
		trsmrcvMntrng.setMntrngSttus("01");
		dao.insertTrsmrcvMntrng(trsmrcvMntrng);

	}

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹몃? ?깅줉?쒕떎.
	 * @param trsmrcvMntrng    ?깅줉????≪닔?좊え?덊꽣留곷줈洹퇹odel
	 * @exception Exception Exception
	 */
	@Override
	public void insertTrsmrcvMntrngLog(TrsmrcvMntrngLog trsmrcvMntrngLog) throws Exception {
		// ?곹깭媛믪쓣 珥덇린移섎줈 ?ㅼ젙?쒕떎.
		dao.insertTrsmrcvMntrngLog(trsmrcvMntrngLog);

	}

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ?곸꽭議고쉶 ?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곸젙蹂?
	 *
	 * @param trsmrcvMntrng 議고쉶????≪닔?좊え?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	@Override
	public TrsmrcvMntrng selectTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng) throws Exception {
		return dao.selectTrsmrcvMntrng(trsmrcvMntrng);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹몃? ?곸꽭議고쉶 ?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곷줈洹몄젙蹂?
	 *
	 * @param trsmrcvMntrngLog 議고쉶????≪닔?좊え?덊꽣留곷줈洹퇹odel
	 * @exception Exception Exception
	 */
	@Override
	public TrsmrcvMntrngLog selectTrsmrcvMntrngLog(TrsmrcvMntrngLog trsmrcvMntrngLog) throws Exception {
		return dao.selectTrsmrcvMntrngLog(trsmrcvMntrngLog);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곸쓽 紐⑸줉??議고쉶 ?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곷ぉ濡?
	 *
	 * @param searchVO 	議고쉶?뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<TrsmrcvMntrng> selectTrsmrcvMntrngList(TrsmrcvMntrng searchVO) throws Exception {
		List<TrsmrcvMntrng> result = dao.selectTrsmrcvMntrngList(searchVO);
		return result;
	}

	/**
	 * ?≪닔?좊え?덊꽣留?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectTrsmrcvMntrngListCnt(TrsmrcvMntrng searchVO) throws Exception {
		int cnt = dao.selectTrsmrcvMntrngListCnt(searchVO);
		return cnt;
	}

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹몄쓽 紐⑸줉??議고쉶 ?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곷줈洹몃ぉ濡?
	 *
	 * @param searchVO 	議고쉶?뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<TrsmrcvMntrngLog> selectTrsmrcvMntrngLogList(TrsmrcvMntrngLog searchVO) throws Exception {
		List<TrsmrcvMntrngLog> result = dao.selectTrsmrcvMntrngLogList(searchVO);
		return result;
	}

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectTrsmrcvMntrngLogListCnt(TrsmrcvMntrngLog searchVO) throws Exception {
		int cnt = dao.selectTrsmrcvMntrngLogListCnt(searchVO);
		return cnt;
	}

	/**
	 * ?≪닔?좊え?덊꽣留곸젙蹂대? ?섏젙?쒕떎.
	 *
	 * @param trsmrcvMntrng    ?섏젙????≪닔?좊え?덊꽣留걅odel
	 * @exception Exception Exception
	 */
	@Override
	public void updateTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng) throws Exception {
		dao.updateTrsmrcvMntrng(trsmrcvMntrng);
	}

	/**
	 * ?곌퀎?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * @return ?곌퀎?뺣낫紐⑸줉
	 *
	 * @param searchVO    議고쉶議곌굔VO
	 * @exception Exception Exception
	 */
	@Override
	public List<CntcVO> selectCntcList(CntcVO searchVO) throws Exception {
		List<CntcVO> result = dao.selectCntcList(searchVO);
		return result;
	}

	/**
	 * ?곌퀎?뺣낫 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectCntcListCnt(CntcVO searchVO) throws Exception {
		int cnt = dao.selectCntcListCnt(searchVO);
		return cnt;
	}

}
