package egovframework.com.sym.mnu.stm.service.impl;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.mnu.stm.service.SiteMapngVO;
/**
 * ?ъ씠?몃㏊ 議고쉶?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 媛쒕컻?섍꼍 媛쒕컻? ?댁슜
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("siteMapngDAO")
public class SiteMapngDAO extends EgovComAbstractDAO{

	/**
	 * ?ъ씠?몃㏊ 議고쉶
	 * @param vo ComDefaultVO 
	 * @return SiteMapngVO
	 * @exception Exception 
	 */
	public SiteMapngVO selectSiteMapng(ComDefaultVO vo)throws Exception{
		return (SiteMapngVO)selectOne("siteMapngDAO.selectSiteMapng_D", vo); 
	}

	/**
	 * MapCreatId 議고쉶
	 * @param vo ComDefaultVO
	 * @return String
	 * @exception Exception 
	 */
	public String selectSiteMapngByMapCreatID(ComDefaultVO vo)throws Exception{
		return (String)selectOne("siteMapngDAO.selectSiteMapngByMapCreatID", vo); 
	}	
	
}
