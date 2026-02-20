package egovframework.com.sym.cal.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * ?댁씪??愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎
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
public interface EgovCalRestdeManageService {

	/**
	 * ?쇰컲?щ젰 ?앹뾽 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param restde
	 * @return List(?쇰컲?щ젰 ?앹뾽 ?좎쭨?뺣낫)
	 * @throws Exception
	 */
	List<EgovMap> selectNormalRestdePopup(Restde restde)	throws Exception;

	/**
	 * ?됱젙?щ젰 ?앹뾽 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param restde
	 * @return List(?됱젙?щ젰 ?앹뾽 ?좎쭨?뺣낫)
	 * @throws Exception
	 */
	List<EgovMap> selectAdministRestdePopup(Restde restde)	throws Exception;

	/**
	 * ?쇰컲?щ젰 ?쇨컙 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param restde
	 * @return List(?쇰컲?щ젰 ?쇨컙 ?좎쭨?뺣낫)
	 * @throws Exception
	 */
	List<EgovMap> selectNormalDayCal(Restde restde)	throws Exception;

	/**
	 * ?쇰컲?щ젰 ?쇨컙 ?댁씪??議고쉶?쒕떎.
	 * @param restde
	 * @return List(?쇰컲?щ젰 ?쇨컙 ?댁씪?뺣낫)
	 * @throws Exception
	 */
	List<EgovMap> selectNormalDayRestde(Restde restde)	throws Exception;

	/**
	 * ?쇰컲?щ젰 ?붽컙 ?댁씪??議고쉶?쒕떎.
	 * @param restde
	 * @return List(?쇰컲?щ젰 ?붽컙 ?댁씪?뺣낫)
	 * @throws Exception
	 */
	List<EgovMap> selectNormalMonthRestde(Restde restde)	throws Exception;

	/**
	 * ?됱젙?щ젰 ?쇨컙 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param restde
	 * @return List(?됱젙?щ젰 ?쇨컙 ?좎쭨?뺣낫)
	 * @throws Exception
	 */
	List<EgovMap> selectAdministDayCal(Restde restde)	throws Exception;

	/**
	 * ?됱젙?щ젰 ?쇨컙 ?댁씪??議고쉶?쒕떎.
	 * @param restde
	 * @return List(?됱젙?щ젰 ?쇨컙 ?댁씪?뺣낫)
	 * @throws Exception
	 */
	List<EgovMap> selectAdministDayRestde(Restde restde)	throws Exception;

	/**
	 * ?됱젙?щ젰 ?붽컙 ?댁씪??議고쉶?쒕떎.
	 * @param restde
	 * @return List(?됱젙?щ젰 ?붽컙 ?댁씪?뺣낫)
	 * @throws Exception
	 */
	List<?> selectAdministMonthRestde(Restde restde)	throws Exception;

	/**
	 * ?댁씪????젣?쒕떎.
	 * @param restde
	 * @throws Exception
	 */
	void deleteRestde(Restde restde) throws Exception;

	/**
	 * ?댁씪???깅줉?쒕떎.
	 * @param restde
	 * @throws Exception
	 */
	void insertRestde(Restde restde) throws Exception;

	/**
	 * ?댁씪 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param restde
	 * @return Restde(?댁씪)
	 * @throws Exception
	 */
	Restde selectRestdeDetail(Restde restde) throws Exception;

	/**
	 * ?댁씪 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return List(?댁씪 紐⑸줉)
	 * @throws Exception
	 */
	List<?> selectRestdeList(RestdeVO searchVO) throws Exception;

    /**
     * ?댁씪 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?댁씪 珥?媛쒖닔)
     */
    int selectRestdeListTotCnt(RestdeVO searchVO) throws Exception;

	/**
	 * ?댁씪???섏젙?쒕떎.
	 * @param restde
	 * @throws Exception
	 */
	void updateRestde(Restde restde) throws Exception;

}
