/**
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?????Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?ㅽ듃?뚰겕??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 19-8-2010 ?ㅽ썑 4:34:35
 */

package egovframework.com.sym.sym.nwk.service;

import java.util.List;

public interface EgovNtwrkService {

	/**
	 * ?ㅽ듃?뚰겕瑜?愿由ы븯湲??꾪빐 ?깅줉???ㅽ듃?뚰겕紐⑸줉??議고쉶?쒕떎.
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return List - ?ㅽ듃?뚰겕 紐⑸줉
	 */
    public List<NtwrkVO> selectNtwrkList(NtwrkVO ntwrkVO) throws Exception;

    /**
	 * ?ㅽ듃?뚰겕 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return int - ?ㅽ듃?뚰겕 移댁슫????
	 */
    public int selectNtwrkListTotCnt(NtwrkVO ntwrkVO) throws Exception;

    /**
	 * ?깅줉???ㅽ듃?뚰겕???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return NtwrkVO - ?ㅽ듃?뚰겕 Vo
	 */
    public NtwrkVO selectNtwrk(NtwrkVO ntwrkVO) throws Exception;

    /**
	 * ?ㅽ듃?뚰겕?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 */
    public NtwrkVO insertNtwrk(Ntwrk ntwrk, NtwrkVO ntwrkVO) throws Exception;

    /**
	 * 湲??깅줉???ㅽ듃?뚰겕?뺣낫瑜??섏젙?쒕떎.
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 */
    public void updateNtwrk(Ntwrk ntwrk) throws Exception;

	/**
	 * 湲??깅줉???ㅽ듃?뚰겕?뺣낫瑜???젣?쒕떎.
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 */
    public void deleteNtwrk(Ntwrk ntwrk) throws Exception;
}
