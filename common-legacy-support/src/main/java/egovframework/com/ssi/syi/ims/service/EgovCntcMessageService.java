package egovframework.com.ssi.syi.ims.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * ????????????????????? ???
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ????         ????
 *
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 * </pre>
 **/
public interface EgovCntcMessageService {

	/**
	 * ????????.
	 * @param cntcMessage
	 * @throws Exception
	 **/
	void deleteCntcMessage(CntcMessage cntcMessage) throws Exception;

	/**
	 * ? ??????????.
	 * @param cntcMessage
	 * @throws Exception
	 **/
	void deleteCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception;

	/**
	 * ??????.
	 * @param cntcMessage
	 * @throws Exception
	 **/
	void insertCntcMessage(CntcMessage cntcMessage) throws Exception;

	/**
	 * ? ????????.
	 * @param cntcMessage
	 * @throws Exception
	 **/
	void insertCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception;

	/**
	 * ? ?????????.
	 * @param cntcMessage
	 * @return CntcMessage(?)
	 * @throws Exception
	 **/
	CntcMessage selectCntcMessageDetail(CntcMessage cntcMessage) throws Exception;

	/**
	 * ??????????????.
	 * @param cntcMessage
	 * @return CntcMessage(?)
	 * @throws Exception
	 **/
	CntcMessageItem selectCntcMessageItemDetail(CntcMessageItem cntcMessageItem) throws Exception;

	/**
	 * ? ?????.
	 * @param searchVO
	 * @return List(? ?
	 * @throws Exception
	 **/
	List<EgovMap> selectCntcMessageList(CntcMessageVO searchVO) throws Exception;

    /**
	 * ? ???????.
     * @param searchVO
     * @return int(? ????
     **/
    int selectCntcMessageListTotCnt(CntcMessageVO searchVO) throws Exception;

	/**
	 * ??????????.
	 * @param searchVO
	 * @return List(? ?
	 * @throws Exception
	 **/
	List<EgovMap> selectCntcMessageItemList(CntcMessageItemVO searchVO) throws Exception;

    /**
	 * ????????????.
     * @param searchVO
     * @return int(? ????
     **/
    int selectCntcMessageItemListTotCnt(CntcMessageItemVO searchVO) throws Exception;

	/**
	 * ???????.
	 * @param cntcMessage
	 * @throws Exception
	 **/
	void updateCntcMessage(CntcMessage cntcMessage) throws Exception;

	/**
	 * ? ?????????.
	 * @param cntcMessage
	 * @throws Exception
	 **/
	void updateCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception;
}
