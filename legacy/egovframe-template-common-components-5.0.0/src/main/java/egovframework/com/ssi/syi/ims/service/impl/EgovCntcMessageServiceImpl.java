package egovframework.com.ssi.syi.ims.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.ssi.syi.ims.service.CntcMessage;
import egovframework.com.ssi.syi.ims.service.CntcMessageItem;
import egovframework.com.ssi.syi.ims.service.CntcMessageItemVO;
import egovframework.com.ssi.syi.ims.service.CntcMessageVO;
import egovframework.com.ssi.syi.ims.service.EgovCntcMessageService;
import jakarta.annotation.Resource;

/**
 *
 * ?곌퀎硫붿떆吏??????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("CntcMessageService")
public class EgovCntcMessageServiceImpl extends EgovAbstractServiceImpl implements EgovCntcMessageService {

	@Resource(name = "CntcMessageDAO")
	private CntcMessageDAO cntcMessageDAO;

	/**
	 * ?곌퀎硫붿떆吏瑜???젣?쒕떎.
	 */
	@Override
	public void deleteCntcMessage(CntcMessage cntcMessage) throws Exception {
		cntcMessageDAO.deleteCntcMessage(cntcMessage);
	}

	/**
	 * ?곌퀎硫붿떆吏 ??ぉ????젣?쒕떎.
	 */
	@Override
	public void deleteCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception {
		cntcMessageDAO.deleteCntcMessageItem(cntcMessageItem);
	}

	/**
	 * ?곌퀎硫붿떆吏瑜??깅줉?쒕떎.
	 */
	@Override
	public void insertCntcMessage(CntcMessage cntcMessage) throws Exception {
		cntcMessageDAO.insertCntcMessage(cntcMessage);
	}

	/**
	 * ?곌퀎硫붿떆吏 ??ぉ???깅줉?쒕떎.
	 */
	@Override
	public void insertCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception {
		cntcMessageDAO.insertCntcMessageItem(cntcMessageItem);
	}

	/**
	 * ?곌퀎硫붿떆吏 ?곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public CntcMessage selectCntcMessageDetail(CntcMessage cntcMessage) throws Exception {
		CntcMessage ret = cntcMessageDAO.selectCntcMessageDetail(cntcMessage);
		return ret;
	}

	/**
	 * ?곌퀎硫붿떆吏??ぉ ?곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public CntcMessageItem selectCntcMessageItemDetail(CntcMessageItem cntcMessageItem) throws Exception {
		CntcMessageItem ret = cntcMessageDAO.selectCntcMessageItemDetail(cntcMessageItem);
		return ret;
	}

	/**
	 * ?곌퀎硫붿떆吏 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectCntcMessageList(CntcMessageVO searchVO) throws Exception {
		return cntcMessageDAO.selectCntcMessageList(searchVO);
	}

	/**
	 * ?곌퀎硫붿떆吏 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectCntcMessageListTotCnt(CntcMessageVO searchVO) throws Exception {
		return cntcMessageDAO.selectCntcMessageListTotCnt(searchVO);
	}

	/**
	 * ?곌퀎硫붿떆吏??ぉ 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectCntcMessageItemList(CntcMessageItemVO searchVO) throws Exception {
		return cntcMessageDAO.selectCntcMessageItemList(searchVO);
	}

	/**
	 * ?곌퀎硫붿떆吏??ぉ 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectCntcMessageItemListTotCnt(CntcMessageItemVO searchVO) throws Exception {
		return cntcMessageDAO.selectCntcMessageItemListTotCnt(searchVO);
	}

	/**
	 * ?곌퀎硫붿떆吏瑜??섏젙?쒕떎.
	 */
	@Override
	public void updateCntcMessage(CntcMessage cntcMessage) throws Exception {
		cntcMessageDAO.updateCntcMessage(cntcMessage);
	}

	/**
	 * ?곌퀎硫붿떆吏 ??ぉ???섏젙?쒕떎.
	 */
	@Override
	public void updateCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception {
		cntcMessageDAO.updateCntcMessageItem(cntcMessageItem);
	}

}
