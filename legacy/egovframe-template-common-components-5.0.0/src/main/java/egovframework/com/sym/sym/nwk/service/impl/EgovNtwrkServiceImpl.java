**
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?ㅽ듃?뚰겕??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 19-8-2010 ?ㅽ썑 4:34:35
 */

package egovframework.com.sym.sym.nwk.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.sym.nwk.service.EgovNtwrkService;
import egovframework.com.sym.sym.nwk.service.Ntwrk;
import egovframework.com.sym.sym.nwk.service.NtwrkVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

@Service("egovNtwrkService")
public class EgovNtwrkServiceImpl extends EgovAbstractServiceImpl implements EgovNtwrkService  {

	@Resource(name="ntwrkDAO")
	private NtwrkDAO ntwrkDAO;

	/**
	 * ?ㅽ듃?뚰겕瑜?愿由ы븯湲??꾪빐 ?깅줉???ㅽ듃?뚰겕紐⑸줉??議고쉶?쒕떎.
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return List - ?ㅽ듃?뚰겕 紐⑸줉
	 */
	@Override
	public List<NtwrkVO> selectNtwrkList(NtwrkVO ntwrkVO) throws Exception {
        return ntwrkDAO.selectNtwrkList(ntwrkVO);
    }

	/**
	 * ?ㅽ듃?뚰겕紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return int - ?ㅽ듃?뚰겕 移댁슫????
	 */
	@Override
	public int selectNtwrkListTotCnt(NtwrkVO ntwrkVO) throws Exception {
		return ntwrkDAO.selectNtwrkListTotCnt(ntwrkVO);
	}

	/**
	 * ?깅줉???ㅽ듃?뚰겕???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return NtwrkVO - ?ㅽ듃?뚰겕 Vo
	 */
	@Override
	public NtwrkVO selectNtwrk(NtwrkVO ntwrkVO) throws Exception {
		return ntwrkDAO.selectNtwrk(ntwrkVO);
	}

	/**
	 * ?ㅽ듃?뚰겕?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 * @return NtwrkVO - ?ㅽ듃?뚰겕 Vo
	 */
	@Override
	public NtwrkVO insertNtwrk(Ntwrk ntwrk, NtwrkVO ntwrkVO) throws Exception {
		ntwrk.setRegstYmd(EgovStringUtil.removeMinusChar(ntwrk.getRegstYmd()));
		ntwrkDAO.insertNtwrk(ntwrk);
        ntwrkVO.setNtwrkId(ntwrk.getNtwrkId());
        return ntwrkDAO.selectNtwrk(ntwrkVO);
	}

	/**
	 * 湲??깅줉???ㅽ듃?뚰겕?뺣낫瑜??섏젙?쒕떎.
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 */
	@Override
	public void updateNtwrk(Ntwrk ntwrk) throws Exception {
		ntwrk.setRegstYmd(EgovStringUtil.removeMinusChar(ntwrk.getRegstYmd()));
		ntwrkDAO.updateNtwrk(ntwrk);
	}

	/**
	 * 湲??깅줉???ㅽ듃?뚰겕?뺣낫瑜???젣?쒕떎.
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 */
	@Override
	public void deleteNtwrk(Ntwrk ntwrk) throws Exception {
        ntwrkDAO.deleteNtwrk(ntwrk);
	}

}
