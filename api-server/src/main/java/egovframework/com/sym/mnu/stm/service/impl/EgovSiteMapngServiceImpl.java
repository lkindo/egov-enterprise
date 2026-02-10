package egovframework.com.sym.mnu.stm.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.auth.MenuAuthority;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.menu.SiteMap;
import com.company.project.domain.menu.SiteMapRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.mnu.stm.service.EgovSiteMapngService;
import egovframework.com.sym.mnu.stm.service.SiteMapngVO;
import lombok.RequiredArgsConstructor;

/**
 * 사이트맵 조회를 처리하는 비즈니스 구현 클래스를 정의한다.
 * 
 * @author 개발환경 개발팀 이용
 * @since 2009.06.01
 * @version 1.0
 */
@Service("siteMapngService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovSiteMapngServiceImpl extends EgovAbstractServiceImpl implements EgovSiteMapngService {

	private final SiteMapRepository siteMapRepository;
	private final MenuAuthorityRepository menuAuthorityRepository;
	private final UserAuthorityRepository userAuthorityRepository;

	/**
	 * 사이트맵 조회
	 */
	@Override
	public SiteMapngVO selectSiteMapng(ComDefaultVO vo) throws Exception {
		String esntlId = vo.getSearchKeyword();

		// 1. 사용자의 권한 코드 조회
		String authorCode = userAuthorityRepository.findById(esntlId)
				.map(ua -> ua.getAuthorCode())
				.orElse(null);

		if (authorCode == null)
			return null;

		// 2. 해당 권한의 맵 생성 ID 조회 (NMENUCREATDTLS)
		// findByIdAuthorCode는 List<MenuAuthority>를 반환하는 커스텀 메서드 또는 쿼리 메서드가 필요함
		String mapCreatId = menuAuthorityRepository.findByIdAuthorCode(authorCode).stream()
				.map(MenuAuthority::getMapngCreatId)
				.filter(java.util.Objects::nonNull)
				.findFirst()
				.orElse(null);

		if (mapCreatId == null)
			return null;

		// 3. 사이트맵 정보 조회 (NSITEMAP)
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