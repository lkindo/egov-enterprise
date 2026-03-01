package  egovframework.com.sym.mnu.stm.service;

import egovframework.com.cmm.ComDefaultVO;

/** 
 * 硫붾돱?ъ씠?몃㏊??愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎.
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
public interface EgovSiteMapngService {

	/**
	 * ?ъ씠?몃㏊ 議고쉶
	 * @param vo ComDefaultVO   
	 * @return SiteMapngVO
	 * @exception Exception
	 */
	SiteMapngVO selectSiteMapng(ComDefaultVO vo) throws Exception;
}
