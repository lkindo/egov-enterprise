package egovframework.com.utl.sys.nsm.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrng;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngLog;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngLogVO;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngVO;

/**
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:43
 */
@Repository("NtwrkSvcMntrngDAO")
public class NtwrkSvcMntrngDAO extends EgovComAbstractDAO {

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???紐⑸줉??遺덈윭?⑤떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???VO
	 * @return List<NtwrkSvcMntrngVO> - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???List
	 *
	 * @param ntwrkSvcMntrngVO
	 */
	public List<NtwrkSvcMntrngVO> selectNtwrkSvcMntrngList(NtwrkSvcMntrngVO ntwrkSvcMntrngVO) throws Exception{
		return selectList("NtwrkSvcMntrngDAO.selectNtwrkSvcMntrngList", ntwrkSvcMntrngVO);
	}

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ??곸쓣 遺덈윭?⑤떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???VO
	 * @return NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???VO
	 *
	 * @param ntwrkSvcMntrngVO
	 */
	public NtwrkSvcMntrngVO selectNtwrkSvcMntrng(NtwrkSvcMntrngVO ntwrkSvcMntrngVO) throws Exception{
		return (NtwrkSvcMntrngVO)selectOne("NtwrkSvcMntrngDAO.selectNtwrkSvcMntrng", ntwrkSvcMntrngVO);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ????뺣낫瑜??섏젙?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???model
	 *
	 * @param ntwrkSvcMntrng
	 */
	public void updateNtwrkSvcMntrng(NtwrkSvcMntrng ntwrkSvcMntrng) throws Exception{
		update("NtwrkSvcMntrngDAO.updateNtwrkSvcMntrng", ntwrkSvcMntrng);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ????뺣낫瑜??깅줉?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???model
	 *
	 * @param ntwrkSvcMntrng
	 */
	public void insertNtwrkSvcMntrng(NtwrkSvcMntrng ntwrkSvcMntrng) throws Exception{
		insert("NtwrkSvcMntrngDAO.insertNtwrkSvcMntrng", ntwrkSvcMntrng);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅????깅줉???꾪븳 以묐났 議고쉶瑜??섑뻾?쒕떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???VO
	 * @return int
	 *
	 * @param ntwrkSvcMntrngVO
	 */
	public int selectNtwrkSvcMntrngCheck(NtwrkSvcMntrngVO ntwrkSvcMntrngVO) throws Exception{
		return (Integer)selectOne("NtwrkSvcMntrngDAO.selectNtwrkSvcMntrngCheck", ntwrkSvcMntrngVO);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ????뺣낫瑜???젣?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???model
	 *
	 * @param ntwrkSvcMntrng
	 */
	public void deleteNtwrkSvcMntrng(NtwrkSvcMntrng ntwrkSvcMntrng) throws Exception{
		delete("NtwrkSvcMntrngDAO.deleteNtwrkSvcMntrng", ntwrkSvcMntrng);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???VO
	 * @return int
	 *
	 * @param ntwrkSvcMntrngVO
	 */
	public int selectNtwrkSvcMntrngListCnt(NtwrkSvcMntrngVO ntwrkSvcMntrngVO) throws Exception{
		return (Integer)selectOne("NtwrkSvcMntrngDAO.selectNtwrkSvcMntrngListCnt", ntwrkSvcMntrngVO);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 寃곌낵瑜??섏젙?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???model
	 *
	 * @param ntwrkSvcMntrng
	 */
	public void updateNtwrkSvcMntrngSttus(NtwrkSvcMntrng ntwrkSvcMntrng) throws Exception{
		update("NtwrkSvcMntrngDAO.updateNtwrkSvcMntrngSttus", ntwrkSvcMntrng);
	}

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 紐⑸줉??遺덈윭?⑤떎.
	 * @param NtwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 VO
	 * @return  List<NtwrkSvcMntrngLogVO> - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 List
	 *
	 * @param ntwrkSvcMntrngLogVO
	 */
	public List<NtwrkSvcMntrngLogVO> selectNtwrkSvcMntrngLogList(NtwrkSvcMntrngLogVO ntwrkSvcMntrngLogVO) throws Exception{
		return selectList("NtwrkSvcMntrngDAO.selectNtwrkSvcMntrngLogList", ntwrkSvcMntrngLogVO);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param NtwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 VO
	 * @return int
	 *
	 * @param ntwrkSvcMntrngLogVO
	 */
	public int selectNtwrkSvcMntrngLogListCnt(NtwrkSvcMntrngLogVO ntwrkSvcMntrngLogVO) throws Exception{
		return (Integer)selectOne("NtwrkSvcMntrngDAO.selectNtwrkSvcMntrngLogListCnt", ntwrkSvcMntrngLogVO);
	}

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇瑜?遺덈윭?⑤떎.
	 * @param NtwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 VO
	 * @return NtwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 VO
	 *
	 * @param ntwrkSvcMntrngLogVO
	 */
	public NtwrkSvcMntrngLogVO selectNtwrkSvcMntrngLog(NtwrkSvcMntrngLogVO ntwrkSvcMntrngLogVO) throws Exception{
		return (NtwrkSvcMntrngLogVO)selectOne("NtwrkSvcMntrngDAO.selectNtwrkSvcMntrngLog", ntwrkSvcMntrngLogVO);
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 ?뺣낫瑜??깅줉?쒕떎.
	 * @param NtwrkSvcMntrngLog - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 濡쒓렇 model
	 *
	 * @param ntwrkSvcMntrngLog
	 */
	public void insertNtwrkSvcMntrngLog(NtwrkSvcMntrngLog ntwrkSvcMntrngLog) throws Exception{
		insert("NtwrkSvcMntrngDAO.insertNtwrkSvcMntrngLog", ntwrkSvcMntrngLog);
	}

}