package egovframework.com.sym.ccm.icr.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.ccm.icr.service.InsttCodeRecptn;
import egovframework.com.sym.ccm.icr.service.InsttCodeRecptnVO;

/**
 *
 * 湲곌?肄붾뱶??????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2011.09.05  ?쒖???         beforeData?????null泥댄겕 異붽?
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 * </pre>
 */
@Repository("InsttCodeRecptnDAO")
public class InsttCodeRecptnDAO extends EgovComAbstractDAO {

	/**
	 * 湲곌?肄붾뱶?섏떊??泥섎━?쒕떎.
	 * @param insttCode
	 * @throws Exception
	 */
	public void insertInsttCodeRecptn(InsttCodeRecptn insttCodeRecptn) throws Exception {
        insert("InsttCodeRecptnDAO.insertInsttCodeRecptn", insttCodeRecptn);
	}

	/**
	 * 湲곌?肄붾뱶瑜??깅줉?쒕떎.
	 * @param insttCode
	 * @throws Exception
	 */
	public void insertInsttCode(InsttCodeRecptn insttCodeRecptn) throws Exception {
		InsttCodeRecptn beforeData = (InsttCodeRecptn) selectOne("InsttCodeRecptnDAO.selectInsttCodeDetail", insttCodeRecptn);

		if (beforeData != null && beforeData.getInsttCode().equals(insttCodeRecptn.getInsttCode())) {//2011.09.05
			// 湲곕벑濡??먮즺
			insttCodeRecptn.setProcessSe("10");
		} else {
			int rtnValue = update("InsttCodeRecptnDAO.insertInsttCode", insttCodeRecptn);
	        if (rtnValue != 1) {
	        	// ?깅줉 ?ㅻ쪟
	        	insttCodeRecptn.setProcessSe("11");
	        }
        }
    	update("InsttCodeRecptnDAO.updateInsttCodeRecptn", insttCodeRecptn);
	}

	/**
	 * 湲곌?肄붾뱶瑜??섏젙?쒕떎.
	 * @param insttCode
	 * @throws Exception
	 */
	public void updateInsttCode(InsttCodeRecptn insttCodeRecptn) throws Exception {
		int rtnValue = update("InsttCodeRecptnDAO.updateInsttCode", insttCodeRecptn);
        if (rtnValue != 1) {
        	// 蹂寃??ㅻ쪟
        	insttCodeRecptn.setProcessSe("12");
        }
    	update("InsttCodeRecptnDAO.updateInsttCodeRecptn", insttCodeRecptn);
	}

	/**
	 * 湲곌?肄붾뱶瑜???젣?쒕떎.
	 * @param insttCode
	 * @throws Exception
	 */
	public void deleteInsttCode(InsttCodeRecptn insttCodeRecptn) throws Exception {
		int rtnValue = update("InsttCodeRecptnDAO.deleteInsttCode", insttCodeRecptn);
        if (rtnValue != 1) {
        	// ??젣 ?ㅻ쪟
        	insttCodeRecptn.setProcessSe("13");
        }
    	update("InsttCodeRecptnDAO.updateInsttCodeRecptn", insttCodeRecptn);
	}

	/**
	 * 湲곌?肄붾뱶 ?곸꽭?댁뿭??議고쉶?쒕떎.
	 * @param insttCode
	 * @return InsttCode(湲곌?肄붾뱶)
	 */
	public InsttCodeRecptn selectInsttCodeDetail(InsttCodeRecptn insttCodeRecptn) throws Exception {
		return (InsttCodeRecptn) selectOne("InsttCodeRecptnDAO.selectInsttCodeDetail", insttCodeRecptn);
	}


    /**
	 * 湲곌?肄붾뱶?섏떊 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(湲곌?肄붾뱶 紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectInsttCodeRecptnList(InsttCodeRecptnVO searchVO) throws Exception {
        return selectList("InsttCodeRecptnDAO.selectInsttCodeRecptnList", searchVO);
    }

    /**
	 * 湲곌?肄붾뱶?섏떊 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(湲곌?肄붾뱶 珥?媛쒖닔)
     */
    public int selectInsttCodeRecptnListTotCnt(InsttCodeRecptnVO searchVO) throws Exception {
        return (Integer)selectOne("InsttCodeRecptnDAO.selectInsttCodeRecptnListTotCnt", searchVO);
    }

    /**
	 * 湲곌?肄붾뱶 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(湲곌?肄붾뱶 紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectInsttCodeList(InsttCodeRecptnVO searchVO) throws Exception {
        return selectList("InsttCodeRecptnDAO.selectInsttCodeList", searchVO);
    }

    /**
	 * 湲곌?肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(湲곌?肄붾뱶 珥?媛쒖닔)
     */
    public int selectInsttCodeListTotCnt(InsttCodeRecptnVO searchVO) throws Exception {
        return (Integer)selectOne("InsttCodeRecptnDAO.selectInsttCodeListTotCnt", searchVO);
    }
}
