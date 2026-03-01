**
 * 媛쒖슂
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:08:52
 */

package egovframework.com.uss.ion.isg.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.isg.service.IntnetSvcGuidance;
import egovframework.com.uss.ion.isg.service.IntnetSvcGuidanceVO;

@Repository("intnetSvcGuidanceDAO")
public class IntnetSvcGuidanceDAO extends EgovComAbstractDAO {

	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???명꽣?룹꽌鍮꾩뒪?덈궡 紐⑸줉??議고쉶?쒕떎.
	 * @param intnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return List - ?명꽣?룹꽌鍮꾩뒪?덈궡 紐⑸줉
	 */	
	public List<IntnetSvcGuidanceVO> selectIntnetSvcGuidanceList(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception {
		return selectList("intnetSvcGuidanceDAO.selectIntnetSvcGuidanceList", intnetSvcGuidanceVO);
	}

    /**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param mainImageVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return int
	 */
    public int selectIntnetSvcGuidanceListTotCnt(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception {
        return (Integer)selectOne("intnetSvcGuidanceDAO.selectIntnetSvcGuidanceListTotCnt", intnetSvcGuidanceVO);
    }
	
	/**
	 * ?깅줉???명꽣?룹꽌鍮꾩뒪?덈궡???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param intnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return IntnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 */
	public IntnetSvcGuidanceVO selectIntnetSvcGuidance(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception {
		return (IntnetSvcGuidanceVO) selectOne("intnetSvcGuidanceDAO.selectIntnetSvcGuidance", intnetSvcGuidanceVO);
	}

	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param intnetSvcGuidance - ?명꽣?룹꽌鍮꾩뒪?덈궡 model
	 */
	public void insertIntnetSvcGuidance(IntnetSvcGuidance intnetSvcGuidance) throws Exception {
		insert("intnetSvcGuidanceDAO.insertIntnetSvcGuidance", intnetSvcGuidance);
	}

	/**
	 * 湲??깅줉???명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜??섏젙?쒕떎.
	 * @param intnetSvcGuidance - ?명꽣?룹꽌鍮꾩뒪?덈궡 model
	 */
	public void updateIntnetSvcGuidance(IntnetSvcGuidance intnetSvcGuidance) throws Exception {
		update("intnetSvcGuidanceDAO.updateIntnetSvcGuidance", intnetSvcGuidance);
	}

	/**
	 * 湲??깅줉???명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫瑜???젣?쒕떎.
	 * @param intnetSvcGuidance - ?명꽣?룹꽌鍮꾩뒪?덈궡 model
	 */
	public void deleteIntnetSvcGuidance(IntnetSvcGuidance intnetSvcGuidance) throws Exception {
		delete("intnetSvcGuidanceDAO.deleteIntnetSvcGuidance", intnetSvcGuidance);
	}
	
	/**
	 * ?명꽣?룹꽌鍮꾩뒪?덈궡?뺣낫 ?곸슜寃곌낵瑜?議고쉶?쒕떎.
	 * @param intnetSvcGuidanceVO - ?명꽣?룹꽌鍮꾩뒪?덈궡 VO
	 * @return List - ?명꽣?룹꽌鍮꾩뒪?덈궡 紐⑸줉
	 */
	public List<IntnetSvcGuidanceVO> selectIntnetSvcGuidanceResult(IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception {
		return selectList("intnetSvcGuidanceDAO.selectIntnetSvcGuidanceResult", intnetSvcGuidanceVO);
	}	
}
