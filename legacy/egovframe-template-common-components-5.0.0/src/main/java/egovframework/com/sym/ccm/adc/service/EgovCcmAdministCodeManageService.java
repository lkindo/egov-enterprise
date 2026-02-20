package egovframework.com.sym.ccm.adc.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * ?됱젙肄붾뱶??愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎
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
public interface EgovCcmAdministCodeManageService {

	/**
	 * ?됱젙肄붾뱶瑜???젣?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	void deleteAdministCode(AdministCode administCode) throws Exception;

	/**
	 * ?됱젙肄붾뱶瑜??깅줉?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	void insertAdministCode(AdministCode administCode) throws Exception;

	/**
	 * ?됱젙肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param administCode
	 * @return AdministCode(?됱젙肄붾뱶)
	 * @throws Exception
	 */
	AdministCode selectAdministCodeDetail(AdministCode administCode) throws Exception;

	/**
	 * ?됱젙肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?됱젙肄붾뱶 紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectAdministCodeList(AdministCodeVO searchVO) throws Exception;

    /**
	 * ?됱젙肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?됱젙肄붾뱶 珥?媛쒖닔)
     */
    int selectAdministCodeListTotCnt(AdministCodeVO searchVO) throws Exception;

	/**
	 * ?됱젙肄붾뱶瑜??섏젙?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	void updateAdministCode(AdministCode administCode) throws Exception;

}
