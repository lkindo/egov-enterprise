package com.company.project.service.program;

import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;
import com.company.project.service.program.dto.ProgramDto;
import egovframework.com.cmm.ComDefaultVO;
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

    /**
     * ?꾨줈洹몃??紐⑸?議고??     */
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
     * ?꾨줈洹몃???????議고??     */
    public int selectProgrmListTotCnt(ComDefaultVO searchVO) {
        String keyword = searchVO.getSearchKeyword();
        if (keyword != null && !keyword.isEmpty()) {
            return (int) programRepository.searchByKeyword(keyword, PageRequest.of(0, 1)).getTotalElements();
        }
        return (int) programRepository.count();
    }

    /**
     * ?꾨줈洹몃???곸꽭 議고??     */
    public ProgramDto selectProgrm(ComDefaultVO searchVO) {
        if (searchVO.getSearchKeyword() == null)
            return new ProgramDto();
        return programRepository.findById(Objects.requireNonNull(searchVO.getSearchKeyword()))
                .map(this::toDto)
                .orElse(new ProgramDto());
    }

    public ProgramDto selectProgrmById(String progrmFileNm) {
        return programRepository.findById(Objects.requireNonNull(progrmFileNm))
                .map(this::toDto)
                .orElse(new ProgramDto());
    }

    /**
     * ?꾨줈洹몃???깅줉
     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void insertProgrm(ProgramDto dto) {
        Program program = Program.builder()
                .progrmFileNm(dto.getProgrmFileNm())
                .progrmStrePath(dto.getProgrmStrePath())
                .progrmKoreanNm(dto.getProgrmKoreanNm())
                .url(dto.getUrl())
                .progrmDc(dto.getProgrmDc())
                .build();
        programRepository.save(Objects.requireNonNull(program));
    }

    /**
     * ?꾨줈洹몃????젙
     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void updateProgrm(ProgramDto dto) {
        programRepository.findById(Objects.requireNonNull(dto.getProgrmFileNm())).ifPresent(program -> {
            program.update(dto.getProgrmStrePath(), dto.getProgrmKoreanNm(), dto.getUrl(), dto.getProgrmDc());
        });
    }

    /**
     * ?꾨줈洹몃??????     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void deleteProgrm(ProgramDto dto) {
        programRepository.deleteById(Objects.requireNonNull(dto.getProgrmFileNm()));
    }

    /**
     * ?꾨줈洹몃??紐⑸?硫??????     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void deleteProgrmManageList(String checkedProgrmFileNmForDel) {
        if (checkedProgrmFileNmForDel == null)
            return;
        List<String> delProgrmFileNm = Arrays.asList(checkedProgrmFileNmForDel.split(","));
        programRepository.deleteAllByIdInBatch(Objects.requireNonNull(delProgrmFileNm));
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
