**
 * 媛쒖슂
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:03
 */

package egovframework.com.uss.ion.isg.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.isg.service.EgovIntnetSvcGuidanceService;
import egovframework.com.uss.ion.isg.service.IntnetSvcGuidance;
import egovframework.com.uss.ion.isg.service.IntnetSvcGuidanceVO;
import jakarta.annotation.Resource;

@Service("egovIntnetSvcGuidanceService")
public class EgovIntnetSvcGuidanceServiceImpl extends EgovAbstractServiceImpl implements EgovIntnetSvcGuidanceService {

	@Resource(name="intnetSvcGuidanceDAO")
	private IntnetSvcGuidanceDAO intnetSvcGuidanceDAO;

	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???명꽣?룹꽌鍮꾩뒪?덈궡 紐⑸줉??議고쉶?쒕떎.
	 * @param intnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return List - ?명꽣?룹꽌鍮꾩뒪?덈궡 紐⑸줉
	 */
	@Override
	public List<IntnetSvcGuidanceVO> selectIntnetSvcGuidanceList(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception{
		return intnetSvcGuidanceDAO.selectIntnetSvcGuidanceList(intnetSvcGuidanceVO);
	}

	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param mainImageVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return int
	 */
	@Override
	public int selectIntnetSvcGuidanceListTotCnt(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception {
		return intnetSvcGuidanceDAO.selectIntnetSvcGuidanceListTotCnt(intnetSvcGuidanceVO);
	}

	/**
	 * ?깅줉???명꽣?룹꽌鍮꾩뒪?덈궡???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param intnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 Vo
	 * @return IntnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 Vo
	 */
	@Override
	public IntnetSvcGuidanceVO selectIntnetSvcGuidance(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception {
		return intnetSvcGuidanceDAO.selectIntnetSvcGuidance(intnetSvcGuidanceVO);
	}

	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param intnetSvcGuidance - ?명꽣?룹꽌鍮꾩뒪?덈궡 model
	 */
	@Override
	public IntnetSvcGuidanceVO insertIntnetSvcGuidance(IntnetSvcGuidance intnetSvcGuidance, IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception {
		intnetSvcGuidanceDAO.insertIntnetSvcGuidance(intnetSvcGuidance);
		return selectIntnetSvcGuidance(intnetSvcGuidanceVO);
	}

	/**
	 * 湲??깅줉???명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜??섏젙?쒕떎.
	 * @param intnetSvcGuidance - ?명꽣?룹꽌鍮꾩뒪?덈궡 model
	 */
	@Override
	public void updateIntnetSvcGuidance(IntnetSvcGuidance intnetSvcGuidance) throws Exception {
		intnetSvcGuidanceDAO.updateIntnetSvcGuidance(intnetSvcGuidance);
	}

	/**
	 * 湲??깅줉???명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜???젣?쒕떎.
	 * @param intnetSvcGuidance - ?명꽣?룹꽌鍮꾩뒪?덈궡 model
	 */
	@Override
	public void deleteIntnetSvcGuidance(IntnetSvcGuidance intnetSvcGuidance) throws Exception{
		intnetSvcGuidanceDAO.deleteIntnetSvcGuidance(intnetSvcGuidance);
	}

	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫 ?곸슜寃곌낵瑜?議고쉶?쒕떎.
	 * @param intnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return List - ?명꽣?룹꽌鍮꾩뒪?덈궡 紐⑸줉
	 */
	@Override
	public List<IntnetSvcGuidanceVO> selectIntnetSvcGuidanceResult(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception {
		return intnetSvcGuidanceDAO.selectIntnetSvcGuidanceResult(intnetSvcGuidanceVO);
	}
}
