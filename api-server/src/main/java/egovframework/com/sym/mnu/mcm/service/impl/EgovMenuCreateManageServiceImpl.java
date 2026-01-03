package egovframework.com.sym.mnu.mcm.service.impl;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.auth.MenuAuthority;
import com.company.project.domain.auth.MenuAuthority.MenuAuthorityId;
import com.company.project.domain.auth.MenuAuthorityProjection;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.auth.MenuCreatManageProjection;
import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.mnu.mcm.service.EgovMenuCreateManageService;
import egovframework.com.sym.mnu.mcm.service.MenuCreatVO;
import egovframework.com.sym.mnu.mcm.service.MenuSiteMapVO;
import lombok.RequiredArgsConstructor;

/**
 * 메뉴목록, 사이트맵 생성을 처리하는 비즈니스 구현 클래스를 정의한다.
 * 
 * @author 개발환경 개발팀 이용
 * @since 2009.06.01
 * @version 1.0
 */
@Service("meunCreateManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovMenuCreateManageServiceImpl extends EgovAbstractServiceImpl implements EgovMenuCreateManageService {

	private final MenuAuthorityRepository menuAuthorityRepository;
	private final UserAuthorityRepository userAuthorityRepository;
	private final UserRepository userRepository;
	private final MenuRepository menuRepository;

	/**
	 * ID 존재여부를 조회
	 */
	@Override
	public int selectUsrByPk(ComDefaultVO vo) throws Exception {
		return userRepository.findById(vo.getSearchKeyword()).isPresent() ? 1 : 0;
	}

	/**
	 * 메뉴생성 내역을 조회
	 */
	@Override
	public List<EgovMap> selectMenuCreatList(MenuCreatVO vo) throws Exception {
		List<MenuAuthorityProjection> projections = menuAuthorityRepository.selectMenuCreatList(vo.getAuthorCode());
		return projections.stream().map(p -> {
			EgovMap map = new EgovMap();
			map.put("menuNo", p.getMenuNo());
			map.put("menuNm", p.getMenuNm());
			map.put("upperMenuId", p.getUpperMenuNo());
			map.put("chkYeoBu", "Y".equals(p.getRegYn()) ? 1 : 0);
			return map;
		}).collect(Collectors.toList());
	}

	/**
	 * 화면에 조회된 메뉴정보로 메뉴생성내역 데이터베이스에서 입력
	 */
	@Override
	@Transactional
	public void insertMenuCreatList(String checkedAuthorForInsert, String checkedMenuNoForInsert) throws Exception {
		// 이전에 존재하는 권한코드에 대한 메뉴설정내역 삭제
		menuAuthorityRepository.deleteByIdAuthorCode(checkedAuthorForInsert);

		String[] insertMenuNo = checkedMenuNoForInsert.split(",");
		for (String menuNo : insertMenuNo) {
			MenuAuthority menuAuthority = MenuAuthority.builder()
					.id(MenuAuthorityId.builder()
							.authorCode(checkedAuthorForInsert)
							.menuNo(Long.parseLong(menuNo))
							.build())
					.build();
			menuAuthorityRepository.save(menuAuthority);
		}
	}

	/**
	 * 메뉴생성관리 목록을 조회
	 */
	@Override
	public List<EgovMap> selectMenuCreatManagList(ComDefaultVO vo) throws Exception {
		Pageable pageable = PageRequest.of(vo.getPageIndex() - 1, vo.getPageSize(), Sort.by("authorCode").ascending());
		Page<MenuCreatManageProjection> page = menuAuthorityRepository.selectMenuCreatManagList(vo.getSearchKeyword(),
				pageable);

		return page.getContent().stream().map(p -> {
			EgovMap map = new EgovMap();
			map.put("authorCode", p.getAuthorCode());
			map.put("authorNm", p.getAuthorNm());
			map.put("authorDc", p.getAuthorDc());
			map.put("authorCreatDe", p.getAuthorCreatDe());
			map.put("chkYeoBu", p.getChkYeoBu());
			return map;
		}).collect(Collectors.toList());
	}

	/**
	 * ID에 대한 권한코드를 조회
	 */
	@Override
	public MenuCreatVO selectAuthorByUsr(ComDefaultVO vo) throws Exception {
		String userId = vo.getSearchKeyword();
		Optional<User> userOpt = userRepository.findById(userId);
		if (userOpt.isPresent()) {
			String esntlId = userOpt.get().getEsntlId();
			return userAuthorityRepository.findById(esntlId)
					.map(ua -> {
						MenuCreatVO menuCreatVO = new MenuCreatVO();
						menuCreatVO.setAuthorCode(ua.getAuthorCode());
						return menuCreatVO;
					}).orElse(null);
		}
		return null;
	}

	/**
	 * 메뉴생성관리 총건수를 조회한다.
	 */
	@Override
	public int selectMenuCreatManagTotCnt(ComDefaultVO vo) throws Exception {
		Pageable pageable = PageRequest.of(0, 1);
		return (int) menuAuthorityRepository.selectMenuCreatManagList(vo.getSearchKeyword(), pageable)
				.getTotalElements();
	}

	/**
	 * 메뉴생성 사이트맵 내용 조회
	 */
	@Override
	public List<EgovMap> selectMenuCreatSiteMapList(MenuSiteMapVO vo) throws Exception {
		return menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc().stream()
				.map(m -> {
					EgovMap map = new EgovMap();
					map.put("menuNo", m.getId());
					map.put("menuNm", m.getMenuNm());
					map.put("menuOrdr", m.getMenuOrdr());
					map.put("upperMenuId", m.getUpperMenuNo());
					return map;
				}).collect(Collectors.toList());
	}

	/**
	 * 사용자 권한별 사이트맵 내용 조회
	 */
	@Override
	public List<?> selectSiteMapByUser(MenuSiteMapVO vo) throws Exception {
		// creatPersonId is userId in this context (from Controller)
		String userId = vo.getCreatPersonId();
		Optional<User> userOpt = userRepository.findById(userId);
		if (userOpt.isPresent()) {
			String esntlId = userOpt.get().getEsntlId();
			Optional<UserAuthority> uaOpt = userAuthorityRepository.findById(esntlId);
			if (uaOpt.isPresent()) {
				String authorCode = uaOpt.get().getAuthorCode();
				return menuAuthorityRepository.findByIdAuthorCode(authorCode).stream()
						.map(ma -> {
							Optional<Menu> menuOpt = menuRepository.findById(ma.getId().getMenuNo());
							if (menuOpt.isPresent()) {
								Menu m = menuOpt.get();
								EgovMap map = new EgovMap();
								map.put("menuNo", m.getId());
								map.put("menuNm", m.getMenuNm());
								map.put("menuOrdr", m.getMenuOrdr());
								map.put("upperMenuId", m.getUpperMenuNo());
								return map;
							}
							return null;
						})
						.filter(java.util.Objects::nonNull)
						.collect(Collectors.toList());
			}
		}
		return List.of();
	}
}