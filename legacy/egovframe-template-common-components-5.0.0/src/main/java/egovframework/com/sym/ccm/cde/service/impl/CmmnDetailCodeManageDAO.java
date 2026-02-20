package egovframework.com.sym.ccm.cde.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.ccm.cde.service.CmmnDetailCodeVO;

/**
*
* 怨듯넻?곸꽭肄붾뱶??????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
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

@Repository("CmmnDetailCodeManageDAO")
public class CmmnDetailCodeManageDAO extends EgovComAbstractDAO {

    /**
	 * 怨듯넻?곸꽭肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(怨듯넻?곸꽭肄붾뱶 珥?媛쒖닔)
     */
    public int selectCmmnDetailCodeListTotCnt(CmmnDetailCodeVO searchVO) throws Exception {
        return (Integer)selectOne("CmmnDetailCodeManage.selectCmmnDetailCodeListTotCnt", searchVO);
    }
    
    /**
	 * 怨듯넻?곸꽭肄붾뱶 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(怨듯넻?곸꽭肄붾뱶 紐⑸줉)
     * @throws Exception
     */
    public List<CmmnDetailCodeVO> selectCmmnDetailCodeList(CmmnDetailCodeVO searchVO) throws Exception {
        return selectList("CmmnDetailCodeManage.selectCmmnDetailCodeList", searchVO);
    }

	/**
	 * 怨듯넻?곸꽭肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cmmnDetailCodeVO
	 * @return CmmnDetailCodeVO(怨듯넻?곸꽭肄붾뱶)
	 */
	public CmmnDetailCode selectCmmnDetailCodeDetail(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception{
		return (CmmnDetailCode) selectOne("CmmnDetailCodeManage.selectCmmnDetailCodeDetail", cmmnDetailCodeVO);
	}
	
	/**
	 * 怨듯넻?곸꽭肄붾뱶瑜???젣?쒕떎.
	 * @param cmmnDetailCodeVO
	 * @throws Exception
	 */
	public void deleteCmmnDetailCode(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception{
		delete("CmmnDetailCodeManage.deleteCmmnDetailCode", cmmnDetailCodeVO);
		
	}

	/**
	 * 怨듯넻?곸꽭肄붾뱶瑜??깅줉?쒕떎.
	 * @param cmmnDetailCodeVO
	 * @throws Exception
	 */
	public void insertCmmnDetailCode(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception{
		insert("CmmnDetailCodeManage.insertCmmnDetailCode", cmmnDetailCodeVO);
		
	}

	/**
	 * 怨듯넻?곸꽭肄붾뱶瑜??섏젙?쒕떎.
	 * @param cmmnDetailCodeVO
	 * @throws Exception
	 */
	public void updateCmmnDetailCode(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception{
		insert("CmmnDetailCodeManage.updateCmmnDetailCode", cmmnDetailCodeVO);
		
	}
    
}
