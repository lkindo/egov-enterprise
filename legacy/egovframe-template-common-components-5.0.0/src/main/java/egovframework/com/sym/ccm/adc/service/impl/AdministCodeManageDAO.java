package egovframework.com.sym.ccm.adc.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.ccm.adc.service.AdministCode;
import egovframework.com.sym.ccm.adc.service.AdministCodeVO;

/**
 *
 * ?됱젙肄붾뱶??????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
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
@Repository("AdministCodeManageDAO")
public class AdministCodeManageDAO extends EgovComAbstractDAO {

	/**
	 * ?됱젙肄붾뱶瑜???젣?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	public void deleteAdministCode(AdministCode administCode) throws Exception {
		delete("AdministCodeManageDAO.deleteAdministCode", administCode);
	}


	/**
	 * ?됱젙肄붾뱶瑜??깅줉?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	public void insertAdministCode(AdministCode administCode) throws Exception {
        insert("AdministCodeManageDAO.insertAdministCode", administCode);
	}

	/**
	 * ?됱젙肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param administCode
	 * @return AdministCode(?됱젙肄붾뱶)
	 */
	public AdministCode selectAdministCodeDetail(AdministCode administCode) throws Exception {
		return (AdministCode) selectOne("AdministCodeManageDAO.selectAdministCodeDetail", administCode);
	}


    /**
	 * ?됱젙肄붾뱶 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(?됱젙肄붾뱶 紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectAdministCodeList(AdministCodeVO searchVO) throws Exception {
        return selectList("AdministCodeManageDAO.selectAdministCodeList", searchVO);
    }

    /**
	 * ?됱젙肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?됱젙肄붾뱶 珥?媛쒖닔)
     */
    public int selectAdministCodeListTotCnt(AdministCodeVO searchVO) throws Exception {
        return (Integer)selectOne("AdministCodeManageDAO.selectAdministCodeListTotCnt", searchVO);
    }

	/**
	 * ?됱젙肄붾뱶瑜??섏젙?쒕떎.
	 * @param administCode
	 * @throws Exception
	 */
	public void updateAdministCode(AdministCode administCode) throws Exception {
		update("AdministCodeManageDAO.updateAdministCode", administCode);
	}

}
