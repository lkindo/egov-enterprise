package egovframework.com.sym.mnu.stm.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.mnu.stm.service.EgovSiteMapngService;
import egovframework.com.sym.mnu.stm.service.SiteMapngVO;
import jakarta.annotation.Resource;

/**
 * ?ъ씠?몃㏊ 議고쉶瑜?泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
 *   2024.10.29	LeeBaekHaeng	遺덊븘??@SuppressWarnings("unused") ?쒓굅
 *
 * </pre>
 */
@Service("siteMapngService")
public class EgovSiteMapngServiceImpl extends EgovAbstractServiceImpl implements EgovSiteMapngService{

	@Resource(name="siteMapngDAO")
    private SiteMapngDAO siteMapngDAO;

	/**
	 * ?ъ씠?몃㏊ 議고쉶
	 * @param vo ComDefaultVO
	 * @return SiteMapngVO
	 * @exception Exception
	 */

	@Override
	public SiteMapngVO selectSiteMapng(ComDefaultVO vo) throws Exception {
		String sMapCreatID = null;

		sMapCreatID = siteMapngDAO.selectSiteMapngByMapCreatID(vo);
		vo.setSearchKeyword(sMapCreatID);
        return siteMapngDAO.selectSiteMapng(vo);
	}
}