package egovframework.com.sym.prm.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramChangeRequest;
import com.company.project.domain.program.ProgramChangeRequest.ProgramChangeRequestId;
import com.company.project.domain.program.ProgramChangeRequestRepository;
import com.company.project.domain.program.ProgramRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.prm.service.EgovProgrmManageService;
import egovframework.com.sym.prm.service.ProgrmManageDtlVO;
import egovframework.com.sym.prm.service.ProgrmManageVO;
import lombok.RequiredArgsConstructor;

/**
 * 프로그램목록관리 및 프로그램변경관리에 관한 비즈니스 구현 클래스
 * 
 * @author 개발환경 개발팀 이용
 * @since 2009.06.01
 * @version 1.1
 */
@Service("progrmManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovProgrmManageServiceImpl extends EgovAbstractServiceImpl implements EgovProgrmManageService {

	private final ProgramRepository programRepository;
	private final ProgramChangeRequestRepository changeRequestRepository;

	/**
	 * 프로그램 상세정보를 조회
	 */
	@Override
	public ProgrmManageVO selectProgrm(ProgrmManageVO vo) throws Exception {
		return programRepository.findById(vo.getProgrmFileNm())
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 프로그램 목록을 조회
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
	 */
	@Override
	public int selectProgrmListTotCnt(ComDefaultVO vo) throws Exception {
		String searchKeyword = vo.getSearchKeyword() == null ? "" : vo.getSearchKeyword();
		return (int) programRepository.searchByKeyword(searchKeyword, PageRequest.of(0, 1)).getTotalElements();
	}

	/**
	 * 프로그램 정보를 등록
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
	 */
	@Override
	@Transactional
	public void deleteProgrm(ProgrmManageVO vo) throws Exception {
		programRepository.deleteById(vo.getProgrmFileNm());
	}

	/**
	 * 프로그램 파일 존재여부를 조회
	 */
	@Override
	public int selectProgrmNMTotCnt(ComDefaultVO vo) throws Exception {
		return programRepository.existsById(vo.getSearchKeyword()) ? 1 : 0;
	}

	/**
	 * 프로그램변경요청 정보를 조회
	 */
	@Override
	public ProgrmManageDtlVO selectProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
		ProgramChangeRequestId id = ProgramChangeRequestId.builder()
				.progrmFileNm(vo.getProgrmFileNm())
				.requstNo((long) vo.getRqesterNo())
				.build();
		return changeRequestRepository.findById(id)
				.map(this::toDtlVO)
				.orElse(null);
	}

	/**
	 * 프로그램변경요청 목록을 조회
	 */
	@Override
	public List<ProgrmManageDtlVO> selectProgrmChangeRequstList(ComDefaultVO vo) throws Exception {
		String searchKeyword = vo.getSearchKeyword() == null ? "" : vo.getSearchKeyword();
		return changeRequestRepository.findAll().stream()
				.filter(e -> e.getId().getProgrmFileNm().contains(searchKeyword))
				.map(this::toDtlVO)
				.collect(Collectors.toList());
	}

	/**
	 * 프로그램변경요청목록 총건수를 조회한다.
	 */
	@Override
	public int selectProgrmChangeRequstListTotCnt(ComDefaultVO vo) throws Exception {
		return selectProgrmChangeRequstList(vo).size();
	}

	/**
	 * 프로그램변경요청을 등록
	 */
	@Override
	@Transactional
	public void insertProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
		ProgramChangeRequestId id = ProgramChangeRequestId.builder()
				.progrmFileNm(vo.getProgrmFileNm())
				.requstNo((long) vo.getRqesterNo())
				.build();

		ProgramChangeRequest entity = ProgramChangeRequest.builder()
				.id(id)
				.rqesterId(vo.getRqesterPersonId())
				.changeRequstCn(vo.getChangerqesterCn())
				.rqestDe(parseDate(vo.getRqesterDe()))
				.requstSj(vo.getRqesterSj())
				.processStatusCode("A") // 초기 상태: 신청(A)
				.build();
		changeRequestRepository.save(entity);
	}

	/**
	 * 프로그램변경요청을 수정
	 */
	@Override
	@Transactional
	public void updateProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
		ProgramChangeRequestId id = ProgramChangeRequestId.builder()
				.progrmFileNm(vo.getProgrmFileNm())
				.requstNo((long) vo.getRqesterNo())
				.build();
		changeRequestRepository.findById(id).ifPresent(e -> {
			e.update(vo.getRqesterPersonId(), vo.getChangerqesterCn(), parseDate(vo.getRqesterDe()), vo.getRqesterSj());
		});
	}

	/**
	 * 프로그램변경요청을 삭제
	 */
	@Override
	@Transactional
	public void deleteProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception {
		ProgramChangeRequestId id = ProgramChangeRequestId.builder()
				.progrmFileNm(vo.getProgrmFileNm())
				.requstNo((long) vo.getRqesterNo())
				.build();
		changeRequestRepository.deleteById(id);
	}

	/**
	 * 프로그램변경요청 요청번호MAX 정보를 조회
	 */
	@Override
	public ProgrmManageDtlVO selectProgrmChangeRequstNo(ProgrmManageDtlVO vo) throws Exception {
		Long maxNo = changeRequestRepository.findMaxRequstNo() + 1;
		ProgrmManageDtlVO res = new ProgrmManageDtlVO();
		res.setRqesterNo(maxNo.intValue());
		return res;
	}

	/**
	 * 프로그램변경요청처리 목록을 조회
	 */
	@Override
	public List<?> selectChangeRequstProcessList(ComDefaultVO vo) throws Exception {
		// 복잡한 조건 필터링은 스트림으로 처리 (성능 필요 시 QueryDSL 도입 권장)
		return changeRequestRepository.findAll().stream()
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("progrmFileNm", e.getId().getProgrmFileNm());
					map.put("rqesterNo", e.getId().getRequstNo());
					map.put("rqesterPersonId", e.getRqesterId());
					map.put("changerqesterCn", e.getChangeRequstCn());
					map.put("rqesterProcessCn", e.getRequstProcessCn());
					map.put("opetrId", e.getOpetrId());
					map.put("processSttus", e.getProcessStatusCode());
					map.put("processDe", formatDate(e.getProcessDe()));
					map.put("rqesterDe", formatDate(e.getRqestDe()));
					map.put("rqesterSj", e.getRequstSj());
					return map;
				}).collect(Collectors.toList());
	}

	/**
	 * 프로그램변경요청처리목록 총건수를 조회한다.
	 */
	@Override
	public int selectChangeRequstProcessListTotCnt(ComDefaultVO vo) throws Exception {
		return selectChangeRequstProcessList(vo).size();
	}

	/**
	 * 프로그램변경요청처리를 수정
	 */
	@Override
	@Transactional
	public void updateProgrmChangeRequstProcess(ProgrmManageDtlVO vo) throws Exception {
		ProgramChangeRequestId id = ProgramChangeRequestId.builder()
				.progrmFileNm(vo.getProgrmFileNm())
				.requstNo((long) vo.getRqesterNo())
				.build();
		changeRequestRepository.findById(id).ifPresent(e -> {
			e.process(vo.getRqesterProcessCn(), vo.getOpetrId(), vo.getProcessSttus(), parseDate(vo.getProcessDe()));
		});
	}

	/**
	 * 화면에 조회된 메뉴 목록 정보를 데이터베이스에서 삭제
	 */
	@Override
	@Transactional
	public void deleteProgrmManageList(String checkedProgrmFileNmForDel) throws Exception {
		if (checkedProgrmFileNmForDel == null || checkedProgrmFileNmForDel.isEmpty())
			return;
		List<String> delProgrmFileNms = Arrays.asList(checkedProgrmFileNmForDel.split(","));
		changeRequestRepository.deleteAllByIdProgrmFileNmIn(delProgrmFileNms);
		programRepository.deleteAllByIdInBatch(delProgrmFileNms);
	}

	/**
	 * 프로그램변경요청자 Email 정보를 조회 (비즈니스 로직에 따라 구현 필요, 현재는 Mock)
	 */
	@Override
	public ProgrmManageDtlVO selectRqesterEmail(ProgrmManageDtlVO vo) throws Exception {
		// 원본 DAO는 COMVNUSERMASTER를 조인하나, 여기서는 단순화된 형태 제공 혹은 추후 UserRepo 연동
		return vo;
	}

	/* Helper Methods */
	private ProgrmManageVO toVO(Program program) {
		ProgrmManageVO vo = new ProgrmManageVO();
		vo.setProgrmFileNm(program.getProgrmFileNm());
		vo.setProgrmStrePath(program.getProgrmStrePath());
		vo.setProgrmKoreanNm(program.getProgrmKoreanNm());
		vo.setURL(program.getUrl());
		vo.setProgrmDc(program.getProgrmDc());
		return vo;
	}

	private ProgrmManageDtlVO toDtlVO(ProgramChangeRequest e) {
		ProgrmManageDtlVO vo = new ProgrmManageDtlVO();
		vo.setProgrmFileNm(e.getId().getProgrmFileNm());
		vo.setRqesterNo(e.getId().getRequstNo().intValue());
		vo.setRqesterPersonId(e.getRqesterId());
		vo.setChangerqesterCn(e.getChangeRequstCn());
		vo.setRqesterProcessCn(e.getRequstProcessCn());
		vo.setOpetrId(e.getOpetrId());
		vo.setProcessSttus(e.getProcessStatusCode());
		vo.setProcessDe(formatDate(e.getProcessDe()));
		vo.setRqesterDe(formatDate(e.getRqestDe()));
		vo.setRqesterSj(e.getRequstSj());
		return vo;
	}

	private LocalDate parseDate(String dateStr) {
		if (dateStr == null || dateStr.isEmpty())
			return null;
		try {
			return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyyMMdd"));
		} catch (Exception e) {
			return null;
		}
	}

	private String formatDate(LocalDate date) {
		if (date == null)
			return "";
		return date.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
	}
}