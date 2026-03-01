package egovframework.com.utl.sys.trm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.utl.sys.trm.service.CntcVO;
import egovframework.com.utl.sys.trm.service.TrsmrcvMntrng;
import egovframework.com.utl.sys.trm.service.TrsmrcvMntrngLog;

/**
 * ?≪닔?좊え?덊꽣留곴?由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Repository("trsmrcvMntrngDao")
public class TrsmrcvMntrngDao extends EgovComAbstractDAO {

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ??젣?쒕떎.
	 *
	 * @param trsmrcvMntrng    ??젣???≪닔?좊え?덊꽣留?VO
	 * @exception Exception Exception
	 */
	public void deleteTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng) throws Exception {
		delete("TrsmrcvMntrngDao.deleteTrsmrcvMntrng", trsmrcvMntrng);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곸쓣 ?깅줉?쒕떎.
	 *
	 * @param trsmrcvMntrng ??ν븷 ?≪닔?좊え?덊꽣留?VO
	 * @exception Exception Exception
	 */
	public void insertTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng) throws Exception {
		insert("TrsmrcvMntrngDao.insertTrsmrcvMntrng", trsmrcvMntrng);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹몃? ?깅줉?쒕떎.
	 *
	 * @param trsmrcvMntrngLog ??ν븷 ?≪닔?좊え?덊꽣留곷줈洹?VO
	 * @exception Exception Exception
	 */
	public void insertTrsmrcvMntrngLog(TrsmrcvMntrngLog trsmrcvMntrngLog) throws Exception {
		insert("TrsmrcvMntrngDao.insertTrsmrcvMntrngLog", trsmrcvMntrngLog);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곸젙蹂대? ?곸꽭議고쉶 ?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곸젙蹂?
	 *
	 * @param trsmrcvMntrng    議고쉶??KEY媛 ?덈뒗 ?≪닔?좊え?덊꽣留?VO
	 * @exception Exception Exception
	 */
	public TrsmrcvMntrng selectTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng) throws Exception {
		return (TrsmrcvMntrng) selectOne("TrsmrcvMntrngDao.selectTrsmrcvMntrng", trsmrcvMntrng);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹몄젙蹂대? ?곸꽭議고쉶 ?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곷줈洹몄젙蹂?
	 *
	 * @param trsmrcvMntrngLog    議고쉶??KEY媛 ?덈뒗 ?≪닔?좊え?덊꽣留곷줈洹?VO
	 * @exception Exception Exception
	 */
	public TrsmrcvMntrngLog selectTrsmrcvMntrngLog(TrsmrcvMntrngLog trsmrcvMntrngLog) throws Exception {
		return (TrsmrcvMntrngLog) selectOne("TrsmrcvMntrngDao.selectTrsmrcvMntrngLog", trsmrcvMntrngLog);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곸젙蹂대ぉ濡앹쓣  議고쉶?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곷ぉ濡?
	 *
	 * @param searchVO    議고쉶議곌굔????λ맂 VO
	 * @exception Exception Exception
	 */
	public List<TrsmrcvMntrng> selectTrsmrcvMntrngList(TrsmrcvMntrng searchVO) throws Exception {
		return selectList("TrsmrcvMntrngDao.selectTrsmrcvMntrngList", searchVO);
	}

	/**
	 * ?≪닔?좊え?덊꽣留?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectTrsmrcvMntrngListCnt(TrsmrcvMntrng searchVO) throws Exception {
		return (Integer) selectOne("TrsmrcvMntrngDao.selectTrsmrcvMntrngListCnt", searchVO);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹몄젙蹂대ぉ濡앹쓣  議고쉶?쒕떎.
	 * @return ?≪닔?좊え?덊꽣留곷줈洹몃ぉ濡?
	 *
	 * @param searchVO    議고쉶議곌굔????λ맂 VO
	 * @exception Exception Exception
	 */
	public List<TrsmrcvMntrngLog> selectTrsmrcvMntrngLogList(TrsmrcvMntrngLog searchVO) throws Exception {
		return selectList("TrsmrcvMntrngDao.selectTrsmrcvMntrngLogList", searchVO);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곷줈洹?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectTrsmrcvMntrngLogListCnt(TrsmrcvMntrngLog searchVO) throws Exception {
		return (Integer) selectOne("TrsmrcvMntrngDao.selectTrsmrcvMntrngLogListCnt", searchVO);
	}

	/**
	 * ?≪닔?좊え?덊꽣留곸젙蹂대? ?섏젙?쒕떎.
	 *
	 * @param trsmrcvMntrng    ?섏젙????≪닔?좊え?덊꽣留?VO
	 * @exception Exception Exception
	 */
	public void updateTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng) throws Exception {
		update("TrsmrcvMntrngDao.updateTrsmrcvMntrng", trsmrcvMntrng);
	}

	/**
	 * ?곌퀎?뺣낫紐⑸줉?? 議고쉶?쒕떎.
	 * @return ?곌퀎?뺣낫紐⑸줉
	 *
	 * @param searchVO    議고쉶議곌굔????λ맂 VO
	 * @exception Exception Exception
	 */
	public List<CntcVO> selectCntcList(CntcVO searchVO) throws Exception {
		return selectList("TrsmrcvMntrngDao.selectCntcList", searchVO);
	}

	/**
	 * ?곌퀎?뺣낫 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectCntcListCnt(CntcVO searchVO) throws Exception {
		return (Integer) selectOne("TrsmrcvMntrngDao.selectCntcListCnt", searchVO);
	}

}
