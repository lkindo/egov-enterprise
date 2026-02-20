package egovframework.com.sym.ccm.icr.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * ?????????????????????? ???
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
public interface EgovInsttCodeRecptnService {

	/**
	 * ?????????.
	 * @param insttCode
	 * @throws Exception
	 **/
	void insertInsttCodeRecptn() throws Exception;

	/**
	 * ???????????.
	 * @param insttCode
	 * @return InsttCode(???
	 * @throws Exception
	 **/
	InsttCodeRecptn selectInsttCodeDetail(InsttCodeRecptn insttCodeRecptn) throws Exception;

	/**
	 * ???? ?????.
	 * @param searchVO
	 * @return List(????
	 * @throws Exception
	 **/
	List<EgovMap> selectInsttCodeRecptnList(InsttCodeRecptnVO searchVO) throws Exception;

    /**
	 * ???? ???????.
     * @param searchVO
     * @return int(???????
     **/
    int selectInsttCodeRecptnListTotCnt(InsttCodeRecptnVO searchVO) throws Exception;

	/**
	 * ????????.
	 * @param searchVO
	 * @return List(????
	 * @throws Exception
	 **/
	List<EgovMap> selectInsttCodeList(InsttCodeRecptnVO searchVO) throws Exception;

    /**
	 * ??????????.
     * @param searchVO
     * @return int(???????
     **/
    int selectInsttCodeListTotCnt(InsttCodeRecptnVO searchVO) throws Exception;
}
