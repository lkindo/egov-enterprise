package egovframework.com.ssi.syi.iis.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * ?곌퀎湲곌???愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎
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
public interface EgovCntcInsttService {

	/**
	 * ?곌퀎湲곌?????젣?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	void deleteCntcInstt(CntcInstt cntcInstt) throws Exception;

	/**
	 * ?곌퀎?쒖뒪?쒖쓣 ??젣?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	void deleteCntcSystem(CntcSystem cntcSystem) throws Exception;

	/**
	 * ?곌퀎?쒕퉬?ㅻ? ??젣?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	void deleteCntcService(CntcService cntcService) throws Exception;

	/**
	 * ?곌퀎湲곌????깅줉?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	void insertCntcInstt(CntcInstt cntcInstt) throws Exception;

	/**
	 * ?곌퀎?쒖뒪?쒖쓣 ?깅줉?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	void insertCntcSystem(CntcSystem cntcSystem) throws Exception;

	/**
	 * ?곌퀎?쒕퉬?ㅻ? ?깅줉?쒕떎.
	 * @param cntcService
	 * @throws Exception
	 */
	void insertCntcService(CntcService cntcService) throws Exception;

	/**
	 * ?곌퀎湲곌? ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cntcInstt
	 * @return CntcInstt(?곌퀎湲곌?)
	 * @throws Exception
	 */
	CntcInstt selectCntcInsttDetail(CntcInstt cntcInstt) throws Exception;

	/**
	 * ?곌퀎?쒖뒪???곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cntcInstt
	 * @return CntcInstt(?곌퀎湲곌?)
	 * @throws Exception
	 */
	CntcSystem selectCntcSystemDetail(CntcSystem cntcSystem) throws Exception;

	/**
	 * ?곌퀎?쒕퉬???곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cntcInstt
	 * @return CntcInstt(?곌퀎湲곌?)
	 * @throws Exception
	 */
	CntcService selectCntcServiceDetail(CntcService cntcService) throws Exception;

	/**
	 * ?곌퀎湲곌? 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?곌퀎湲곌? 紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectCntcInsttList(CntcInsttVO searchVO) throws Exception;

    /**
	 * ?곌퀎湲곌? 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?곌퀎湲곌? 珥?媛쒖닔)
     */
    int selectCntcInsttListTotCnt(CntcInsttVO searchVO) throws Exception;

	/**
	 * ?곌퀎?쒖뒪??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?곌퀎?쒖뒪??紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectCntcSystemList(CntcSystemVO searchVO) throws Exception;

    /**
	 * ?곌퀎?쒖뒪??珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?곌퀎?쒖뒪??珥?媛쒖닔)
     */
    int selectCntcSystemListTotCnt(CntcSystemVO searchVO) throws Exception;

	/**
	 * ?곌퀎?쒕퉬??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?곌퀎?쒖뒪??紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectCntcServiceList(CntcServiceVO searchVO) throws Exception;

    /**
	 * ?곌퀎?쒕퉬??珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?곌퀎?쒖뒪??珥?媛쒖닔)
     */
    int selectCntcServiceListTotCnt(CntcServiceVO searchVO) throws Exception;

    /**
	 * ?곌퀎湲곌????섏젙?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	void updateCntcInstt(CntcInstt cntcInstt) throws Exception;

	/**
	 * ?곌퀎?쒖뒪?쒖쓣 ?섏젙?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	void updateCntcSystem(CntcSystem cntcSystem) throws Exception;

	/**
	 * ?곌퀎?쒕퉬???섏젙?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	void updateCntcService(CntcService cntcService) throws Exception;

}
