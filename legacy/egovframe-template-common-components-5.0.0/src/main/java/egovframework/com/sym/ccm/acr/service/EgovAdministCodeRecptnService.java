package egovframework.com.sym.ccm.acr.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * 踰뺤젙?숈퐫?쒖뿉 愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎
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
public interface EgovAdministCodeRecptnService {

	/**
	 * 踰뺤젙?숈퐫?쒖닔?좎쓣 泥섎━?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	void insertAdministCodeRecptn() throws Exception;

	/**
	 * 踰뺤젙?숈퐫???곸꽭?댁뿭??議고쉶?쒕떎.
	 * @param administCode
	 * @return AdministCode(踰뺤젙?숈퐫??
	 * @throws Exception
	 */
	AdministCodeRecptn selectAdministCodeDetail(AdministCodeRecptn administCodeRecptn) throws Exception;

	/**
	 * 踰뺤젙?숈퐫?쒖닔??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(踰뺤젙?숈퐫??紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectAdministCodeRecptnList(AdministCodeRecptnVO searchVO) throws Exception;

    /**
	 * 踰뺤젙?숈퐫?쒖닔??珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(踰뺤젙?숈퐫??珥?媛쒖닔)
     */
    int selectAdministCodeRecptnListTotCnt(AdministCodeRecptnVO searchVO) throws Exception;

	/**
	 * 踰뺤젙?숈퐫??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(踰뺤젙?숈퐫??紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectAdministCodeList(AdministCodeRecptnVO searchVO) throws Exception;

    /**
	 * 踰뺤젙?숈퐫??珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(踰뺤젙?숈퐫??珥?媛쒖닔)
     */
    int selectAdministCodeListTotCnt(AdministCodeRecptnVO searchVO) throws Exception;
}
