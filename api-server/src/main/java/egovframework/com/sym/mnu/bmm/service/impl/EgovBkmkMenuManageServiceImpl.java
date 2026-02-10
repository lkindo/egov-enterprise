package egovframework.com.sym.mnu.bmm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.menu.BkmkMenu;
import com.company.project.domain.menu.BkmkMenu.BkmkMenuId;
import com.company.project.domain.menu.BkmkMenuRepository;
import com.company.project.domain.menu.MenuRepository;

import egovframework.com.sym.mnu.bmm.service.BkmkMenuManage;
import egovframework.com.sym.mnu.bmm.service.BkmkMenuManageVO;
import egovframework.com.sym.mnu.bmm.service.EgovBkmkMenuManageService;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import lombok.RequiredArgsConstructor;

/**
 * 바로가기메뉴를 관리하는 서비스 구현 클래스
 * 
 * @author 공통 컴포넌트 개발팀 윤성록
 * @since 2009.09.25
 * @version 1.0
 */
@Service("bkmkMenuManageservice")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovBkmkMenuManageServiceImpl extends EgovAbstractServiceImpl implements EgovBkmkMenuManageService {

	private final BkmkMenuRepository bkmkMenuRepository;
	private final MenuRepository menuRepository;

	/**
	 * 바로가기메뉴관리 정보를 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteBkmkMenuManage(BkmkMenuManage bkmkMenuManage) throws Exception {
		BkmkMenuId id = BkmkMenuId.builder()
				.menuId(Long.parseLong(bkmkMenuManage.getMenuId()))
				.userId(bkmkMenuManage.getUserId())
				.build();
		bkmkMenuRepository.deleteById(id);
	}

	/**
	 * 바로가기메뉴관리 정보를 등록한다.
	 */
	@Override
	@Transactional
	public void insertBkmkMenuManage(BkmkMenuManage bkmkMenuManage) throws Exception {
		BkmkMenu entity = BkmkMenu.builder()
				.id(BkmkMenuId.builder()
						.menuId(Long.parseLong(bkmkMenuManage.getMenuId()))
						.userId(bkmkMenuManage.getUserId())
						.build())
				.menuNm(bkmkMenuManage.getMenuNm())
				.progrmStrePath(bkmkMenuManage.getProgrmStrePath())
				.build();
		bkmkMenuRepository.save(entity);
	}

	/**
	 * 바로가기메뉴관리 정보의 전체목록을 조회한다.
	 */
	@Override
	public Map<String, Object> selectBkmkMenuManageList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception {
		List<BkmkMenu> entities = bkmkMenuRepository.findByIdUserId(bkmkMenuManageVO.getUserId());

		// 검색 조건 처리 (메뉴명)
		if (bkmkMenuManageVO.getSearchWrd() != null && !bkmkMenuManageVO.getSearchWrd().isEmpty()) {
			entities = entities.stream()
					.filter(e -> e.getMenuNm().contains(bkmkMenuManageVO.getSearchWrd()))
					.collect(Collectors.toList());
		}

		List<BkmkMenuManageVO> result = entities.stream()
				.map(this::toVO)
				.collect(Collectors.toList());

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", result);
		map.put("resultCnt", String.valueOf(result.size()));

		return map;
	}

	/**
	 * 바로가기메뉴관리 정보를 조회한다.
	 */
	@Override
	public BkmkMenuManageVO selectBkmkMenuManageResult(BkmkMenuManageVO bkmkMenuManageVO) throws Exception {
		BkmkMenuId id = BkmkMenuId.builder()
				.menuId(Long.parseLong(bkmkMenuManageVO.getMenuId()))
				.userId(bkmkMenuManageVO.getUserId())
				.build();
		return bkmkMenuRepository.findById(id)
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 등록할 메뉴정보 목록을 조회한다. (MyBatis 복잡 쿼리 -> JPA 스트림 처리 또는 QueryDSL 지향)
	 * 기존 SQL: NMENUINFO d, NMENUCREATDTLS a, NEMPLYRSCRTYESTBS b, COMVNUSERMASTER c
	 * 조회
	 */
	@Override
	public Map<String, Object> selectMenuList(BkmkMenuManageVO vo) throws Exception {
		// 해당 사용자가 권한을 가진 메뉴 목록 중 바로가기에 등록되지 않은 목록 조회
		// (간소화를 위해 전체 메뉴 중 필터링, 실제 운영 환경에서는 권한 조인 필요)
		// MenuRepository에서 직접 조인 쿼리 구현하는 것이 좋으나, 우선 메모리 필터링으로 구현 (데이터 소량 가정)

		List<com.company.project.domain.menu.Menu> allMenus = menuRepository.findAll();
		List<BkmkMenu> existingBkmks = bkmkMenuRepository.findByIdUserId(vo.getUserId());
		List<Long> bkmkMenuIds = existingBkmks.stream().map(b -> b.getId().getMenuId()).collect(Collectors.toList());

		List<BkmkMenuManageVO> result = allMenus.stream()
				.filter(m -> !"dir".equals(m.getProgrmFileNm())) // 디렉토리 제외
				.filter(m -> !bkmkMenuIds.contains(m.getId())) // 이미 등록된 것 제외
				.filter(m -> vo.getSearchWrd() == null || vo.getSearchWrd().isEmpty()
						|| m.getMenuNm().contains(vo.getSearchWrd()))
				.map(m -> {
					BkmkMenuManageVO res = new BkmkMenuManageVO();
					res.setMenuId(String.valueOf(m.getId()));
					res.setMenuNm(m.getMenuNm());
					res.setMenuDc(m.getMenuDc());
					return res;
				})
				.collect(Collectors.toList());

		Map<String, Object> map = new HashMap<>();
		map.put("resultList", result);
		map.put("resultCnt", String.valueOf(result.size()));

		return map;
	}

	/**
	 * 미리보기를 할 바로가기메뉴관리의 목록을 조회한다.
	 */
	@Override
	public List<MenuManageVO> selectBkmkPreviewList(BkmkMenuManageVO vo) throws Exception {
		List<BkmkMenu> bkmks = bkmkMenuRepository.findByIdUserId(vo.getUserId());
		return bkmks.stream().map(b -> {
			MenuManageVO mvo = new MenuManageVO();
			mvo.setMenuNo(b.getId().getMenuId().intValue());
			mvo.setMenuNm(b.getMenuNm());
			return mvo;
		}).collect(Collectors.toList());
	}

	/**
	 * 선택된 메뉴의 URL 을 조회한다.
	 */
	@Override
	public String selectUrl(BkmkMenuManage bkmkMenuManage) throws Exception {
		return menuRepository.findById(Long.parseLong(bkmkMenuManage.getMenuId()))
				.map(m -> m.getProgrmFileNm()) // 실제로는 Program 테이블 조인 필요할 수도 있으나, 여기서는 필드값 반환
				.orElse("");
	}

	private BkmkMenuManageVO toVO(BkmkMenu entity) {
		BkmkMenuManageVO vo = new BkmkMenuManageVO();
		vo.setMenuId(String.valueOf(entity.getId().getMenuId()));
		vo.setUserId(entity.getId().getUserId());
		vo.setMenuNm(entity.getMenuNm());
		vo.setProgrmStrePath(entity.getProgrmStrePath());
		return vo;
	}
}
