package egovframework.let.sym.mnu.mpm.service.impl;

import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuProjection;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;
import egovframework.com.cmm.ComDefaultVO;
import egovframework.let.sym.mnu.mpm.service.EgovMenuManageService;
import egovframework.let.sym.mnu.mpm.service.MenuManageVO;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 메뉴목록관리, 생성, 사이트맵을 처리하는 비즈니스 구현 클래스 (JPA 전환)
 */
@Service("meunManageService")
@Transactional(readOnly = true)
public class EgovMenuManageServiceImpl extends EgovAbstractServiceImpl
        implements egovframework.let.sym.mnu.mpm.service.EgovMenuManageService {

    @Resource
    private MenuRepository menuRepository;

    @Resource
    private ProgramRepository programRepository;

    @Override
    public MenuManageVO selectMenuManage(ComDefaultVO vo) throws Exception {
        return menuRepository.findById(Long.parseLong(vo.getSearchKeyword()))
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public List<?> selectMenuManageList(ComDefaultVO vo) throws Exception {
        Pageable pageable = PageRequest.of(vo.getFirstIndex() / vo.getRecordCountPerPage(),
                vo.getRecordCountPerPage());
        Page<Menu> result = menuRepository.searchMenus(vo.getSearchKeyword(), pageable);
        return result.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    public int selectMenuManageListTotCnt(ComDefaultVO vo) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Menu> result = menuRepository.searchMenus(vo.getSearchKeyword(), pageable);
        return (int) result.getTotalElements();
    }

    @Override
    public int selectUpperMenuNoByPk(MenuManageVO vo) throws Exception {
        // 상위 메뉴로 사용되고 있는지 확인
        return (int) menuRepository.findAll().stream()
                .filter(m -> m.getUpperMenuNo() != null && m.getUpperMenuNo().equals((long) vo.getMenuNo()))
                .count();
    }

    @Override
    public int selectMenuNoByPk(MenuManageVO vo) throws Exception {
        return menuRepository.existsById((long) vo.getMenuNo()) ? 1 : 0;
    }

    @Override
    @Transactional
    public void insertMenuManage(MenuManageVO vo) throws Exception {
        Menu entity = Menu.builder()
                .id((long) vo.getMenuNo())
                .menuNm(vo.getMenuNm())
                .menuOrdr(vo.getMenuOrdr())
                .upperMenuNo((long) vo.getUpperMenuId())
                .menuDc(vo.getMenuDc())
                .relateImagePath(vo.getRelateImagePath())
                .relateImageNm(vo.getRelateImageNm())
                .progrmFileNm(vo.getProgrmFileNm())
                .build();
        menuRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateMenuManage(MenuManageVO vo) throws Exception {
        // JPA handles update via find and set or save
        insertMenuManage(vo);
    }

    @Override
    @Transactional
    public void deleteMenuManage(MenuManageVO vo) throws Exception {
        menuRepository.deleteById((long) vo.getMenuNo());
    }

    @Override
    @Transactional
    public void deleteMenuManageList(String checkedMenuNoForDel) throws Exception {
        String[] delMenuNo = checkedMenuNoForDel.split(",");
        for (String s : delMenuNo) {
            menuRepository.deleteById(Long.parseLong(s));
        }
    }

    @Override
    public List<?> selectMenuList() throws Exception {
        return menuRepository.findAll().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    public List<?> selectMainMenuHead(MenuManageVO vo) throws Exception {
        return menuRepository.selectMainMenuHead(vo.getTmp_UniqId()).stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());
    }

    @Override
    public List<?> selectMainMenuLeft(MenuManageVO vo) throws Exception {
        return menuRepository.selectMainMenuLeft(vo.getTmp_UniqId()).stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());
    }

    @Override
    public String selectLastMenuURL(int iMenuNo, String sUniqId) throws Exception {
        // legacy logic is complex, simplified version might be needed
        // For now, return URL from program connected to this menu
        return menuRepository.findById((long) iMenuNo)
                .map(m -> programRepository.findById(m.getProgrmFileNm()).map(p -> p.getUrl()).orElse(""))
                .orElse("");
    }

    @Override
    @Transactional
    public boolean menuBndeAllDelete() throws Exception {
        menuRepository.deleteAll();
        return true;
    }

    @Override
    @Transactional
    public String menuBndeRegist(MenuManageVO vo, InputStream inputStream) throws Exception {
        // Excel processing is complex, skip for now in MVP or implement if needed
        return "일괄등록 기능은 추후 구현 예정입니다.";
    }

    private MenuManageVO convertToVo(Menu entity) {
        MenuManageVO vo = new MenuManageVO();
        vo.setMenuNo((int) (long) entity.getId());
        vo.setMenuNm(entity.getMenuNm());
        vo.setMenuOrdr(entity.getMenuOrdr());
        vo.setUpperMenuId((int) (long) (entity.getUpperMenuNo() != null ? entity.getUpperMenuNo() : 0L));
        vo.setMenuDc(entity.getMenuDc());
        vo.setRelateImagePath(entity.getRelateImagePath());
        vo.setRelateImageNm(entity.getRelateImageNm());
        vo.setProgrmFileNm(entity.getProgrmFileNm());
        return vo;
    }

    private MenuManageVO convertToVo(MenuProjection projection) {
        MenuManageVO vo = new MenuManageVO();
        vo.setMenuNo((int) (long) projection.getMenuNo());
        vo.setMenuNm(projection.getMenuNm());
        vo.setMenuOrdr(projection.getMenuOrdr());
        vo.setUpperMenuId((int) (long) (projection.getUpperMenuId() != null ? projection.getUpperMenuId() : 0L));
        vo.setMenuDc(projection.getMenuDc());
        vo.setRelateImagePath(projection.getRelateImagePath());
        vo.setRelateImageNm(projection.getRelateImageNm());
        vo.setProgrmFileNm(projection.getProgrmFileNm());
        vo.setChkURL(projection.getChkURL());
        return vo;
    }
}
