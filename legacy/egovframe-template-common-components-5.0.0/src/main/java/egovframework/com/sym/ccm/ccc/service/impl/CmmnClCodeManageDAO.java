package egovframework.com.sym.ccm.ccc.service.impl;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.ccm.ccc.service.CmmnClCode;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;

/**
*
* 怨듯넻遺꾨쪟肄붾뱶??????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
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
@Repository("CmmnClCodeManageDAO")
public class CmmnClCodeManageDAO extends EgovComAbstractDAO {
	
	private static final Logger LOGGER = LoggerFactory.getLogger(CmmnClCodeManageDAO.class);
	
	   /**
		 * 怨듯넻遺꾨쪟肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
	     * @param searchVO
	     * @return int(怨듯넻遺꾨쪟肄붾뱶 珥?媛쒖닔)
	     */
	    public int selectCmmnClCodeListTotCnt(CmmnClCodeVO searchVO) throws Exception {
	        return (Integer)selectOne("CmmnClCodeManage.selectCmmnClCodeListTotCnt", searchVO);
	    }
	    
	    /**
		 * 怨듯넻遺꾨쪟肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	     * @param searchVO
	     * @return List(怨듯넻遺꾨쪟肄붾뱶 紐⑸줉)
	     * @throws Exception
	     */
	    public List<CmmnClCodeVO> selectCmmnClCodeList(CmmnClCodeVO searchVO) throws Exception {
	        return selectList("CmmnClCodeManage.selectCmmnClCodeList", searchVO);
	    }
	    
	    /**
		 * 怨듯넻遺꾨쪟肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
		 * @param cmmnClCode
		 * @return CmmnClCode(怨듯넻遺꾨쪟肄붾뱶)
		 */
		public CmmnClCode selectCmmnClCodeDetail(CmmnClCode cmmnClCode) throws Exception {
			return (CmmnClCode)selectOne("CmmnClCodeManage.selectCmmnClCodeDetail", cmmnClCode);
		}
		
		/**
		 * 怨듯넻遺꾨쪟肄붾뱶瑜??깅줉?쒕떎.
		 * @param cmmnClCodeVO
		 * @throws Exception
		 */
		public void insertCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception{
			LOGGER.info("TEST5 : ?깅줉 DAO");
			insert("CmmnClCodeManage.insertCmmnClCode", cmmnClCodeVO);
		}

		/**
		 * 怨듯넻遺꾨쪟肄붾뱶瑜???젣?쒕떎.
		 * @param cmmnClCodeVO
		 * @throws Exception
		 */
		public void deleteCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception {
			delete("CmmnClCodeManage.deleteCmmnClCode", cmmnClCodeVO);
			
		}
		
		/**
		 * 怨듯넻遺꾨쪟肄붾뱶瑜??섏젙?쒕떎.
		 * @param cmmnClCodeVO
		 * @throws Exception
		 */
		public void updateCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception{
			update("CmmnClCodeManage.updateCmmnClCode", cmmnClCodeVO);
			
		}

}
