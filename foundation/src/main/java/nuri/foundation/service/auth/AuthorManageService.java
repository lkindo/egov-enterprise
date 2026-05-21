package nuri.foundation.service.auth;

import nuri.foundation.domain.auth.Authority;
import nuri.foundation.domain.auth.AuthorityRepository;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.service.auth.dto.AuthorManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    public List<AuthorManageDto> selectAuthorList(BaseSearchDto searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit, Sort.by("authrtCd").ascending());

        Page<Authority> page = authorityRepository.findAll(Objects.requireNonNull(pageable));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * 권한 목록 총 갯수
     */
    public int selectAuthorListTotCnt(BaseSearchDto searchVO) {
        return (int) authorityRepository.count();
    }

    /**
     * 권한 상세 조회
     */
    public AuthorManageDto selectAuthor(@NonNull String authrtCd) {
        return authorityRepository.findById(Objects.requireNonNull(authrtCd))
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * 권한 등록
     */
    @Transactional
    public void insertAuthor(@NonNull AuthorManageDto dto) {
        Authority entity = Authority.builder()
                .authrtCd(Objects.requireNonNull(dto.getAuthrtCd()))
                .authrtNm(dto.getAuthrtNm())
                .authrtExpln(dto.getAuthrtExpln())
                .build();
        authorityRepository.save(Objects.requireNonNull(entity));
    }

    /**
     * 권한 수정
     */
    @Transactional
    public void updateAuthor(@NonNull AuthorManageDto dto) {
        Authority entity = authorityRepository.findById(Objects.requireNonNull(dto.getAuthrtCd()))
                .orElseThrow(() -> new RuntimeException("Authority not found: " + dto.getAuthrtCd()));
        entity.update(dto.getAuthrtNm(), dto.getAuthrtExpln());
    }

    /**
     * 권한 삭제
     */
    @Transactional
    public void deleteAuthor(@NonNull String authrtCd) {
        authorityRepository.deleteById(Objects.requireNonNull(authrtCd));
    }

    /**
     * 권한 일괄 삭제
     */
    @Transactional
    public void deleteAuthors(@NonNull String[] authrtCds) {
        authorityRepository.deleteAllById(Objects.requireNonNull(Arrays.asList(Objects.requireNonNull(authrtCds))));
    }

    private AuthorManageDto toDto(@NonNull Authority entity) {
        String createdDe = entity.getAuthrtCrtYmd();
        if (createdDe != null) {
            createdDe = createdDe.trim();
            if (createdDe.length() == 8 && !createdDe.contains("-")) {
                createdDe = createdDe.substring(0, 4) + "-" + createdDe.substring(4, 6) + "-" + createdDe.substring(6, 8);
            }
        }
        return AuthorManageDto.builder()
                .authrtCd(entity.getAuthrtCd())
                .authrtNm(entity.getAuthrtNm())
                .authrtExpln(entity.getAuthrtExpln())
                .authrtCrtYmd(createdDe)
                .build();
    }
}
