package egovframework.com.uss.ion.bnt.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.bnt.service.BndtCeckManage;
import egovframework.com.uss.ion.bnt.service.BndtCeckManageVO;
import egovframework.com.uss.ion.bnt.service.BndtDiary;
import egovframework.com.uss.ion.bnt.service.BndtDiaryVO;
import egovframework.com.uss.ion.bnt.service.BndtManage;
import egovframework.com.uss.ion.bnt.service.BndtManageVO;

/**
 * 媛쒖슂
 * - ?뱀쭅愿由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?뱀쭅愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?뱀쭅愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

@Repository("bndtManageDAO")
public class BndtManageDAO extends EgovComAbstractDAO {

	/**
	 * ?뱀쭅愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???뱀쭅愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return List - ?뱀쭅愿由?紐⑸줉
	 */
	
	public List<BndtManageVO> selectBndtManageList(BndtManageVO bndtManageVO) throws Exception {
		return  selectList("bndtManageDAO.selectBndtManageList", bndtManageVO);
	}

    /**
	 * ?뱀쭅愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectBndtManageListTotCnt(BndtManageVO bndtManageVO) throws Exception {
        return (Integer)selectOne("bndtManageDAO.selectBndtManageListTotCnt", bndtManageVO);
    }

	/**
	 * ?깅줉???뱀쭅愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return BndtManageVO - ?뱀쭅愿由?VO
	 */
	public BndtManageVO selectBndtManage(BndtManageVO bndtManageVO)  throws Exception {
		return (BndtManageVO) selectOne("bndtManageDAO.selectBndtManage", bndtManageVO);
	}

	/**
	 * ?뱀쭅愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param bndtManage - ?뱀쭅愿由?model
	 */
	public void insertBndtManage(BndtManage bndtManage) throws Exception {
		insert("bndtManageDAO.insertBndtManage", bndtManage);
	}

	/**
	 * 湲??깅줉???뱀쭅愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param bndtManage - ?뱀쭅愿由?model
	 */
	public void updtBndtManage(BndtManage bndtManage) throws Exception {
		update("bndtManageDAO.updtBndtManage", bndtManage);
	}

	/**
	 * 湲??깅줉???뱀쭅愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param bndtManage - ?뱀쭅愿由?model
	 */
	public void deleteBndtManage(BndtManage bndtManage) throws Exception {
        delete("bndtManageDAO.deleteBndtManage",bndtManage);
	}

    /**
	 * ?뱀쭅?쇱? 媛쒖닔瑜?議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectBndtDiaryTotCnt(BndtManage bndtManage) throws Exception {
        return (Integer)selectOne("bndtManageDAO.selectBndtDiaryTotCnt", bndtManage);
    }
	
    /***** ?뱀쭅 泥댄겕愿由?*****/	

	/**
	 * ?뱀쭅泥댄겕愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???뱀쭅泥댄겕愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return List - ?뱀쭅泥댄겕愿由?紐⑸줉
	 */
	public List<BndtCeckManageVO> selectBndtCeckManageList(BndtCeckManageVO bndtCeckManageVO) throws Exception {
		return selectList("bndtManageDAO.selectBndtCeckManageList", bndtCeckManageVO);
	}

    /**
	 * ?뱀쭅泥댄겕愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectBndtCeckManageListTotCnt(BndtCeckManageVO bndtCeckManageVO) throws Exception {
        return (Integer)selectOne("bndtManageDAO.selectBndtCeckManageListTotCnt", bndtCeckManageVO);
    }

	/**
	 * ?깅줉???뱀쭅泥댄겕愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return BndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 */
	public BndtCeckManageVO selectBndtCeckManage(BndtCeckManageVO bndtCeckManageVO)  throws Exception {
		return (BndtCeckManageVO) selectOne("bndtManageDAO.selectBndtCeckManage", bndtCeckManageVO);
	}

	/**
	 * ?뱀쭅泥댄겕愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param bndtCeckManage - ?뱀쭅泥댄겕愿由?model
	 */
	public void insertBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception {
		insert("bndtManageDAO.insertBndtCeckManage", bndtCeckManage);
	}

	/**
	 * 湲??깅줉???뱀쭅泥댄겕愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param bndtCeckManage - ?뱀쭅泥댄겕愿由?model
	 */
	public void updtBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception {
		update("bndtManageDAO.updtBndtCeckManage", bndtCeckManage);
	}

	/**
	 * 湲??깅줉???뱀쭅泥댄겕愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param bndtCeckManage - ?뱀쭅泥댄겕愿由?model
	 */
	public void deleteBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception {
        delete("bndtManageDAO.deleteBndtCeckManage",bndtCeckManage);
	}

    /**
	 * ?뱀쭅泥댄겕 以묐났?щ? 議고쉶?쒕떎.
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectBndtCeckManageDplctAt(BndtCeckManage bndtCeckManage) throws Exception {
        return (Integer)selectOne("bndtManageDAO.selectBndtCeckManageDplctAt", bndtCeckManage);
    }
	
    /***** ?뱀쭅 ?쇱? *****/

	/**
	 * ?깅줉???뱀쭅?쇱?愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bndtDiaryVO - ?뱀쭅?쇱?愿由?VO
	 * @return List - ?뱀쭅?쇱?愿由?VO
	 */
	public List<BndtDiaryVO> selectBndtDiary(BndtDiaryVO bndtDiaryVO) throws Exception {
		return selectList("bndtManageDAO.selectBndtDiary", bndtDiaryVO);
	}
	
	/**
	 * ?뱀쭅?쇱?愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param bndtDiary - ?뱀쭅?쇱?愿由?model
	 */
	public void insertBndtDiary(BndtDiary bndtDiary) throws Exception {

		insert("bndtManageDAO.insertBndtDiary", bndtDiary);
	}

	/**
	 * 湲??깅줉???뱀쭅?쇱?愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param bndtDiary - ?뱀쭅?쇱?愿由?model
	 */
	public void updtBndtDiary(BndtDiary bndtDiary) throws Exception {
		update("bndtManageDAO.updtBndtDiary", bndtDiary);
	}

	/**
	 * 湲??깅줉???뱀쭅?쇱?愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param bndtDiary - ?뱀쭅?쇱?愿由?model
	 */
	public void deleteBndtDiary(BndtDiary bndtDiary) throws Exception {
        delete("bndtManageDAO.deleteBndtDiary",bndtDiary);
	}

	
	/**
	 * ?깅줉???뱀쭅愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return BndtManageVO - ?뱀쭅愿由?VO
	 */
	public BndtManageVO selectBndtManageBnde(BndtManageVO bndtManageVO)  throws Exception {
		return (BndtManageVO) selectOne("bndtManageDAO.selectBndtManageBnde", bndtManageVO);
	}
	
    /**
	 * ?뱀쭅愿由??깅줉嫄댁닔 議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectBndtManageMonthCnt(BndtManageVO bndtManageVO) throws Exception {
        return (Integer)selectOne("bndtManageDAO.selectBndtManageMonthCnt", bndtManageVO);
    }
}
