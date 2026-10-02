package nuri.business.service.program;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.common.BaseSearchDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.program.Program;
import nuri.business.domain.program.ProgramRepository;
import nuri.business.service.program.dto.ProgramDto;
import nuri.business.service.program.dto.ProgramMapper;
import nuri.business.security.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProgramService {

    private final ProgramRepository programRepository;
    private final ProgramMapper programMapper;

    /**
     * 프로그램 목록 조회
     */
    public List<ProgramDto> selectProgrmList(BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable(Sort.by("prgrmFileNm").ascending());
        String keyword = searchVO.getSearchKeyword();

        Page<Program> page;
        if (keyword != null && !keyword.isEmpty()) {
            page = programRepository.searchByKeyword(keyword, pageable);
        } else {
            page = programRepository.findAll(pageable);
        }

        return page.getContent().stream()
                .map(programMapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * 프로그램 목록 총 갯수 조회
     */
    public int selectProgrmListTotCnt(BaseSearchDto searchVO) {
        String keyword = searchVO.getSearchKeyword();
        if (keyword != null && !keyword.isEmpty()) {
            return (int) programRepository.searchByKeyword(keyword, PageRequest.of(0, 1)).getTotalElements();
        }
        return (int) programRepository.count();
    }

    /**
     * 프로그램 상세 조회
     */
    public ProgramDto selectProgrm(BaseSearchDto searchVO) {
        if (searchVO.getSearchKeyword() == null)
            // null 검색어는 '못 찾음'(404)이 아니라 '잘못된 입력'(400) — ENTITY_NOT_FOUND 404 전환에 맞춰 정정
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        return programRepository.findById(searchVO.getSearchKeyword())
                .map(programMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
    }

    public ProgramDto selectProgrmById(String prgrmFileNm) {
        return programRepository.findById(Objects.requireNonNull(prgrmFileNm))
                .map(programMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
    }

    /**
     * 프로그램 등록
     *
     * <p>등록은 신규 전용이다. 프로그램 파일명이 식별자라 {@code save()} 가 같은 이름의 행을 병합(merge)하므로,
     * 이미 있는 이름으로 등록하면 메뉴가 참조하는 프로그램의 경로·URL 을 조용히 덮어썼다
     * (2026-09-25 DIP I4). 이미 있으면 409 로 거부한다.</p>
     */
    @Transactional
    @CacheEvict(value = { "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void insertProgrm(ProgramDto dto) {
        SecurityUtil.assertPermission("PROGRAM_CREATE");
        if (programRepository.existsById(Objects.requireNonNull(dto.getPrgrmFileNm()))) {
            throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE,
                    "이미 등록된 프로그램 파일명입니다: " + dto.getPrgrmFileNm());
        }
        Program program = Program.builder()
                .prgrmFileNm(dto.getPrgrmFileNm())
                .prgrmStrgPath(dto.getPrgrmStrgPath())
                .prgrmKornNm(dto.getPrgrmKornNm())
                .url(dto.getUrl())
                .prgrmExpln(dto.getPrgrmExpln())
                .build();
        programRepository.save(Objects.requireNonNull(program));
    }

    /**
     * 프로그램 정보 수정
     */
    @Transactional
    @CacheEvict(value = { "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void updateProgrm(ProgramDto dto) {
        SecurityUtil.assertPermission("PROGRAM_UPDATE");
        Program program = programRepository.findById(Objects.requireNonNull(dto.getPrgrmFileNm()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        program.update(dto.getPrgrmStrgPath(), dto.getPrgrmKornNm(), dto.getUrl(), dto.getPrgrmExpln());
    }

    /**
     * 프로그램 삭제
     */
    @Transactional
    @CacheEvict(value = { "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void deleteProgrm(ProgramDto dto) {
        SecurityUtil.assertPermission("PROGRAM_DELETE");
        assertNotReferenced(Objects.requireNonNull(dto.getPrgrmFileNm()));
        programRepository.deleteById(dto.getPrgrmFileNm());
    }

    /**
     * 메뉴가 이 프로그램을 연결하고 있으면 삭제를 거부한다(409). 연결은 메뉴 사용 여부와 무관하게 센다.
     *
     * <p>문구는 사실만 말한다(2026-10-02 관리 콘솔 UX). 메뉴는 이제 화면 경로로 연결하고, 메뉴 구조 저장은 메뉴의 연결
     * 프로그램을 바꾸지 않으므로 화면에서 연결을 풀 길이 없다 — 종전 '먼저 연결을 해제해 주세요' 는 없는 동작을 지시했다.
     * 여러 건 삭제({@link #deleteProgrmManageList})도 이 판정을 쓰므로 어느 프로그램이 걸렸는지 파일명을 싣는다.</p>
     */
    private void assertNotReferenced(String prgrmFileNm) {
        if (programRepository.hasReferences(prgrmFileNm)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                    "이 프로그램을 연결한 메뉴가 있어 삭제할 수 없습니다: " + prgrmFileNm);
        }
    }

    /**
     * 프로그램 목록 멀티 삭제
     */
    @Transactional
    @CacheEvict(value = { "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void deleteProgrmManageList(String checkedProgrmFileNmForDel) {
        SecurityUtil.assertPermission("PROGRAM_DELETE");
        if (checkedProgrmFileNmForDel == null)
            return;
        List<String> delProgrmFileNm = Arrays.asList(checkedProgrmFileNmForDel.split(","));
        delProgrmFileNm.forEach(this::assertNotReferenced);
        programRepository.deleteAllByIdInBatch(Objects.requireNonNull(delProgrmFileNm));
    }
}
