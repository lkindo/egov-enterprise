package egovframework.com.sym.ccm.adc.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.sym.ccm.adc.service.AdministCode;
import egovframework.com.sym.ccm.adc.service.AdministCodeVO;
import egovframework.com.sym.ccm.adc.service.EgovCcmAdministCodeManageService;
import jakarta.annotation.Resource;



/**
 *
 * ?됱젙肄붾뱶??????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("AdministCodeManageService")
public class EgovCcmAdministCodeManageServiceImpl extends EgovAbstractServiceImpl implements EgovCcmAdministCodeManageService {

    @Resource(name="AdministCodeManageDAO")
    private AdministCodeManageDAO administCodeManageDAO;

	/**
	 * ?됱젙肄붾뱶瑜???젣?쒕떎.
	 */
	@Override
	public void deleteAdministCode(AdministCode administCode) throws Exception {
		administCodeManageDAO.deleteAdministCode(administCode);
	}

	/**
	 * ?됱젙肄붾뱶瑜??깅줉?쒕떎.
	 */
	@Override
	public void insertAdministCode(AdministCode administCode) throws Exception {
    	administCodeManageDAO.insertAdministCode(administCode);
	}

	/**
	 * ?됱젙肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public AdministCode selectAdministCodeDetail(AdministCode administCode) throws Exception {
    	AdministCode ret = administCodeManageDAO.selectAdministCodeDetail(administCode);
    	return ret;
	}

	/**
	 * ?됱젙肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectAdministCodeList(AdministCodeVO searchVO) throws Exception {
        return administCodeManageDAO.selectAdministCodeList(searchVO);
	}

	/**
	 * ?됱젙肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectAdministCodeListTotCnt(AdministCodeVO searchVO) throws Exception {
        return administCodeManageDAO.selectAdministCodeListTotCnt(searchVO);
	}

	/**
	 * ?됱젙肄붾뱶瑜??섏젙?쒕떎.
	 */
	@Override
	public void updateAdministCode(AdministCode administCode) throws Exception {
		administCodeManageDAO.updateAdministCode(administCode);
	}

}
