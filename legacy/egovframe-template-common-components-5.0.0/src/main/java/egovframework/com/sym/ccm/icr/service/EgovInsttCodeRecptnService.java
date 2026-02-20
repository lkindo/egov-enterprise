package egovframework.com.sym.ccm.icr.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * 湲곌?肄붾뱶??愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎
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
public interface EgovInsttCodeRecptnService {

	/**
	 * 湲곌?肄붾뱶?섏떊??泥섎━?쒕떎.
	 * @param insttCode
	 * @throws Exception
	 */
	void insertInsttCodeRecptn() throws Exception;

	/**
	 * 湲곌?肄붾뱶 ?곸꽭?댁뿭??議고쉶?쒕떎.
	 * @param insttCode
	 * @return InsttCode(湲곌?肄붾뱶)
	 * @throws Exception
	 */
	InsttCodeRecptn selectInsttCodeDetail(InsttCodeRecptn insttCodeRecptn) throws Exception;

	/**
	 * 湲곌?肄붾뱶?섏떊 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(湲곌?肄붾뱶 紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectInsttCodeRecptnList(InsttCodeRecptnVO searchVO) throws Exception;

    /**
	 * 湲곌?肄붾뱶?섏떊 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(湲곌?肄붾뱶 珥?媛쒖닔)
     */
    int selectInsttCodeRecptnListTotCnt(InsttCodeRecptnVO searchVO) throws Exception;

	/**
	 * 湲곌?肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(湲곌?肄붾뱶 紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectInsttCodeList(InsttCodeRecptnVO searchVO) throws Exception;

    /**
	 * 湲곌?肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(湲곌?肄붾뱶 珥?媛쒖닔)
     */
    int selectInsttCodeListTotCnt(InsttCodeRecptnVO searchVO) throws Exception;
}
