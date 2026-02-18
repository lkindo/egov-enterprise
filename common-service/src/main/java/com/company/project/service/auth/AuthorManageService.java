package com.company.project.service.auth;

import com.company.project.domain.auth.Authority;
import com.company.project.domain.auth.AuthorityRepository;
import com.company.project.service.auth.dto.AuthorManageDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 권한 관리 서비스
 */
@Service("projectAuthorManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthorManageService {

    private final AuthorityRepository authorityRepository;

    /**
     * 권한 목록 조회
     */
    public List<AuthorManageDto> selectAuthorList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<Authority> page = authorityRepository.findAll(pageable);
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * 권한 목록 총 건수
     */
    public int selectAuthorListTotCnt(ComDefaultVO searchVO) {
        return (int) authorityRepository.count();
    }

    /**
     * 권한 상세 조회
     */
    public AuthorManageDto selectAuthor(@NonNull String authorCode) {
        return authorityRepository.findById(authorCode)
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * 권한 등록
     */
    @Transactional
    public void insertAuthor(@NonNull AuthorManageDto dto) {
        Authority entity = Authority.builder()
                .authorCode(Objects.requireNonNull(dto.getAuthorCode()))
                .authorNm(dto.getAuthorNm())
                .authorDc(dto.getAuthorDc())
                .build();
        authorityRepository.save(entity);
    }

    /**
     * 권한 수정
     */
    @Transactional
    public void updateAuthor(@NonNull AuthorManageDto dto) {
        Authority entity = authorityRepository.findById(Objects.requireNonNull(dto.getAuthorCode()))
                .orElseThrow(() -> new RuntimeException("Authority not found: " + dto.getAuthorCode()));
        entity.update(dto.getAuthorNm(), dto.getAuthorDc());
    }

    /**
     * 권한 삭제
     */
    @Transactional
    public void deleteAuthor(@NonNull String authorCode) {
        authorityRepository.deleteById(authorCode);
    }

    /**
     * 권한 다중 삭제
     */
    @Transactional
    public void deleteAuthors(@NonNull String[] authorCodes) {
        authorityRepository.deleteAllById(Arrays.asList(authorCodes));
    }

    private AuthorManageDto toDto(@NonNull Authority entity) {
        return AuthorManageDto.builder()
                .authorCode(entity.getAuthorCode())
                .authorNm(entity.getAuthorNm())
                .authorDc(entity.getAuthorDc())
                .authorCreatDe(entity.getAuthorCreatDe() != null
                        ? entity.getAuthorCreatDe().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : null)
                .build();
    }
}
