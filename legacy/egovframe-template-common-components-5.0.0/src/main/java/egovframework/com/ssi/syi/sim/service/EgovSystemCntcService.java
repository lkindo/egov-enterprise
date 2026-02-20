package egovframework.com.ssi.syi.sim.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * ?쒖뒪?쒖뿰怨꾩뿉 愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎
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
public interface EgovSystemCntcService {

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ??젣?쒕떎.
	 * @param systemCntc
	 * @throws Exception
	 */
	void deleteSystemCntc(SystemCntc systemCntc) throws Exception;

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ?깅줉?쒕떎.
	 * @param systemCntc
	 * @throws Exception
	 */
	void insertSystemCntc(SystemCntc systemCntc) throws Exception;

	/**
	 * ?쒖뒪?쒖뿰怨??곸꽭??ぉ??議고쉶?쒕떎.
	 * @param systemCntc
	 * @return SystemCntc(?쒖뒪?쒖뿰怨?
	 * @throws Exception
	 */
	SystemCntc selectSystemCntcDetail(SystemCntc systemCntc) throws Exception;

	/**
	 * ?쒖뒪?쒖뿰怨??뱀씤/?뱀씤痍⑥냼?쒕떎.
	 * @param systemCntc
	 * @return SystemCntc(?쒖뒪?쒖뿰怨?
	 * @throws Exception
	 */
	void confirmSystemCntc(SystemCntc systemCntc) throws Exception;

	/**
	 * ?쒖뒪?쒖뿰怨?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?쒖뒪?쒖뿰怨?紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectSystemCntcList(SystemCntcVO searchVO) throws Exception;

    /**
	 * ?쒖뒪?쒖뿰怨?珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?쒖뒪?쒖뿰怨?珥?媛쒖닔)
     */
    int selectSystemCntcListTotCnt(SystemCntcVO searchVO) throws Exception;

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ?섏젙?쒕떎.
	 * @param systemCntc
	 * @throws Exception
	 */
	void updateSystemCntc(SystemCntc systemCntc) throws Exception;

}
