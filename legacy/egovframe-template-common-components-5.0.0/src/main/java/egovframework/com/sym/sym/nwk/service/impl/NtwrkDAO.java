package egovframework.com.sym.sym.nwk.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.sym.nwk.service.Ntwrk;
import egovframework.com.sym.sym.nwk.service.NtwrkVO;

/**
 * <pre>
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?ㅽ듃?뚰겕??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author lee.m.j
 * @since 2010.08.19
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  lee.m.j       理쒖큹 ?앹꽦
 *   2025.07.23  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessaryBoxing(遺덊븘?뷀븳 WrapperObject ?앹꽦)
 *
 *      </pre>
 */
@Repository("ntwrkDAO")
public class NtwrkDAO extends EgovComAbstractDAO {

	/**
	 * ?ㅽ듃?뚰겕瑜?愿由ы븯湲??꾪빐 ?깅줉???ㅽ듃?뚰겕紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return List - ?ㅽ듃?뚰겕 紐⑸줉
	 */
	public List<NtwrkVO> selectNtwrkList(NtwrkVO ntwrkVO) throws Exception {
		return selectList("ntwrkDAO.selectNtwrkList", ntwrkVO);
	}

	/**
	 * ?ㅽ듃?뚰겕紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return int - ?ㅽ듃?뚰겕 移댁슫????
	 */
	public int selectNtwrkListTotCnt(NtwrkVO ntwrkVO) throws Exception {
		return selectOne("ntwrkDAO.selectNtwrkListTotCnt", ntwrkVO);
	}

	/**
	 * ?깅줉???ㅽ듃?뚰겕???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return NtwrkVO - ?ㅽ듃?뚰겕 Vo
	 */
	public NtwrkVO selectNtwrk(NtwrkVO ntwrkVO) throws Exception {
		return (NtwrkVO) selectOne("ntwrkDAO.selectNtwrk", ntwrkVO);
	}

	/**
	 * ?ㅽ듃?뚰겕?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 */
	public void insertNtwrk(Ntwrk ntwrk) throws Exception {
		insert("ntwrkDAO.insertNtwrk", ntwrk);
	}

	/**
	 * 湲??깅줉???ㅽ듃?뚰겕?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 */
	public void updateNtwrk(Ntwrk ntwrk) throws Exception {
		update("ntwrkDAO.updateNtwrk", ntwrk);
	}

	/**
	 * 湲??깅줉???ㅽ듃?뚰겕?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 */
	public void deleteNtwrk(Ntwrk ntwrk) throws Exception {
		delete("ntwrkDAO.deleteNtwrk", ntwrk);
	}

}
