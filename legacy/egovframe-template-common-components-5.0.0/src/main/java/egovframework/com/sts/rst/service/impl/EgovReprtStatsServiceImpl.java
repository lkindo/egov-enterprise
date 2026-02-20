/**
 * 媛쒖슂
 * - 蹂닿퀬?쒗넻怨꾩뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 蹂닿퀬?쒗넻怨꾩뿉 ????깅줉, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 蹂닿퀬?쒗넻怨꾩쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:09:16
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.8.3   lee.m.j          理쒖큹 ?앹꽦 *
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 *  </pre>
 */

package egovframework.com.sts.rst.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sts.rst.service.EgovReprtStatsService;
import egovframework.com.sts.rst.service.ReprtStats;
import egovframework.com.sts.rst.service.ReprtStatsVO;
import jakarta.annotation.Resource;

@Service("egovReprtStatsService")
public class EgovReprtStatsServiceImpl extends EgovAbstractServiceImpl implements EgovReprtStatsService {

	@Resource(name="reprtStatsDAO")
	private ReprtStatsDAO reprtStatsDAO;

	/**
	 * 蹂닿퀬???듦퀎?뺣낫????곷ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return List - 蹂닿퀬?쒗넻怨?紐⑸줉
	 */
	@Override
	public List<ReprtStatsVO> selectReprtStatsList(ReprtStatsVO reprtStatsVO) throws Exception {
		return reprtStatsDAO.selectReprtStatsList(reprtStatsVO);
	}

    /**
	 * 蹂닿퀬?쒗넻怨꾨ぉ濡??섏씠吏?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return int
	 */
	@Override
	public int selectReprtStatsListTotCnt(ReprtStatsVO reprtStatsVO) throws Exception {
		return reprtStatsDAO.selectReprtStatsListTotCnt(reprtStatsVO);
	}

    /**
	 * 蹂닿퀬?쒗넻怨꾨ぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return int
	 */
	@Override
	public int selectReprtStatsListBarTotCnt(ReprtStatsVO reprtStatsVO) throws Exception {
		return reprtStatsDAO.selectReprtStatsListBarTotCnt(reprtStatsVO);
	}

	/**
	 * 蹂닿퀬???듦퀎?뺣낫???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return ReprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 */
	@Override
	public List<ReprtStatsVO> selectReprtStats(ReprtStatsVO reprtStatsVO) throws Exception {
		return reprtStatsDAO.selectReprtStats(reprtStatsVO);
	}

	/**
	 * 蹂닿퀬???듦퀎?뺣낫瑜??앹꽦??????ν븳??
	 * @param reprtStats - 蹂닿퀬?쒗넻怨?model
	 */
	@Override
	public void insertReprtStats(ReprtStats reprtStats) throws Exception {
		reprtStatsDAO.insertReprtStats(reprtStats);
	}

	/**
	 * ?깅줉?쇱옄蹂??듦퀎?뺣낫瑜?洹몃옒?꾨줈 ?쒗쁽?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return List - 蹂닿퀬?쒗넻怨?VO
	 */
	@Override
	public List<ReprtStatsVO> selectReprtStatsBarList(ReprtStatsVO reprtStatsVO) throws Exception {
		return reprtStatsDAO.selectReprtStatsBarList(reprtStatsVO);
	}

	/**
	 * 蹂닿퀬?쒖쑀?뺣퀎 ?듦퀎?뺣낫瑜?洹몃옒?꾨줈 ?쒗쁽?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return List - 蹂닿퀬?쒗넻怨?VO
	 */
	@Override
	public List<ReprtStatsVO> selectReprtStatsByReprtTyList(ReprtStatsVO reprtStatsVO) throws Exception {
		return reprtStatsDAO.selectReprtStatsByReprtTyList(reprtStatsVO);
	}

	/**
	 * 吏꾪뻾?곹깭蹂??듦퀎?뺣낫瑜?洹몃옒?꾨줈 ?쒗쁽?쒕떎.
	 * @param reprtStatsVO - 蹂닿퀬?쒗넻怨?VO
	 * @return List - 蹂닿퀬?쒗넻怨?VO
	 */
	@Override
	public List<ReprtStatsVO> selectReprtStatsByReprtSttusList(ReprtStatsVO reprtStatsVO) throws Exception {
		return reprtStatsDAO.selectReprtStatsByReprtSttusList(reprtStatsVO);
	}
}
