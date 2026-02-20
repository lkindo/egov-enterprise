/**
 * 媛쒖슂
 * - ?뚯쓽?ㅺ?由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?뚯쓽?ㅺ?由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?뚯쓽?ㅺ?由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

package egovframework.com.uss.ion.mtg.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.mtg.service.MtgPlaceManage;
import egovframework.com.uss.ion.mtg.service.MtgPlaceManageVO;
import egovframework.com.uss.ion.mtg.service.MtgPlaceResve;

@Repository("mtgPlaceManageDAO")
public class MtgPlaceManageDAO extends EgovComAbstractDAO {

	/**
	 * ?뚯쓽?ㅺ?由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???뚯쓽?ㅺ?由?紐⑸줉??議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return List - ?뚯쓽?ㅺ?由?紐⑸줉
	 */
	public List<MtgPlaceManageVO> selectMtgPlaceManageList(MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		return selectList("mtgPlaceManageDAO.selectMtgPlaceManageList", mtgPlaceManageVO);
	}

    /**
	 * ?뚯쓽?ㅺ?由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectMtgPlaceManageListTotCnt(MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
        return (Integer)selectOne("mtgPlaceManageDAO.selectMtgPlaceManageListTotCnt", mtgPlaceManageVO);
    }

	/**
	 * ?깅줉???뚯쓽?ㅺ?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 */
	public MtgPlaceManage selectMtgPlaceManage(MtgPlaceManageVO mtgPlaceManageVO)  throws Exception {
		return (MtgPlaceManage) selectOne("mtgPlaceManageDAO.selectMtgPlaceManage", mtgPlaceManageVO);
	}

	/**
	 * ?뚯쓽?ㅺ?由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 */
	public void insertMtgPlaceManage(MtgPlaceManage mtgPlaceManage) throws Exception {
		insert("mtgPlaceManageDAO.insertMtgPlaceManage", mtgPlaceManage);
	}
	
	/**
	 * 湲??깅줉???뚯쓽?ㅺ?由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 */
	public void updtMtgPlaceManage(MtgPlaceManage mtgPlaceManage) throws Exception {
		update("mtgPlaceManageDAO.updtMtgPlaceManage", mtgPlaceManage);
	}

	/**
	 * 湲??깅줉???뚯쓽?ㅺ?由ъ젙蹂대? ??젣?쒕떎.
	 * @param mtgPlaceManage - ?뚯쓽?ㅺ?由?model
	 */
	public void deleteMtgPlaceManage(MtgPlaceManage mtgPlaceManage) throws Exception {
        delete("mtgPlaceManageDAO.deleteMtgPlaceManage",mtgPlaceManage);
	}

	/******** ?뚯쓽???덉빟 愿由?*************/

	/** 
	 * ?뚯쓽??ID ?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return List - ?뚯쓽?ㅺ?由?紐⑸줉
	 */
	public List<MtgPlaceManageVO> selectMtgPlaceIDList(MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		return selectList("mtgPlaceManageDAO.selectMtgPlaceIDList", mtgPlaceManageVO);
	}
	
	/** 
	 * ?뚯쓽???덉빟?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???뚯쓽?ㅼ삁?쎌쓣 議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?紐⑸줉
	 */
	public MtgPlaceManageVO selectMtgPlaceResveManageList(MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		return (MtgPlaceManageVO) selectOne("mtgPlaceManageDAO.selectMtgPlaceResveManageList", mtgPlaceManageVO);
	}
	
	/**
	 * ?뚯쓽?ㅼ삁???좎껌?붾㈃??議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 */
	public MtgPlaceManageVO selectMtgPlaceResve(MtgPlaceManageVO mtgPlaceManageVO)  throws Exception {
		return (MtgPlaceManageVO) selectOne("mtgPlaceManageDAO.selectMtgPlaceResve", mtgPlaceManageVO);
	}

	/**
	 * ?깅줉???뚯쓽?ㅼ삁???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return MtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 */
	public MtgPlaceManageVO selectMtgPlaceResveDetail(MtgPlaceManageVO mtgPlaceManageVO)  throws Exception {
		return (MtgPlaceManageVO) selectOne("mtgPlaceManageDAO.selectMtgPlaceResveDetail", mtgPlaceManageVO);
	}
	
	/**
	 * ?뚯쓽?ㅼ삁???뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param mtgPlaceResve - ?뚯쓽?ㅼ삁??model
	 */
	public void insertMtgPlaceResve(MtgPlaceResve mtgPlaceResve) throws Exception {
		insert("mtgPlaceManageDAO.insertMtgPlaceResve", mtgPlaceResve);
	}
	
	/**
	 * 湲??깅줉???뚯쓽?ㅼ삁???뺣낫瑜??섏젙?쒕떎.
	 * @param mtgPlaceResve - ?뚯쓽?ㅼ삁??model
	 */
	public void updtMtgPlaceResve(MtgPlaceResve mtgPlaceResve) throws Exception {
		update("mtgPlaceManageDAO.updtMtgPlaceResve", mtgPlaceResve);
	}

	/**
	 * 湲??깅줉???뚯쓽?ㅼ삁???뺣낫瑜???젣?쒕떎.
	 * @param mtgPlaceResve - ?뚯쓽?ㅼ삁??model
	 */
	public void deleteMtgPlaceResve(MtgPlaceResve mtgPlaceResve) throws Exception {
        delete("mtgPlaceManageDAO.deleteMtgPlaceResve",mtgPlaceResve);
	}	
	
	
	/**
	 * ?뚯쓽??以묐났?щ? 泥댄겕.
	 * @param mtgPlaceManageVO - ?뚯쓽?ㅺ?由?VO
	 * @return int - 以묐났嫄댁닔
	 */
	public int mtgPlaceResveDplactCeck(MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		return (Integer)selectOne("mtgPlaceManageDAO.mtgPlaceResveDplactCeck", mtgPlaceManageVO);
	}
	
}
