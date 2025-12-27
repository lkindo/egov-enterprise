package egovframework.let.sym.mnu.mcm.service.impl;

import com.company.project.domain.auth.Authority;
import com.company.project.domain.auth.MenuAuthority;
import com.company.project.domain.auth.MenuAuthorityProjection;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.user.UserRepository;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.let.sym.mnu.mcm.service.EgovMenuCreateManageService;
import egovframework.let.sym.mnu.mcm.service.MenuCreatVO;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 메뉴목록, 사이트맵 생성을 처리하는 비즈니스 구현 클래스 (JPA 전환)
 */
@Service("meunCreateManageService")
@Transactional(readOnly = true)
public class EgovMenuCreateManageServiceImpl extends EgovAbstractServiceImpl implements EgovMenuCreateManageService {

    @Resource
    private MenuAuthorityRepository menuAuthorityRepository;

    @Resource
    private UserRepository userRepository;

    @Override
    public int selectUsrByPk(ComDefaultVO vo) throws Exception {
        // legacy logically checks if user exists in any of 3 user tables
        // For now, we only have User entity (NEMPLYRINFO)
        return userRepository.existsById(vo.getSearchKeyword()) ? 1 : 0;
    }

    @Override
    public List<?> selectMenuCreatList(MenuCreatVO vo) throws Exception {
        return menuAuthorityRepository.selectMenuCreatList(vo.getAuthorCode()).stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void insertMenuCreatList(String checkedAuthorForInsert, String checkedMenuNoForInsert) throws Exception {
        // 이전에 존재하는 권한코드에 대한 메뉴설정내역 삭제
        menuAuthorityRepository.deleteByIdAuthorCode(checkedAuthorForInsert);

        String[] insertMenuNo = checkedMenuNoForInsert.split(",");
        for (String menuNo : insertMenuNo) {
            MenuAuthority entity = MenuAuthority.builder()
                    .id(new MenuAuthority.MenuAuthorityId(checkedAuthorForInsert, Long.parseLong(menuNo)))
                    .build();
            menuAuthorityRepository.save(entity);
        }
    }

    @Override
    public List<?> selectMenuCreatManagList(ComDefaultVO vo) throws Exception {
        Pageable pageable = PageRequest.of(vo.getFirstIndex() / vo.getRecordCountPerPage(),
                vo.getRecordCountPerPage());
        Page<Authority> result = menuAuthorityRepository.selectMenuCreatManagList(vo.getSearchKeyword(), pageable);
        return result.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    public MenuCreatVO selectAuthorByUsr(ComDefaultVO vo) throws Exception {
        // logic for getting author code by user ID
        // This usually involves UserAuthority (NEMPLYRSCRTYESTBS)
        // For now, this is a placeholder or should be implemented if needed
        return null;
    }

    @Override
    public int selectMenuCreatManagTotCnt(ComDefaultVO vo) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Authority> result = menuAuthorityRepository.selectMenuCreatManagList(vo.getSearchKeyword(), pageable);
        return (int) result.getTotalElements();
    }

    private MenuCreatVO convertToVo(MenuAuthorityProjection projection) {
        MenuCreatVO vo = new MenuCreatVO();
        vo.setMenuNo((int) (long) projection.getMenuNo());
        vo.setMenuNm(projection.getMenuNm());
        vo.setUpperMenuId((int) (long) (projection.getUpperMenuNo() != null ? projection.getUpperMenuNo() : 0L));
        vo.setRegYn(projection.getRegYn());
        return vo;
    }

    private MenuCreatVO convertToVo(Authority entity) {
        MenuCreatVO vo = new MenuCreatVO();
        vo.setAuthorCode(entity.getAuthorCode());
        vo.setAuthorNm(entity.getAuthorNm());
        vo.setAuthorDc(entity.getAuthorDc());
        // vo.setAuthorCreatDe(entity.getAuthorCreatDe().toString());
        return vo;
    }
}
