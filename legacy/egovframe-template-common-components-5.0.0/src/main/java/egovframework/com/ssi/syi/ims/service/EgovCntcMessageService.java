package egovframework.com.ssi.syi.ims.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * ?곌퀎硫붿떆吏??愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎
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
public interface EgovCntcMessageService {

	/**
	 * ?곌퀎硫붿떆吏瑜???젣?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	void deleteCntcMessage(CntcMessage cntcMessage) throws Exception;

	/**
	 * ?곌퀎硫붿떆吏 ??ぉ????젣?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	void deleteCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception;

	/**
	 * ?곌퀎硫붿떆吏瑜??깅줉?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	void insertCntcMessage(CntcMessage cntcMessage) throws Exception;

	/**
	 * ?곌퀎硫붿떆吏 ??ぉ???깅줉?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	void insertCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception;

	/**
	 * ?곌퀎硫붿떆吏 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cntcMessage
	 * @return CntcMessage(?곌퀎硫붿떆吏)
	 * @throws Exception
	 */
	CntcMessage selectCntcMessageDetail(CntcMessage cntcMessage) throws Exception;

	/**
	 * ?곌퀎硫붿떆吏??ぉ ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cntcMessage
	 * @return CntcMessage(?곌퀎硫붿떆吏)
	 * @throws Exception
	 */
	CntcMessageItem selectCntcMessageItemDetail(CntcMessageItem cntcMessageItem) throws Exception;

	/**
	 * ?곌퀎硫붿떆吏 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?곌퀎硫붿떆吏 紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectCntcMessageList(CntcMessageVO searchVO) throws Exception;

    /**
	 * ?곌퀎硫붿떆吏 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?곌퀎硫붿떆吏 珥?媛쒖닔)
     */
    int selectCntcMessageListTotCnt(CntcMessageVO searchVO) throws Exception;

	/**
	 * ?곌퀎硫붿떆吏??ぉ 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?곌퀎硫붿떆吏 紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectCntcMessageItemList(CntcMessageItemVO searchVO) throws Exception;

    /**
	 * ?곌퀎硫붿떆吏??ぉ 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?곌퀎硫붿떆吏 珥?媛쒖닔)
     */
    int selectCntcMessageItemListTotCnt(CntcMessageItemVO searchVO) throws Exception;

	/**
	 * ?곌퀎硫붿떆吏瑜??섏젙?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	void updateCntcMessage(CntcMessage cntcMessage) throws Exception;

	/**
	 * ?곌퀎硫붿떆吏 ??ぉ???섏젙?쒕떎.
	 * @param cntcMessage
	 * @throws Exception
	 */
	void updateCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception;
}
