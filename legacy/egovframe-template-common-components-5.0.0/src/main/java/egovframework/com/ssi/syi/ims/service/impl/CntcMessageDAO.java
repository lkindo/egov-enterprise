package egovframework.com.ssi.syi.ims.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.ssi.syi.ims.service.CntcMessage;
import egovframework.com.ssi.syi.ims.service.CntcMessageItem;
import egovframework.com.ssi.syi.ims.service.CntcMessageItemVO;
import egovframework.com.ssi.syi.ims.service.CntcMessageVO;

/**
 *
 * ?곌퀎硫붿떆吏??????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
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
 *
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 * </pre>
 */
@Repository("CntcMessageDAO")
public class CntcMessageDAO extends EgovComAbstractDAO {

	/**
	 * ?곌퀎硫붿떆吏瑜???젣?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	public void deleteCntcMessage(CntcMessage cntcMessage) throws Exception {
		delete("CntcMessageDAO.deleteCntcMessage", cntcMessage);
	}

	/**
	 * ?곌퀎硫붿떆吏 ??ぉ????젣?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	public void deleteCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception {
		delete("CntcMessageDAO.deleteCntcMessageItem", cntcMessageItem);
	}

	/**
	 * ?곌퀎硫붿떆吏瑜??깅줉?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	public void insertCntcMessage(CntcMessage cntcMessage) throws Exception {
		insert("CntcMessageDAO.insertCntcMessage", cntcMessage);
	}

	/**
	 * ?곌퀎硫붿떆吏 ??ぉ???깅줉?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	public void insertCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception {
		insert("CntcMessageDAO.insertCntcMessageItem", cntcMessageItem);
	}

	/**
	 * ?곌퀎硫붿떆吏 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cntcMessage
	 * @return CntcMessage(?곌퀎硫붿떆吏)
	 */
	public CntcMessage selectCntcMessageDetail(CntcMessage cntcMessage) throws Exception {
		return (CntcMessage) selectOne("CntcMessageDAO.selectCntcMessageDetail", cntcMessage);
	}

	/**
	 * ?곌퀎硫붿떆吏??ぉ ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cntcMessage
	 * @return CntcMessage(?곌퀎硫붿떆吏)
	 */
	public CntcMessageItem selectCntcMessageItemDetail(CntcMessageItem cntcMessageItem) throws Exception {
		return (CntcMessageItem) selectOne("CntcMessageDAO.selectCntcMessageItemDetail", cntcMessageItem);
	}

	/**
	 * ?곌퀎硫붿떆吏 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?곌퀎硫붿떆吏 紐⑸줉)
	 * @throws Exception
	 */
	public List<EgovMap> selectCntcMessageList(CntcMessageVO searchVO) throws Exception {
		return selectList("CntcMessageDAO.selectCntcMessageList", searchVO);
	}

	/**
	 * ?곌퀎硫붿떆吏 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return int(?곌퀎硫붿떆吏 珥?媛쒖닔)
	 */
	public int selectCntcMessageListTotCnt(CntcMessageVO searchVO) throws Exception {
		return (Integer) selectOne("CntcMessageDAO.selectCntcMessageListTotCnt", searchVO);
	}

	/**
	 * ?곌퀎硫붿떆吏??ぉ 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?곌퀎硫붿떆吏 紐⑸줉)
	 * @throws Exception
	 */
	public List<EgovMap> selectCntcMessageItemList(CntcMessageItemVO searchVO) throws Exception {
		return selectList("CntcMessageDAO.selectCntcMessageItemList", searchVO);
	}

	/**
	 * ?곌퀎硫붿떆吏??ぉ 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return int(?곌퀎硫붿떆吏 珥?媛쒖닔)
	 */
	public int selectCntcMessageItemListTotCnt(CntcMessageItemVO searchVO) throws Exception {
		return (Integer) selectOne("CntcMessageDAO.selectCntcMessageItemListTotCnt", searchVO);
	}

	/**
	 * ?곌퀎硫붿떆吏瑜??섏젙?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	public void updateCntcMessage(CntcMessage cntcMessage) throws Exception {
		update("CntcMessageDAO.updateCntcMessage", cntcMessage);
	}

	/**
	 * ?곌퀎硫붿떆吏 ??ぉ???섏젙?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	public void updateCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception {
		update("CntcMessageDAO.updateCntcMessageItem", cntcMessageItem);
	}

}
