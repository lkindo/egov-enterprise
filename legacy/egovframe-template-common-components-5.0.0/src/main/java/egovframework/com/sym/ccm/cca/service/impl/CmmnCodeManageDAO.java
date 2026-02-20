package egovframework.com.sym.ccm.cca.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.ccm.cca.service.CmmnCode;
import egovframework.com.sym.ccm.cca.service.CmmnCodeVO;

/**
*
* 怨듯넻肄붾뱶??????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
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

@Repository("CmmnCodeManageDAO")
public class CmmnCodeManageDAO extends    EgovComAbstractDAO {

   /**
	 * 怨듯넻肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(怨듯넻肄붾뱶 珥?媛쒖닔)
     */
	public int selectCmmnCodeListTotCnt(CmmnCodeVO searchVO) throws Exception{
		return (Integer)selectOne("CmmnCodeManage.selectCmmnCodeListTotCnt", searchVO);
	}

   /**
	 * 怨듯넻肄붾뱶 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(怨듯넻肄붾뱶 紐⑸줉)
     * @throws Exception
     */
	public List<CmmnCodeVO> selectCmmnCodeList(CmmnCodeVO searchVO) throws Exception{
		 return selectList("CmmnCodeManage.selectCmmnCodeList", searchVO);
	}

	/**
	 * 怨듯넻肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cmmnCode
	 * @return CmmnCode(怨듯넻肄붾뱶)
	 */
	public CmmnCodeVO selectCmmnCodeDetail(CmmnCodeVO cmmnCodeVO) throws Exception{
		return selectOne("CmmnCodeManage.selectCmmnCodeDetail", cmmnCodeVO);
}

	/**
	 * 怨듯넻肄붾뱶瑜??섏젙?쒕떎.
	 * @param cmmnCode
	 * @throws Exception
	 */
	public void updateCmmnCode(CmmnCode cmmnCode) throws Exception{
		update("CmmnCodeManage.updateCmmnCode", cmmnCode);
	}

	/**
	 * 怨듯넻肄붾뱶瑜??깅줉?쒕떎.
	 * @param cmmnCode
	 * @throws Exception
	 */
	public void insertCmmnCode(CmmnCode cmmnCode) throws Exception{
		insert("CmmnCodeManage.insertCmmnCode", cmmnCode);
	}

	/**
	 * 怨듯넻肄붾뱶瑜???젣?쒕떎.
	 * @param cmmnCode
	 * @throws Exception
	 */
	public void deleteCmmnCode(CmmnCode cmmnCode) {
		delete("CmmnCodeManage.deleteCmmnCode", cmmnCode);
	}

}
