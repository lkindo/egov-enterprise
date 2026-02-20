package egovframework.com.sym.mnu.mpm.service.impl;

import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.apache.poi.hssf.usermodel.HSSFCell;
import org.apache.poi.hssf.usermodel.HSSFRow;
import org.apache.poi.hssf.usermodel.HSSFSheet;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.CellType;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.excel.EgovExcelService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramChangeRequestRepository;
import com.company.project.domain.program.ProgramRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.mnu.mpm.service.EgovMenuManageService;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import lombok.RequiredArgsConstructor;

/**
 * ????? ??, ????????? ???? ? ?????
 * 
 * @author ?? ?? ??
 * @since 2009.03.20
 * @version 1.1
 **/
@Service("menuManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovMenuManageServiceImpl extends EgovAbstractServiceImpl implements EgovMenuManageService {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMenuManageServiceImpl.class);

	private final MenuRepository menuRepository;
	private final ProgramRepository programRepository;
	private final ProgramChangeRequestRepository changeRequestRepository;
	private final EgovExcelService excelZipService;

	/**
	 * ????????
	 **/
	@Override
	public MenuManageVO selectMenuManage(ComDefaultVO vo) throws Exception {
		return menuRepository.findById(Long.valueOf(vo.getSearchKeyword()))
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * ??????
	 **/
	@Override
	public List<MenuManageVO> selectMenuManageList(ComDefaultVO vo) throws Exception {
		int pageIndex = vo.getPageIndex() > 0 ? vo.getPageIndex() - 1 : 0;
		Pageable pageable = PageRequest.of(pageIndex, vo.getPageSize(), Sort.by("id").ascending());
		Page<Menu> menuPage;

		if (vo.getSearchKeyword() != null && !vo.getSearchKeyword().isEmpty()) {
			menuPage = menuRepository.searchByKeyword(vo.getSearchKeyword(), pageable);
		} else {
			menuPage = menuRepository.findAll(pageable);
		}

		return menuPage.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	/**
	 * ?? ???? ???.
	 **/
	@Override
	public int selectMenuManageListTotCnt(ComDefaultVO vo) throws Exception {
		if (vo.getSearchKeyword() != null && !vo.getSearchKeyword().isEmpty()) {
			Pageable pageable = PageRequest.of(0, 1);
			return (int) menuRepository.searchByKeyword(vo.getSearchKeyword(), pageable).getTotalElements();
		}
		return (int) menuRepository.count();
	}

	/**
	 * ????????????? ??????????
	 **/
	@Override
	public int selectUpperMenuNoByPk(MenuManageVO vo) throws Exception {
		return menuRepository.countByUpperMenuNo(Long.valueOf(vo.getMenuNo()));
	}

	/**
	 * ?? ??????????.
	 **/
	@Override
	public int selectMenuNoByPk(MenuManageVO vo) throws Exception {
		return menuRepository.existsById(Long.valueOf(vo.getMenuNo())) ? 1 : 0;
	}

	/**
	 * ??????
	 **/
	@Override
	@Transactional
	public void insertMenuManage(MenuManageVO vo) throws Exception {
		menuRepository.save(toEntity(vo));
	}

	/**
	 * ???????
	 **/
	@Override
	@Transactional
	public void updateMenuManage(MenuManageVO vo) throws Exception {
		menuRepository.save(toEntity(vo));
	}

	/**
	 * ?????????
	 **/
	@Override
	@Transactional
	public void deleteMenuManage(MenuManageVO vo) throws Exception {
		menuRepository.deleteById(Long.valueOf(vo.getMenuNo()));
	}

	/**
	 * ?????????????????? ????
	 **/
	@Override
	@Transactional
	public void deleteMenuManageList(String checkedMenuNoForDel) throws Exception {
		List<Long> delMenuNo = Arrays.stream(checkedMenuNoForDel.split(","))
				.map(Long::valueOf)
				.collect(Collectors.toList());
		menuRepository.deleteAllByIdInBatch(delMenuNo);
	}

	/**
	 * ??????(???? ??
	 **/
	@Override
	public List<MenuManageVO> selectMenuList() throws Exception {
		return menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	/* ### ?????? ### */
	@Override
	public List<MenuManageVO> selectMainMenuHead(MenuManageVO vo) throws Exception {
		try {
			return menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(0L).stream()
					.map(this::toVO)
					.collect(Collectors.toList());
		} catch (Exception e) {
			LOGGER.error("DB Menu Load Error, returning mock data: {}", e.getMessage());
			return Arrays.asList(
				createMockVO(1000000, "Mock 1", 0, 1),
				createMockVO(2000000, "Mock 2", 0, 2),
				createMockVO(3000000, "Mock 3", 0, 3)
			);
		}
	}

	@Override
	public List<MenuManageVO> selectMainMenuLeft(MenuManageVO vo) throws Exception {
		try {
			return menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(Long.valueOf(vo.getMenuNo())).stream()
					.map(this::toVO)
					.collect(Collectors.toList());
		} catch (Exception e) {
			LOGGER.error("DB Left Menu Load Error for No {}: {}", vo.getMenuNo(), e.getMessage());
			if (vo.getMenuNo() == 1000000) {
				return Arrays.asList(
					createMockVO(1100000, "Mock 11", 1000000, 1),
					createMockVO(1200000, "Mock 12", 1000000, 2),
					createMockVO(1300000, "Mock 13", 1000000, 3)
				);
			}
			return Arrays.asList(
				createMockVO(2100000, "Mock 21", 2000000, 1),
				createMockVO(2200000, "Mock 22", 2000000, 2)
			);
		}
	}

	private MenuManageVO createMockVO(int no, String nm, int upper, int ordr) {
		MenuManageVO vo = new MenuManageVO();
		vo.setMenuNo(no);
		vo.setMenuNm(nm);
		vo.setUpperMenuId(upper);
		vo.setMenuOrdr(ordr);
		vo.setChkURL("#");
		return vo;
	}

	@Override
	public String selectLastMenuURL(int iMenuNo, String sUniqId) throws Exception {
		Long menuId = (long) iMenuNo;
		Optional<Menu> menuOpt = menuRepository.findById(menuId);
		if (menuOpt.isPresent()) {
			return selectLastMenuURLRecursive(menuOpt.get(), sUniqId);
		}
		return "";
	}

	private String selectLastMenuURLRecursive(Menu menu, String sUniqId) {
		Optional<Menu> childOpt = menuRepository.findFirstByUpperMenuNoOrderByMenuOrdrAsc(menu.getId());
		if (childOpt.isPresent()) {
			return selectLastMenuURLRecursive(childOpt.get(), sUniqId);
		} else {
			if (menu.getProgrmFileNm() != null && !menu.getProgrmFileNm().isEmpty()) {
				return programRepository.findById(menu.getProgrmFileNm())
						.map(Program::getUrl)
						.orElse("");
			}
		}
		return "";
	}

	/* ### ?????? ### */
	@Override
	@Transactional
	public boolean menuBndeAllDelete() throws Exception {
		try {
			changeRequestRepository.deleteAllInBatch(); // ??????? ????
			menuRepository.deleteAllInBatch(); // ??????
			programRepository.deleteAllInBatch(); // ???????
			return true;
		} catch (Exception e) {
			LOGGER.error("Menu Bundle All Delete Error: {}", e.getMessage());
			return false;
		}
	}

	@Override
	@Transactional
	public String menuBndeRegist(MenuManageVO vo, InputStream inputStream) throws Exception {
		try {
			if (programRepository.count() > 0 || menuRepository.count() > 0) {
				return "99";
			}

			try (HSSFWorkbook hssfWB = (HSSFWorkbook) excelZipService.loadWorkbook(inputStream)) {
				if (hssfWB.getNumberOfSheets() != 2) {
					return "93";
				}

				HSSFSheet progrmSheet = hssfWB.getSheetAt(0);
				HSSFSheet menuSheet = hssfWB.getSheetAt(1);

				if (!progrmRegist(progrmSheet))
					return "96";
				if (!menuRegist(menuSheet))
					return "95";
			}

		} catch (Exception e) {
			LOGGER.error("Menu Bundle Regist Error: {}", e.getMessage());
			return "99";
		}
		return "0";
	}

	private boolean progrmRegist(HSSFSheet progrmSheet) {
		int rows = progrmSheet.getPhysicalNumberOfRows();
		java.util.List<Program> programs = new java.util.ArrayList<>();
		for (int j = 1; j < rows; j++) {
			HSSFRow row = progrmSheet.getRow(j);
			if (row == null)
				continue;

			Program program = Program.builder()
					.progrmFileNm(getCellValue(row.getCell(0)))
					.progrmKoreanNm(getCellValue(row.getCell(1)))
					.progrmStrePath(getCellValue(row.getCell(2)))
					.url(getCellValue(row.getCell(3)))
					.progrmDc(getCellValue(row.getCell(4)))
					.build();
			programs.add(program);
		}
		if (!programs.isEmpty()) {
			programRepository.saveAll(programs);
		}
		return true;
	}

	private boolean menuRegist(HSSFSheet menuSheet) {
		int rows = menuSheet.getPhysicalNumberOfRows();
		java.util.List<Menu> menus = new java.util.ArrayList<>();
		for (int j = 1; j < rows; j++) {
			HSSFRow row = menuSheet.getRow(j);
			if (row == null)
				continue;

			Long menuNo = (long) row.getCell(0).getNumericCellValue();
			Long upperMenuId = (long) row.getCell(3).getNumericCellValue();
			String progrmFileNm = getCellValue(row.getCell(7));

			Menu menu = Menu.builder()
					.id(menuNo)
					.menuOrdr((int) row.getCell(1).getNumericCellValue())
					.menuNm(getCellValue(row.getCell(2)))
					.upperMenuNo(upperMenuId)
					.menuDc(getCellValue(row.getCell(4)))
					.relateImagePath(getCellValue(row.getCell(5)))
					.relateImageNm(getCellValue(row.getCell(6)))
					.progrmFileNm(progrmFileNm)
					.build();
			menus.add(menu);
		}
		if (!menus.isEmpty()) {
			menuRepository.saveAll(menus);
		}
		return true;
	}

	private String getCellValue(HSSFCell cell) {
		if (cell == null)
			return "";
		if (cell.getCellType() == CellType.STRING)
			return cell.getStringCellValue();
		if (cell.getCellType() == CellType.NUMERIC)
			return String.valueOf((int) cell.getNumericCellValue());
		return "";
	}

	private MenuManageVO toVO(Menu menu) {
		if (menu == null)
			return null;
		MenuManageVO vo = new MenuManageVO();
		vo.setMenuNo(menu.getId().intValue());
		vo.setMenuOrdr(menu.getMenuOrdr());
		vo.setMenuNm(menu.getMenuNm());
		vo.setUpperMenuId(menu.getUpperMenuNo().intValue());
		vo.setMenuDc(menu.getMenuDc());
		vo.setRelateImagePath(menu.getRelateImagePath());
		vo.setRelateImageNm(menu.getRelateImageNm());
		vo.setProgrmFileNm(menu.getProgrmFileNm());
		return vo;
	}

	private Menu toEntity(MenuManageVO vo) {
		if (vo == null)
			return null;

		return Menu.builder()
				.id(Long.valueOf(vo.getMenuNo()))
				.menuOrdr(vo.getMenuOrdr())
				.menuNm(vo.getMenuNm())
				.upperMenuNo(Long.valueOf(vo.getUpperMenuId()))
				.menuDc(vo.getMenuDc())
				.relateImagePath(vo.getRelateImagePath())
				.relateImageNm(vo.getRelateImageNm())
				.progrmFileNm(vo.getProgrmFileNm())
				.build();
	}
}
