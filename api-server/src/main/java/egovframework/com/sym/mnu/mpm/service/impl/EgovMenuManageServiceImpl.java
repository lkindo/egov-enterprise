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
import com.company.project.domain.program.ProgramRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.mnu.mpm.service.EgovMenuManageService;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import egovframework.com.sym.prm.service.impl.ProgrmManageDAO;
import lombok.RequiredArgsConstructor;

/**
 * 메뉴목록관리, 생성, 사이트맵을 처리하는 비즈니스 구현 클래스를 정의한다.
 * 
 * @author 개발환경 개발팀 이용
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 개정이력(Modification Information) ==
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.03.20  이용           최초 생성
 *   2024.03.20  Antigravity    JPA 전환 및 현대화
 *
 *      </pre>
 */
@Service("meunManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovMenuManageServiceImpl extends EgovAbstractServiceImpl implements EgovMenuManageService {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovMenuManageServiceImpl.class);

	private final MenuRepository menuRepository;
	private final ProgramRepository programRepository;
	private final ProgrmManageDAO progrmManageDAO; // 프로그램 상세(변경요청) 처리를 위해 유지
	private final EgovExcelService excelZipService;

	/**
	 * 메뉴 상세정보를 조회
	 */
	@Override
	public MenuManageVO selectMenuManage(ComDefaultVO vo) throws Exception {
		return menuRepository.findById(Long.valueOf(vo.getSearchKeyword()))
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 메뉴 목록을 조회
	 */
	@Override
	public List<MenuManageVO> selectMenuManageList(ComDefaultVO vo) throws Exception {
		Pageable pageable = PageRequest.of(vo.getPageIndex() - 1, vo.getPageSize(), Sort.by("id").ascending());
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
	 * 메뉴목록 총건수를 조회한다.
	 */
	@Override
	public int selectMenuManageListTotCnt(ComDefaultVO vo) throws Exception {
		if (vo.getSearchKeyword() != null && !vo.getSearchKeyword().isEmpty()) {
			Pageable pageable = PageRequest.of(0, 1);
			return (int) menuRepository.searchByKeyword(vo.getSearchKeyword(), pageable).getTotalElements();
		}
		return (int) menuRepository.count();
	}

	/**
	 * 메뉴번호를 상위메뉴로 참조하고 있는 메뉴 존재여부를 조회
	 */
	@Override
	public int selectUpperMenuNoByPk(MenuManageVO vo) throws Exception {
		return menuRepository.countByUpperMenuNo(Long.valueOf(vo.getMenuNo()));
	}

	/**
	 * 메뉴번호 존재 여부를 조회한다.
	 */
	@Override
	public int selectMenuNoByPk(MenuManageVO vo) throws Exception {
		return menuRepository.existsById(Long.valueOf(vo.getMenuNo())) ? 1 : 0;
	}

	/**
	 * 메뉴 정보를 등록
	 */
	@Override
	@Transactional
	public void insertMenuManage(MenuManageVO vo) throws Exception {
		menuRepository.save(toEntity(vo));
	}

	/**
	 * 메뉴 정보를 수정
	 */
	@Override
	@Transactional
	public void updateMenuManage(MenuManageVO vo) throws Exception {
		menuRepository.save(toEntity(vo));
	}

	/**
	 * 메뉴 정보를 삭제
	 */
	@Override
	@Transactional
	public void deleteMenuManage(MenuManageVO vo) throws Exception {
		menuRepository.deleteById(Long.valueOf(vo.getMenuNo()));
	}

	/**
	 * 화면에 조회된 메뉴 목록 정보를 데이터베이스에서 삭제
	 */
	@Override
	@Transactional
	public void deleteMenuManageList(String checkedMenuNoForDel) throws Exception {
		List<Long> delMenuNo = Arrays.stream(checkedMenuNoForDel.split(","))
				.map(Long::valueOf)
				.collect(Collectors.toList());
		menuRepository.deleteAllById(delMenuNo);
	}

	/**
	 * 메뉴 목록을 조회 (트리용 전건 조회)
	 */
	@Override
	public List<MenuManageVO> selectMenuList() throws Exception {
		return menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	/* ### 메뉴관련 프로세스 ### */
	@Override
	public List<MenuManageVO> selectMainMenuHead(MenuManageVO vo) throws Exception {
		// 상위메뉴Id가 0(Root)인 메뉴 조회 (eGov 기준)
		// 0번 조회 (Optimized: findAll + filter -> findByUpperMenuNo)
		return menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(0L).stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	public List<MenuManageVO> selectMainMenuLeft(MenuManageVO vo) throws Exception {
		// 특정 상위 메뉴의 하위 메뉴 조회 (Optimized: findAll + filter -> findByUpperMenuNo)
		return menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(Long.valueOf(vo.getMenuNo())).stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	public String selectLastMenuURL(int iMenuNo, String sUniqId) throws Exception {
		Long menuId = (long) iMenuNo;
		Optional<Menu> menuOpt = menuRepository.findById(menuId);
		if (menuOpt.isPresent()) {
			Menu menu = menuOpt.get();
			// 하위 메뉴가 있는지 확인 (Optimized: findAll + filter -> findByUpperMenuNo)
			List<Menu> children = menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(menuId);
			if (!children.isEmpty()) {
				return selectLastMenuURL(children.get(0).getId().intValue(), sUniqId);
			} else {
				// 하위 메뉴가 없으면 본인 프로그램 URL 반환
				if (menu.getProgrmFileNm() != null && !menu.getProgrmFileNm().isEmpty()) {
					return programRepository.findById(menu.getProgrmFileNm())
							.map(Program::getUrl)
							.orElse("");
				}
			}
		}
		return "";
	}

	/* ### 일괄처리 프로세스 ### */
	@Override
	@Transactional
	public boolean menuBndeAllDelete() throws Exception {
		try {
			progrmManageDAO.deleteAllProgrmDtls(); // 변경요청 내역 삭제 (MyBatis 유지)
			menuRepository.deleteAllInBatch(); // 메뉴 삭제
			programRepository.deleteAllInBatch(); // 프로그램 삭제
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
				return "99"; // 데이터 존재 오류
			}

			HSSFWorkbook hssfWB = (HSSFWorkbook) excelZipService.loadWorkbook(inputStream);
			if (hssfWB.getNumberOfSheets() != 2) {
				return "93"; // 시트 개수 오류
			}

			HSSFSheet progrmSheet = hssfWB.getSheetAt(0);
			HSSFSheet menuSheet = hssfWB.getSheetAt(1);

			// 데이터 검증 및 등록 로직
			if (!progrmRegist(progrmSheet))
				return "96";
			if (!menuRegist(menuSheet))
				return "95";

		} catch (Exception e) {
			LOGGER.error("Menu Bundle Regist Error: {}", e.getMessage());
			return "99";
		}
		return "0"; // 성공
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

	/* VO <-> Entity Mapping */
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