package egovframework.com.sym.cal.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.cal.service.Restde;
import egovframework.com.sym.cal.service.RestdeVO;

/**
 *
 * ?댁씪??????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
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
@Repository("RestdeManageDAO")
public class RestdeManageDAO extends EgovComAbstractDAO {

	/**
	 * ?쇰컲?щ젰 ?앹뾽 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param restde
	 * @return List(?쇰컲?щ젰 ?앹뾽 ?좎쭨?뺣낫)
	 * @throws Exception
	 */
    public List<EgovMap> selectNormalRestdePopup(Restde restde) throws Exception {
        return selectList("RestdeManageDAO.selectNormalRestdePopup", restde);
	}

	/**
	 * ?됱젙?щ젰 ?앹뾽 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param restde
	 * @return List(?됱젙?щ젰 ?앹뾽 ?좎쭨?뺣낫)
	 * @throws Exception
	 */
    public List<EgovMap> selectAdministRestdePopup(Restde restde) throws Exception {
        return selectList("RestdeManageDAO.selectAdministRestdePopup", restde);
	}

	/**
	 * ?쇰컲?щ젰 ?쇨컙 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param restde
	 * @return List(?쇰컲?щ젰 ?쇨컙 ?좎쭨?뺣낫)
	 * @throws Exception
	 */
    public List<EgovMap> selectNormalDayCal(Restde restde) throws Exception {
        return selectList("RestdeManageDAO.selectNormalDayCal", restde);
	}

	/**
	 * ?쇰컲?щ젰 ?쇨컙 ?댁씪??議고쉶?쒕떎.
	 * @param restde
	 * @return List(?쇰컲?щ젰 ?쇨컙 ?댁씪?뺣낫)
	 * @throws Exception
	 */
    public List<EgovMap> selectNormalDayRestde(Restde restde) throws Exception {
        return selectList("RestdeManageDAO.selectNormalDayRestde", restde);
	}

	/**
	 * ?쇰컲?щ젰 ?붽컙 ?댁씪??議고쉶?쒕떎.
	 * @param restde
	 * @return List(?쇰컲?щ젰 ?붽컙 ?댁씪?뺣낫)
	 * @throws Exception
	 */
    public List<EgovMap> selectNormalMonthRestde(Restde restde) throws Exception {
        return selectList("RestdeManageDAO.selectNormalMonthRestde", restde);
	}

	/**
	 * ?됱젙?щ젰 ?쇨컙 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param restde
	 * @return List(?됱젙?щ젰 ?쇨컙 ?좎쭨?뺣낫)
	 * @throws Exception
	 */
    public List<EgovMap> selectAdministDayCal(Restde restde) throws Exception {
        return selectList("RestdeManageDAO.selectAdministDayCal", restde);
	}

	/**
	 * ?됱젙?щ젰 ?쇨컙 ?댁씪??議고쉶?쒕떎.
	 * @param restde
	 * @return List(?됱젙?щ젰 ?쇨컙 ?댁씪?뺣낫)
	 * @throws Exception
	 */
    public List<EgovMap> selectAdministDayRestde(Restde restde) throws Exception {
        return selectList("RestdeManageDAO.selectAdministDayRestde", restde);
	}

	/**
	 * ?됱젙?щ젰 ?붽컙 ?댁씪??議고쉶?쒕떎.
	 * @param restde
	 * @return List(?됱젙?щ젰 ?붽컙 ?댁씪?뺣낫)
	 * @throws Exception
	 */
    public List<EgovMap> selectAdministMonthRestde(Restde restde) throws Exception {
        return selectList("RestdeManageDAO.selectAdministMonthRestde", restde);
	}

	/**
	 * ?댁씪????젣?쒕떎.
	 * @param restde
	 * @throws Exception
	 */
	public void deleteRestde(Restde restde) throws Exception {
		delete("RestdeManageDAO.deleteRestde", restde);
	}


	/**
	 * ?댁씪???깅줉?쒕떎.
	 * @param restde
	 * @throws Exception
	 */
	public void insertRestde(Restde restde) throws Exception {
        insert("RestdeManageDAO.insertRestde", restde);
	}

	/**
	 * ?댁씪 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param restde
	 * @return Restde(?댁씪)
	 * @throws Exception
	 */
	public Restde selectRestdeDetail(Restde restde) throws Exception {
		return (Restde) selectOne("RestdeManageDAO.selectRestdeDetail", restde);
	}


    /**
     * ?댁씪 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
	 * @return List(?댁씪 紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectRestdeList(RestdeVO searchVO) throws Exception {
        return selectList("RestdeManageDAO.selectRestdeList", searchVO);
    }

    /**
     * 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?댁씪 珥?媛쒖닔)
     * @throws Exception
     */
    public int selectRestdeListTotCnt(RestdeVO searchVO) throws Exception {
        return (Integer)selectOne("RestdeManageDAO.selectRestdeListTotCnt", searchVO);
    }

	/**
	 * ?댁씪???섏젙?쒕떎.
	 * @param restde
	 * @throws Exception
	 */
	public void updateRestde(Restde restde) throws Exception {
		update("RestdeManageDAO.updateRestde", restde);
	}

}
