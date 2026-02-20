package egovframework.com.ssi.syi.iis.service;

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
public interface EgovCntcInsttService {

	/**
	 * ?????????.
	 * @param cntcInstt
	 * @throws Exception
	 **/
	void deleteCntcInstt(CntcInstt cntcInstt) throws Exception;

	/**
	 * ????? ?????.
	 * @param cntcInstt
	 * @throws Exception
	 **/
	void deleteCntcSystem(CntcSystem cntcSystem) throws Exception;

	/**
	 * ?????? ?????.
	 * @param cntcInstt
	 * @throws Exception
	 **/
	void deleteCntcService(CntcService cntcService) throws Exception;

	/**
	 * ???????.
	 * @param cntcInstt
	 * @throws Exception
	 **/
	void insertCntcInstt(CntcInstt cntcInstt) throws Exception;

	/**
	 * ????? ???.
	 * @param cntcInstt
	 * @throws Exception
	 **/
	void insertCntcSystem(CntcSystem cntcSystem) throws Exception;

	/**
	 * ?????? ???.
	 * @param cntcService
	 * @throws Exception
	 **/
	void insertCntcService(CntcService cntcService) throws Exception;

	/**
	 * ?? ?????????.
	 * @param cntcInstt
	 * @return CntcInstt(??)
	 * @throws Exception
	 **/
	CntcInstt selectCntcInsttDetail(CntcInstt cntcInstt) throws Exception;

	/**
	 * ??????????????.
	 * @param cntcInstt
	 * @return CntcInstt(??)
	 * @throws Exception
	 **/
	CntcSystem selectCntcSystemDetail(CntcSystem cntcSystem) throws Exception;

	/**
	 * ??????????????.
	 * @param cntcInstt
	 * @return CntcInstt(??)
	 * @throws Exception
	 **/
	CntcService selectCntcServiceDetail(CntcService cntcService) throws Exception;

	/**
	 * ?? ?????.
	 * @param searchVO
	 * @return List(?? ?
	 * @throws Exception
	 **/
	List<EgovMap> selectCntcInsttList(CntcInsttVO searchVO) throws Exception;

    /**
	 * ?? ???????.
     * @param searchVO
     * @return int(?? ????
     **/
    int selectCntcInsttListTotCnt(CntcInsttVO searchVO) throws Exception;

	/**
	 * ??????????.
	 * @param searchVO
	 * @return List(??????
	 * @throws Exception
	 **/
	List<EgovMap> selectCntcSystemList(CntcSystemVO searchVO) throws Exception;

    /**
	 * ????????????.
     * @param searchVO
     * @return int(?????????
     **/
    int selectCntcSystemListTotCnt(CntcSystemVO searchVO) throws Exception;

	/**
	 * ??????????.
	 * @param searchVO
	 * @return List(??????
	 * @throws Exception
	 **/
	List<EgovMap> selectCntcServiceList(CntcServiceVO searchVO) throws Exception;

    /**
	 * ????????????.
     * @param searchVO
     * @return int(?????????
     **/
    int selectCntcServiceListTotCnt(CntcServiceVO searchVO) throws Exception;

    /**
	 * ????????.
	 * @param cntcInstt
	 * @throws Exception
	 **/
	void updateCntcInstt(CntcInstt cntcInstt) throws Exception;

	/**
	 * ????? ????.
	 * @param cntcInstt
	 * @throws Exception
	 **/
	void updateCntcSystem(CntcSystem cntcSystem) throws Exception;

	/**
	 * ?????????.
	 * @param cntcInstt
	 * @throws Exception
	 **/
	void updateCntcService(CntcService cntcService) throws Exception;

}
