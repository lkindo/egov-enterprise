package egovframework.com.sym.ccm.ccc.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import egovframework.com.sym.ccm.ccc.service.CmmnClCode;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;
import egovframework.com.sym.ccm.ccc.service.EgovCcmCmmnClCodeManageService;
import jakarta.annotation.Resource;

/**
*
* 怨듯넻遺꾨쪟肄붾뱶??????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎
*
* @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
* @since 2009.04.01
* @version 1.0
* @see
*
*      <pre>
* << 媛쒖젙?대젰(Modification Information) >>
*
*   ?섏젙??     ?섏젙??          ?섏젙?댁슜
*  -------    --------    ---------------------------
*   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
*
* </pre>
*/
@Service("CmmnClCodeManageService")
public class EgovCcmCmmnClCodeManageServiceImpl extends EgovAbstractServiceImpl implements EgovCcmCmmnClCodeManageService {

	@Resource(name = "CmmnClCodeManageDAO")
	private CmmnClCodeManageDAO cmmnClCodeManageDAO;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovCcmCmmnClCodeManageServiceImpl.class);

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectCmmnClCodeListTotCnt(CmmnClCodeVO searchVO) throws Exception {
        return cmmnClCodeManageDAO.selectCmmnClCodeListTotCnt(searchVO);
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<CmmnClCodeVO> selectCmmnClCodeList(CmmnClCodeVO searchVO) throws Exception {
        return cmmnClCodeManageDAO.selectCmmnClCodeList(searchVO);
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public CmmnClCode selectCmmnClCodeDetail(CmmnClCodeVO cmmnClCodeVO) throws Exception {
    	CmmnClCode ret = cmmnClCodeManageDAO.selectCmmnClCodeDetail(cmmnClCodeVO);
    	return ret;
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶瑜??깅줉?쒕떎.
	 */
	@Override
	public void insertCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception {
		LOGGER.info("TEST4 : ?깅줉 Serviceimpl");
    	cmmnClCodeManageDAO.insertCmmnClCode(cmmnClCodeVO);
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶瑜???젣?쒕떎.
	 */
	@Override
	public void deleteCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception {
		cmmnClCodeManageDAO.deleteCmmnClCode(cmmnClCodeVO);
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶瑜??섏젙?쒕떎.
	 */
	@Override
	public void updateCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception {
		cmmnClCodeManageDAO.updateCmmnClCode(cmmnClCodeVO);

	}

}
