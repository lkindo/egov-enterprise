package nuri.business.service.program;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.common.BaseSearchDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.program.Program;
import nuri.business.domain.program.ProgramRepository;
import nuri.business.service.program.dto.ProgramDto;
import nuri.business.service.program.dto.ProgramMapper;
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
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
                Sort.by("prgrmFileNm").ascending());
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
     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void insertProgrm(ProgramDto dto) {
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
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void updateProgrm(ProgramDto dto) {
        Program program = programRepository.findById(Objects.requireNonNull(dto.getPrgrmFileNm()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        program.update(dto.getPrgrmStrgPath(), dto.getPrgrmKornNm(), dto.getUrl(), dto.getPrgrmExpln());
    }

    /**
     * 프로그램 삭제
     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void deleteProgrm(ProgramDto dto) {
        programRepository.deleteById(Objects.requireNonNull(dto.getPrgrmFileNm()));
    }

    /**
     * 프로그램 목록 멀티 삭제
     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void deleteProgrmManageList(String checkedProgrmFileNmForDel) {
        if (checkedProgrmFileNmForDel == null)
            return;
        List<String> delProgrmFileNm = Arrays.asList(checkedProgrmFileNmForDel.split(","));
        programRepository.deleteAllByIdInBatch(Objects.requireNonNull(delProgrmFileNm));
    }
}
