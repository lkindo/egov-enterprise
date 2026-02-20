package egovframework.com.sym.ccm.cca.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.ccm.cca.service.CmmnCode;
import egovframework.com.sym.ccm.cca.service.CmmnCodeVO;
import egovframework.com.sym.ccm.cca.service.EgovCcmCmmnCodeManageService;
import jakarta.annotation.Resource;

/**
*
* 怨듯넻肄붾뱶??????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎
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

@Service("CmmnCodeManageService")
public class EgovCcmCmmnCodeManageServiceImpl extends EgovAbstractServiceImpl implements EgovCcmCmmnCodeManageService{

    @Resource(name="CmmnCodeManageDAO")
    private CmmnCodeManageDAO cmmnCodeManageDAO;

	/**
	 * 怨듯넻肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectCmmnCodeListTotCnt(CmmnCodeVO searchVO) throws Exception {
        return cmmnCodeManageDAO.selectCmmnCodeListTotCnt(searchVO);
	}

	/**
	 * 怨듯넻肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<CmmnCodeVO> selectCmmnCodeList(CmmnCodeVO searchVO) throws Exception {
		return cmmnCodeManageDAO.selectCmmnCodeList(searchVO);
	}

	/**
	 * 怨듯넻肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public CmmnCodeVO selectCmmnCodeDetail(CmmnCodeVO cmmnCodeVO) throws Exception{
		CmmnCodeVO ret = cmmnCodeManageDAO.selectCmmnCodeDetail(cmmnCodeVO);
    	return ret;
	}

	/**
	 * 怨듯넻肄붾뱶瑜??섏젙?쒕떎.
	 */
	@Override
	public void updateCmmnCode(CmmnCodeVO cmmnCodeVO) throws Exception {
		cmmnCodeManageDAO.updateCmmnCode(cmmnCodeVO);
	}

	/**
	 * 怨듯넻肄붾뱶瑜??깅줉?쒕떎.
	 */
	@Override
	public void insertCmmnCode(CmmnCode cmmnCode) throws Exception {
		cmmnCodeManageDAO.insertCmmnCode(cmmnCode);
	}

	/**
	 * 怨듯넻肄붾뱶瑜???젣?쒕떎.
	 */
	@Override
	public void deleteCmmnCode(CmmnCode cmmnCode) throws Exception {
		cmmnCodeManageDAO.deleteCmmnCode(cmmnCode);
	}

}
