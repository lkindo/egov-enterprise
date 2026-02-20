package egovframework.com.sym.ccm.ccc.service;

import java.util.List;

/**
 *
 * 怨듯넻遺꾨쪟肄붾뱶??愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎
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
 * </pre>
 */


public interface EgovCcmCmmnClCodeManageService {

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @return int(怨듯넻遺꾨쪟肄붾뱶 珥?媛쒖닔)
	 */
	int selectCmmnClCodeListTotCnt(CmmnClCodeVO searchVO) throws Exception;

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(怨듯넻遺꾨쪟肄붾뱶 紐⑸줉)
	 * @throws Exception
	 */
	List<CmmnClCodeVO> selectCmmnClCodeList(CmmnClCodeVO searchVO) throws Exception;

	 /**
	  *  怨듯넻遺꾨쪟肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	  * @param cmmnClCode
	  * @return CmmnClCode(怨듯넻遺꾨쪟肄붾뱶)
	  *  @throws Exception
	  */
	CmmnClCode selectCmmnClCodeDetail(CmmnClCodeVO cmmnClCodeVO) throws Exception;

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶瑜??깅줉?쒕떎.
	 * @param cmmnClCodeVO
	 * @throws Exception
	 */
	void insertCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception;
	
	/**
	 * 怨듯넻遺꾨쪟肄붾뱶瑜???젣?쒕떎.
	 * @param cmmnClCodeVO
	 * @throws Exception
	 */
	void deleteCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception;
	
	/**
	 * 怨듯넻遺꾨쪟肄붾뱶瑜??섏젙?쒕떎.
	 * @param cmmnClCodeVO
	 * @throws Exception
	 */
	void updateCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception;

}
