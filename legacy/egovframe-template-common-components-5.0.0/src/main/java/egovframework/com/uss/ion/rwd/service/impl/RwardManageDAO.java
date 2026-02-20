

package egovframework.com.uss.ion.rwd.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.rwd.service.RwardManage;
import egovframework.com.uss.ion.rwd.service.RwardManageVO;

/**
 * 媛쒖슂
 * - ?ъ긽愿由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?ъ긽愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, ?뱀씤泥섎━ 湲곕뒫???쒓났?쒕떎.
 * - ?ъ긽愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

@Repository("rwardManageDAO")
public class RwardManageDAO extends EgovComAbstractDAO {

	/**
	 * ?ъ긽愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???ъ긽愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return List - ?ъ긽愿由?紐⑸줉
	 */
	public List<RwardManageVO> selectRwardManageList(RwardManageVO rwardManageVO) throws Exception {
		return selectList("rwardManageDAO.selectRwardManageList", rwardManageVO);
	}

    /**
	 * ?ъ긽愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectRwardManageListTotCnt(RwardManageVO rwardManageVO) throws Exception {
        return (Integer)selectOne("rwardManageDAO.selectRwardManageListTotCnt", rwardManageVO);
    }

	/**
	 * ?깅줉???ъ긽愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return RwardManageVO - ?ъ긽愿由?VO
	 */
	public RwardManageVO selectRwardManage(RwardManageVO rwardManageVO)  throws Exception {
		return (RwardManageVO) selectOne("rwardManageDAO.selectRwardManage", rwardManageVO);
	}

	/**
	 * ?ъ긽愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	public void insertRwardManage(RwardManage rwardManage) throws Exception {
		insert("rwardManageDAO.insertRwardManage", rwardManage);
	}

	/**
	 * 湲??깅줉???ъ긽愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	public void updtRwardManage(RwardManage rwardManage) throws Exception {
		update("rwardManageDAO.updtRwardManage", rwardManage);
	}

	/**
	 * 湲??깅줉???ъ긽愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	public void deleteRwardManage(RwardManage rwardManage) throws Exception {
        delete("rwardManageDAO.deleteRwardManage",rwardManage);
	}

    /*** ?뱀씤泥섎━愿??***/
	/**
	 * ?ъ긽愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???ъ긽愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return List - ?ъ긽愿由?紐⑸줉
	 */
	public List<RwardManageVO> selectRwardManageConfmList(RwardManageVO rwardManageVO) throws Exception {
		return selectList("rwardManageDAO.selectRwardManageConfmList", rwardManageVO);
	}

    /**
	 * ?ъ긽愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???ъ긽愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param rwardManageVO - ?ъ긽愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectRwardManageConfmListTotCnt(RwardManageVO rwardManageVO) throws Exception {
        return (Integer)selectOne("rwardManageDAO.selectRwardManageConfmListTotCnt", rwardManageVO);
    }
	
	/**
	 *?ъ긽?뺣낫瑜??뱀씤/諛섎젮泥섎━ ?쒕떎.
	 * @param rwardManage - ?ъ긽愿由?model
	 */
	public void updtRwardManageConfm(RwardManage rwardManage) throws Exception {
		update("rwardManageDAO.updtRwardManageConfm", rwardManage);
	}
}
