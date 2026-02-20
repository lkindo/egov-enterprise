package egovframework.com.uss.ion.ans.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.ans.service.AnnvrsryManage;
import egovframework.com.uss.ion.ans.service.AnnvrsryManageVO;

/**
 * 媛쒖슂
 * - 湲곕뀗?쇨?由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 湲곕뀗?쇨?由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - 湲곕뀗?쇨?由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

@Repository("annvrsryManageDAO")
public class AnnvrsryManageDAO extends EgovComAbstractDAO {

	/**
	 * 湲곕뀗?쇨?由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉??湲곕뀗?쇨?由?紐⑸줉??議고쉶?쒕떎.
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return List - 湲곕뀗?쇨?由?紐⑸줉
	 */	
	public List<AnnvrsryManageVO> selectAnnvrsryManageList(AnnvrsryManageVO annvrsryManageVO) throws Exception {
		return selectList("annvrsryManageDAO.selectAnnvrsryManageList", annvrsryManageVO);
	}

    /**
	 * 湲곕뀗?쇨?由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectAnnvrsryManageListTotCnt(AnnvrsryManageVO annvrsryManageVO) throws Exception {
        return (Integer)selectOne("annvrsryManageDAO.selectAnnvrsryManageListTotCnt", annvrsryManageVO);
    }

	/**
	 * ?깅줉??湲곕뀗?쇨?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return AnnvrsryManageVO - 湲곕뀗?쇨?由?VO
	 */
	public AnnvrsryManageVO selectAnnvrsryManage(AnnvrsryManageVO annvrsryManageVO)  throws Exception {
		return (AnnvrsryManageVO) selectOne("annvrsryManageDAO.selectAnnvrsryManage", annvrsryManageVO);
	}

	/**
	 * 湲곕뀗?쇨?由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 */
	public void insertAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception {
		insert("annvrsryManageDAO.insertAnnvrsryManage", annvrsryManage);
	}

	/**
	 * 湲??깅줉??湲곕뀗?쇨?由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 */
	public void updateAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception {
		update("annvrsryManageDAO.updateAnnvrsryManage", annvrsryManage);
	}

	/**
	 * 湲??깅줉??湲곕뀗?쇨?由ъ젙蹂대? ??젣?쒕떎.
	 * @param annvrsryManage - 湲곕뀗?쇨?由?model
	 */
	public void deleteAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception {
        delete("annvrsryManageDAO.deleteAnnvrsryManage",annvrsryManage);
	}

	/**
	 * ?깅줉??湲곕뀗?쇨?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return AnnvrsryManageVO - 湲곕뀗?쇨?由?VO
	 */	
	public List<AnnvrsryManageVO> selectAnnvrsryGdcc(AnnvrsryManageVO annvrsryManageVO)  throws Exception {
		return selectList("annvrsryManageDAO.selectAnnvrsryGdcc", annvrsryManageVO);
	}

    /**
	 * 湲곕뀗?쇨?由??깅줉??以묐났?щ?瑜?議고쉶?쒕떎.
	 * @param annvrsryManage - 湲곕뀗?쇨?由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectAnnvrsryManageDplctAt(AnnvrsryManage annvrsryManage) throws Exception {
        return (Integer)selectOne("annvrsryManageDAO.selectAnnvrsryManageDplctAt", annvrsryManage);
    }

	/**
	 * ?깅줉??湲곕뀗?쇨?由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param annvrsryManageVO - 湲곕뀗?쇨?由?VO
	 * @return AnnvrsryManageVO - 湲곕뀗?쇨?由?VO
	 */
	public AnnvrsryManageVO selectAnnvrsryManageBnde(AnnvrsryManageVO annvrsryManageVO)  throws Exception {
		return (AnnvrsryManageVO) selectOne("annvrsryManageDAO.selectAnnvrsryManageBnde", annvrsryManageVO);
	}

}
