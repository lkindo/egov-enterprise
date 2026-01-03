package egovframework.com.sym.prm.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.prm.service.EgovProgrmManageService;
import egovframework.com.sym.prm.service.ProgrmManageDtlVO;
import egovframework.com.sym.prm.service.ProgrmManageVO;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * 프로그램목록관리 및 프로그램변경관리에 관한 비즈니스 구현 클래스를 정의한다.
 * 
 * @author 개발환경 개발팀 이용
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.03.20  이  용          최초 생성
 *   2024.01.03  Antigravity     JPA 전환 (ProgramRepository 연동)
 *
 *      </pre>
 */
@Service("progrmManageService")
@RequiredArgsConstructor
public class EgovProgrmManageServiceImpl extends EgovAbstractServiceImpl implements EgovProgrmManageService {

	private final ProgramRepository programRepository;

	@Resource(name = "progrmManageDAO")
	private ProgrmManageDAO progrmManageDAO;

	/**
	 * 프로그램 상세정보를 조회
	 * 
	 * @param vo ComDefaultVO
	 * @return ProgrmManageVO
	 * @exception Exception
	 */
	@Override
	public ProgrmManageVO selectProgrm(ProgrmManageVO vo) throws Exception {
		return programRepository.findById(vo.getProgrmFileNm())
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 프로그램 목록을 조회
	 * 
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<ProgrmManageVO> selectProgrmList(ComDefaultVO vo) throws Exception {
		int pageIndex = vo.getPageIndex() > 0 ? vo.getPageIndex() - 1 : 0;
		Pageable pageable = PageRequest.of(pageIndex, vo.getRecordCountPerPage(), Sort.by("progrmFileNm").ascending());
		String searchKeyword = vo.getSearchKeyword() == null ? "" : vo.getSearchKeyword();

		Page<Program> page = programRepository.searchByKeyword(searchKeyword, pageable);
		return page.getContent().stream()
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	/**
	 * 프로그램목록 총건수를 조회한다.
	 * 
	 * @param vo ComDefaultVO
	 * @return Integer
	 * @exception Exception
	 */
	@Override
	public int selectProgrmListTotCnt(ComDefaultVO vo) throws Exception {
		String searchKeyword = vo.getSearchKeyword() == null ? "" : vo.getSearchKeyword();
		return (int) programRepository.searchByKeyword(searchKeyword, PageRequest.of(0, 1)).getTotalElements();
	}

	/**
	 * 프로그램 정보를 등록
	 * 
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	@Override
	@Transactional
	public void insertProgrm(ProgrmManageVO vo) throws Exception {
		if (programRepository.existsById(vo.getProgrmFileNm())) {
			throw new DuplicateKeyException("이미 등록된 프로그램파일명입니다.");
		}
		Program program = Program.builder()
				.progrmFileNm(vo.getProgrmFileNm())
				.progrmStrePath(vo.getProgrmStrePath())
				.progrmKoreanNm(vo.getProgrmKoreanNm())
				.url(vo.getURL())
				.progrmDc(vo.getProgrmDc())
				.build();
		programRepository.save(program);
	}

	/**
	 * 프로그램 정보를 수정
	 * 
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	@Override
	@Transactional
	public void updateProgrm(ProgrmManageVO vo) throws Exception {
		Program program = programRepository.findById(vo.getProgrmFileNm())
				.orElseThrow(() -> new IllegalArgumentException("해당 프로그램을 찾을 수 없습니다."));
		program.update(vo.getProgrmStrePath(), vo.getProgrmKoreanNm(), vo.getURL(), vo.getProgrmDc());
	}

	/**
	 * 프로그램 정보를 삭제
	 * 
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 */
	@Override
	@Transactional
	public void deleteProgrm(ProgrmManageVO vo) throws Exception {
		programRepository.deleteById(vo.getProgrmFileNm());
	}

	/**
	 * 프로그램 파일 존재여부를 조회
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectProgrmNMTotCnt(ComDefaultVO vo) throws Exception {
		return programRepository.existsById(vo.getSearchKeyword()) ? 1 : 0;
	}

	/**
	 * 프로그램변경요청 정보를 조회
	 * 
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	public ProgrmManageDtlVO selectProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
		return progrmManageDAO.selectProgrmChangeRequst(vo);
	}

	/**
	 * 프로그램변경요청 목록을 조회
	 * 
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<ProgrmManageDtlVO> selectProgrmChangeRequstList(ComDefaultVO vo) throws Exception {
		return progrmManageDAO.selectProgrmChangeRequstList(vo);
	}

	/**
	 * 프로그램변경요청목록 총건수를 조회한다.
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectProgrmChangeRequstListTotCnt(ComDefaultVO vo) throws Exception {
		return progrmManageDAO.selectProgrmChangeRequstListTotCnt(vo);
	}

	/**
	 * 프로그램변경요청을 등록
	 * 
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	@Transactional
	public void insertProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
		progrmManageDAO.insertProgrmChangeRequst(vo);
	}

	/**
	 * 프로그램변경요청을 수정
	 * 
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	@Transactional
	public void updateProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
		progrmManageDAO.updateProgrmChangeRequst(vo);
	}

	/**
	 * 프로그램변경요청을 삭제
	 * 
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	@Transactional
	public void deleteProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
		progrmManageDAO.deleteProgrmChangeRequst(vo);
	}

	/**
	 * 프로그램변경요청 요청번호MAX 정보를 조회
	 * 
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	public ProgrmManageDtlVO selectProgrmChangeRequstNo(ProgrmManageDtlVO vo) throws Exception {
		return progrmManageDAO.selectProgrmChangeRequstNo(vo);
	}

	/**
	 * 프로그램변경요청처리 목록을 조회
	 * 
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 */
	@Override
	public List<?> selectChangeRequstProcessList(ComDefaultVO vo) throws Exception {
		return progrmManageDAO.selectChangeRequstProcessList(vo);
	}

	/**
	 * 프로그램변경요청처리목록 총건수를 조회한다.
	 * 
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectChangeRequstProcessListTotCnt(ComDefaultVO vo) throws Exception {
		return progrmManageDAO.selectChangeRequstListProcessTotCnt(vo);
	}

	/**
	 * 프로그램변경요청처리를 수정
	 * 
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	@Transactional
	public void updateProgrmChangeRequstProcess(ProgrmManageDtlVO vo) throws Exception {
		progrmManageDAO.updateProgrmChangeRequstProcess(vo);
	}

	/**
	 * 화면에 조회된 메뉴 목록 정보를 데이터베이스에서 삭제
	 * 
	 * @param checkedProgrmFileNmForDel String
	 * @exception Exception
	 */
	@Override
	@Transactional
	public void deleteProgrmManageList(String checkedProgrmFileNmForDel) throws Exception {
		if (checkedProgrmFileNmForDel == null || checkedProgrmFileNmForDel.isEmpty())
			return;
		String[] delProgrmFileNm = checkedProgrmFileNmForDel.split(",");
		for (String element : delProgrmFileNm) {
			programRepository.deleteById(element);
		}
	}

	/**
	 * 프로그램변경요청자 Email 정보를 조회
	 * 
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 */
	@Override
	public ProgrmManageDtlVO selectRqesterEmail(ProgrmManageDtlVO vo) throws Exception {
		return progrmManageDAO.selectRqesterEmail(vo);
	}

	private ProgrmManageVO toVO(Program program) {
		ProgrmManageVO vo = new ProgrmManageVO();
		vo.setProgrmFileNm(program.getProgrmFileNm());
		vo.setProgrmStrePath(program.getProgrmStrePath());
		vo.setProgrmKoreanNm(program.getProgrmKoreanNm());
		vo.setURL(program.getUrl());
		vo.setProgrmDc(program.getProgrmDc());
		return vo;
	}
}