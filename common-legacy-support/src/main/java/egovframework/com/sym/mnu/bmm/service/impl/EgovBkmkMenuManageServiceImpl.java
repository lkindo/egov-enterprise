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
 * ???? ????????? ?????
 * 
 * @author ?????? ?? ???
 * @since 2009.09.25
 * @version 1.0
 **/
@Service("bkmkMenuManageservice")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovBkmkMenuManageServiceImpl extends EgovAbstractServiceImpl implements EgovBkmkMenuManageService {

	private final BkmkMenuRepository bkmkMenuRepository;
	private final MenuRepository menuRepository;

	/**
	 * ??????????????.
	 **/
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
	 * ????????????.
	 **/
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
	 * ???????????????.
	 **/
	@Override
	public Map<String, Object> selectBkmkMenuManageList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception {
		List<BkmkMenu> entities = bkmkMenuRepository.findByIdUserId(bkmkMenuManageVO.getUserId());

		// ?????(??
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
	 * ????????????.
	 **/
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
	 * ????? ?????. (MyBatis ?????-> JPA ???????? QueryDSL ??
	 * ??SQL: NMENUINFO d, NMENUCREATDTLS a, NEMPLYRSCRTYESTBS b, COMVNUSERMASTER c
	 * ??
	 **/
	@Override
	public Map<String, Object> selectMenuList(BkmkMenuManageVO vo) throws Exception {
		// ????????? ????????????? ??? ???
		// (??? ? ? ????? ?? ?? ??????????)
		// MenuRepository?? ?????????? ?????? ? ?????? (?????? ??

		List<com.company.project.domain.menu.Menu> allMenus = menuRepository.findAll();
		List<BkmkMenu> existingBkmks = bkmkMenuRepository.findByIdUserId(vo.getUserId());
		List<Long> bkmkMenuIds = existingBkmks.stream().map(b -> b.getId().getMenuId()).collect(Collectors.toList());

		List<BkmkMenuManageVO> result = allMenus.stream()
				.filter(m -> !"dir".equals(m.getProgrmFileNm())) // ?? ??
				.filter(m -> !bkmkMenuIds.contains(m.getId())) // ??? ??????
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
	 * ??????????? ?????.
	 **/
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
	 * ??????URL ?????.
	 **/
	@Override
	public String selectUrl(BkmkMenuManage bkmkMenuManage) throws Exception {
		return menuRepository.findById(Long.parseLong(bkmkMenuManage.getMenuId()))
				.map(m -> m.getProgrmFileNm()) // ????Program ???????????? ???? ???? ????
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
