package com.company.project.service.program;

import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;
import com.company.project.service.program.dto.ProgramDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProgramService {

    private final ProgramRepository programRepository;

    /**
     * 프로그램 목록 조회
     */
    public List<ProgramDto> selectProgrmList(ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
                Sort.by("progrmFileNm").ascending());
        String keyword = searchVO.getSearchKeyword();

        Page<Program> page;
        if (keyword != null && !keyword.isEmpty()) {
            page = programRepository.searchByKeyword(keyword, pageable);
        } else {
            page = programRepository.findAll(pageable);
        }

        return page.getContent().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * 프로그램 총 갯수 조회
     */
    public int selectProgrmListTotCnt(ComDefaultVO searchVO) {
        String keyword = searchVO.getSearchKeyword();
        // Since we don't have a count query by keyword exposed directly in repository
        // (unless page handles it)
        // searchByKeyword returns Page, checking total elements is efficient.
        // We can create a lightweight count request if needed, but for now:
        if (keyword != null && !keyword.isEmpty()) {
            return (int) programRepository.searchByKeyword(keyword, PageRequest.of(0, 1)).getTotalElements();
        }
        return (int) programRepository.count();
    }

    /**
     * 프로그램 상세 조회
     */
    public ProgramDto selectProgrm(ComDefaultVO searchVO) {
        return programRepository.findById(searchVO.getSearchKeyword())
                .map(this::toDto)
                .orElse(new ProgramDto());
    }

    public ProgramDto selectProgrmById(String progrmFileNm) {
        return programRepository.findById(progrmFileNm)
                .map(this::toDto)
                .orElse(new ProgramDto());
    }

    /**
     * 프로그램 등록
     */
    @Transactional
    public void insertProgrm(ProgramDto dto) {
        Program program = Program.builder()
                .progrmFileNm(dto.getProgrmFileNm())
                .progrmStrePath(dto.getProgrmStrePath())
                .progrmKoreanNm(dto.getProgrmKoreanNm())
                .url(dto.getUrl())
                .progrmDc(dto.getProgrmDc())
                .build();
        programRepository.save(program);
    }

    /**
     * 프로그램 수정
     */
    @Transactional
    public void updateProgrm(ProgramDto dto) {
        programRepository.findById(dto.getProgrmFileNm()).ifPresent(program -> {
            program.update(dto.getProgrmStrePath(), dto.getProgrmKoreanNm(), dto.getUrl(), dto.getProgrmDc());
        });
    }

    /**
     * 프로그램 삭제
     */
    @Transactional
    public void deleteProgrm(ProgramDto dto) {
        programRepository.deleteById(dto.getProgrmFileNm());
    }

    /**
     * 프로그램 목록 멀티 삭제
     */
    @Transactional
    public void deleteProgrmManageList(String checkedProgrmFileNmForDel) {
        String[] delProgrmFileNm = checkedProgrmFileNmForDel.split(",");
        for (String id : delProgrmFileNm) {
            programRepository.deleteById(id);
        }
    }

    private ProgramDto toDto(Program entity) {
        return ProgramDto.builder()
                .progrmFileNm(entity.getProgrmFileNm())
                .progrmStrePath(entity.getProgrmStrePath())
                .progrmKoreanNm(entity.getProgrmKoreanNm())
                .url(entity.getUrl())
                .progrmDc(entity.getProgrmDc())
                .build();
    }
}
