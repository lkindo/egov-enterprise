package nuri.business.service.auth;

import nuri.business.domain.auth.Authority;
import nuri.business.domain.auth.AuthorityRepository;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.auth.dto.AuthorManageDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * 권한 관리 서비스
 */
@Service("projectAuthorManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthorManageService {

    private final AuthorityRepository authorityRepository;

    /**
     * 권한 목록을 검색 조건과 함께 한 페이지 조회한다.
     *
     * <p>[2026-08-28] 종전에는 {@code findAll(pageable)} 이라 <b>검색어가 통째로 무시</b>됐고,
     * 총건수도 조건 없는 {@code count()} 였다. 화면에서 권한명을 입력해도 목록도 총건수도
     * 그대로였고, 오류·로딩이 없어 무시됐다는 사실이 드러나지 않았다.
     *
     * <p>검색·페이징·건수를 모두 갖춘 QueryDSL 구현({@link AuthorityRepositoryCustom#searchAuthorities})이
     * 이미 있었고 아무도 부르지 않았을 뿐이다. 같은 결함이 롤 축에도 있었고 1335c8ed8 에서
     * 같은 방식으로 닫았다. 목록과 총건수를 한 {@link Page} 에서 얻어 드리프트를 구조적으로 없앤다.
     */
    public Page<AuthorManageDto> selectAuthorList(BaseSearchDto searchVO) {
        Pageable pageable = Objects.requireNonNull(searchVO.toPageable(Sort.by("authrtCd").ascending()));
        return authorityRepository
                .searchAuthorities(searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable)
                .map(this::toDto);
    }

    /**
     * 권한 상세 조회
     */
    public AuthorManageDto selectAuthor(@NonNull String authrtCd) {
        return authorityRepository.findById(Objects.requireNonNull(authrtCd))
                .map(this::toDto)
                .orElseThrow(() -> new BusinessException(
                        CommonErrorCode.RESOURCE_NOT_FOUND, "권한을 찾을 수 없습니다: " + authrtCd));
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
