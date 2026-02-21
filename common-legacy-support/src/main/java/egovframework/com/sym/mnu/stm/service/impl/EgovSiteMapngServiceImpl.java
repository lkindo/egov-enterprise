package egovframework.com.sym.mnu.stm.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.auth.MenuAuthority;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.menu.SiteMapRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.mnu.stm.service.EgovSiteMapngService;
import egovframework.com.sym.mnu.stm.service.SiteMapngVO;
import lombok.RequiredArgsConstructor;

/**
 * ???? ????? ???? ? ?????? ???.
 * 
 * @author ?? ?? ??
 * @since 2009.06.01
 * @version 1.0
 **/
@Service("siteMapngService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovSiteMapngServiceImpl extends EgovAbstractServiceImpl implements EgovSiteMapngService {

	private final SiteMapRepository siteMapRepository;
	private final MenuAuthorityRepository menuAuthorityRepository;
	private final UserAuthorityRepository userAuthorityRepository;

	/**
	 * ???? ??
	 **/
	@Override
	public SiteMapngVO selectSiteMapng(ComDefaultVO vo) throws Exception {
		String esntlId = vo.getSearchKeyword();

		// 1. ????? ?????
		String authorCode = userAuthorityRepository.findById(esntlId)
				.map(ua -> ua.getAuthorCode())
				.orElse(null);

		if (authorCode == null)
			return null;

		// 2. ????????? ID ??(NMENUCREATDTLS)
		// findByIdAuthorCode??List<MenuAuthority>????? ???? ???? ?????? ???
		String mapCreatId = menuAuthorityRepository.findByIdAuthorCode(authorCode).stream()
				.map(MenuAuthority::getMapngCreatId)
				.filter(java.util.Objects::nonNull)
				.findFirst()
				.orElse(null);

		if (mapCreatId == null)
			return null;

		// 3. ???? ? ??(NSITEMAP)
		return siteMapRepository.findById(mapCreatId)
				.map(sm -> {
					SiteMapngVO res = new SiteMapngVO();
					res.setMapCreatId(sm.getMapCreatId());
					res.setBndeFileNm(sm.getBndeFileNm());
					res.setBndeFilePath(sm.getBndeFilePath());
					return res;
				})
				.orElse(null);
	}
}
