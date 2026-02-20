package egovframework.com.uss.ion.ctn.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.ctn.service.CtsnnManage;
import egovframework.com.uss.ion.ctn.service.CtsnnManageVO;

/**
 * 媛쒖슂
 * - 寃쎌“愿由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 寃쎌“愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 寃쎌“愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

@Repository("ctsnnManageDAO")
public class CtsnnManageDAO extends EgovComAbstractDAO {

	/**
	 * 寃쎌“愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉??寃쎌“愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return List - 寃쎌“愿由?紐⑸줉
	 */
	public List<CtsnnManageVO> selectCtsnnManageList(CtsnnManageVO ctsnnManageVO) throws Exception {
		return selectList("ctsnnManageDAO.selectCtsnnManageList", ctsnnManageVO);
	}

    /**
	 * 寃쎌“愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectCtsnnManageListTotCnt(CtsnnManageVO ctsnnManageVO) throws Exception {
        return (Integer)selectOne("ctsnnManageDAO.selectCtsnnManageListTotCnt", ctsnnManageVO);
    }

	/**
	 * ?깅줉??寃쎌“愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return CtsnnManageVO - 寃쎌“愿由?VO
	 */
	public CtsnnManageVO selectCtsnnManage(CtsnnManageVO ctsnnManageVO)  throws Exception {
		return (CtsnnManageVO) selectOne("ctsnnManageDAO.selectCtsnnManage", ctsnnManageVO);
	}

	/**
	 * 寃쎌“愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	public void insertCtsnnManage(CtsnnManage ctsnnManage) throws Exception {
		insert("ctsnnManageDAO.insertCtsnnManage", ctsnnManage);
	}

	/**
	 * 湲??깅줉??寃쎌“愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	public void updtCtsnnManage(CtsnnManage ctsnnManage) throws Exception {
		update("ctsnnManageDAO.updateCtsnnManage", ctsnnManage);
	}

	/**
	 * 湲??깅줉??寃쎌“愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	public void deleteCtsnnManage(CtsnnManage ctsnnManage) throws Exception {
        delete("ctsnnManageDAO.deleteCtsnnManage",ctsnnManage);
	}

    /*** ?뱀씤泥섎━愿??***/
	/**
	 * 寃쎌“愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌??寃쎌“愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return List - 寃쎌“愿由?紐⑸줉
	 */
	public List<CtsnnManageVO> selectCtsnnManageConfmList(CtsnnManageVO ctsnnManageVO) throws Exception {
		return selectList("ctsnnManageDAO.selectCtsnnManageConfmList", ctsnnManageVO);
	}

    /**
	 * 寃쎌“愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌??寃쎌“愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectCtsnnManageConfmListTotCnt(CtsnnManageVO ctsnnManageVO) throws Exception {
        return (Integer)selectOne("ctsnnManageDAO.selectCtsnnManageConfmListTotCnt", ctsnnManageVO);
    }

	/**
	 *寃쎌“?뺣낫瑜??뱀씤泥섎━ ?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 */
	public void updtCtsnnManageConfm(CtsnnManage ctsnnManage) throws Exception {
		update("ctsnnManageDAO.updtCtsnnManageConfm", ctsnnManage);
	}
}
