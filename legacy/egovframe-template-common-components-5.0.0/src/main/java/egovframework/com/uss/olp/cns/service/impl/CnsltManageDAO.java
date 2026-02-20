package egovframework.com.uss.olp.cns.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.olp.cns.service.CnsltManageDefaultVO;
import egovframework.com.uss.olp.cns.service.CnsltManageVO;



/**
 *
 * ?곷떞?댁슜??泥섎━?섎뒗 DAO ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("CnsltManageDAO")
public class CnsltManageDAO extends EgovComAbstractDAO {


    /**
	 * ?곷떞?댁슜 湲 紐⑸줉??????곸꽭?댁슜??議고쉶?쒕떎.
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
    public CnsltManageVO selectCnsltListDetail(CnsltManageVO vo) throws Exception {

        return (CnsltManageVO) selectOne("CnsltManageDAO.selectCnsltListDetail", vo);

    }

	/**
	 * ?곷떞?댁슜 湲???섏젙?쒕떎.(議고쉶?섎? ?섏젙)
	 * @param vo
	 * @exception Exception
	 */
    public void updateCnsltInqireCo(CnsltManageVO vo) throws Exception {

        update("CnsltManageDAO.updateCnsltInqireCo", vo);

    }

    /**
	 * ?곷떞?댁슜 湲 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
    public List<EgovMap> selectCnsltList(CnsltManageDefaultVO searchVO) throws Exception {

    	return selectList("CnsltManageDAO.selectCnsltList", searchVO);

    }

    /**
	 * ?곷떞?댁슜 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
    public int selectCnsltListTotCnt(CnsltManageDefaultVO searchVO) {

        return (Integer)selectOne("CnsltManageDAO.selectCnsltListTotCnt", searchVO);

    }

	/**
	 * ?곷떞?댁슜 湲???깅줉?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    public void insertCnsltDtls(CnsltManageVO vo) throws Exception {

        insert("CnsltManageDAO.insertCnsltDtls", vo);

    }

    /**
	 * ?묒꽦鍮꾨?踰덊샇瑜??뺤씤?쒕떎.
	 * @param vo
	 * @return 湲 珥?媛쒖닔
	 */
    public int selectCnsltPasswordConfirmCnt(CnsltManageVO vo) {

        return (Integer)selectOne("CnsltManageDAO.selectCnsltPasswordConfirmCnt", vo);

    }

	/**
	 * ?곷떞?댁슜 湲???섏젙?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    public void updateCnsltDtls(CnsltManageVO vo) throws Exception {

        update("CnsltManageDAO.updateCnsltDtls", vo);

    }

	/**
	 * ?곷떞?댁슜 湲????젣?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    public void deleteCnsltDtls(CnsltManageVO vo) throws Exception {

        delete("CnsltManageDAO.deleteCnsltDtls", vo);

    }


    /**
	 * ?곷떞?듬? 湲 紐⑸줉??????곸꽭?댁슜??議고쉶?쒕떎.
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
    public CnsltManageVO selectCnsltAnswerListDetail(CnsltManageVO vo) throws Exception {

        return (CnsltManageVO) selectOne("CnsltManageDAO.selectCnsltAnswerListDetail", vo);

    }


    /**
	 * ?곷떞?듬? 湲 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
    public List<EgovMap> selectCnsltAnswerList(CnsltManageDefaultVO searchVO) throws Exception {

    	return selectList("CnsltManageDAO.selectCnsltAnswerList", searchVO);

    }

    /**
	 * ?곷떞?듬? 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
    public int selectCnsltAnswerListTotCnt(CnsltManageDefaultVO searchVO) {

        return (Integer)selectOne("CnsltManageDAO.selectCnsltAnswerListTotCnt", searchVO);

    }

	/**
	 * ?곷떞?듬? 湲???섏젙?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    public void updateCnsltDtlsAnswer(CnsltManageVO vo) throws Exception {

        update("CnsltManageDAO.updateCnsltDtlsAnswer", vo);

    }


}
