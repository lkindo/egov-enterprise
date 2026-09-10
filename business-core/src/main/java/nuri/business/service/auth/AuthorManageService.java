package nuri.business.service.auth;

import nuri.business.domain.auth.Authority;
import nuri.business.domain.auth.AuthorityRepository;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.auth.dto.AuthorManageDto;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
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

    /**
     * 권한 등록
     */
    @Transactional
    public void insertAuthor(@NonNull AuthorManageDto dto) {
        SecurityUtil.assertPermission("AUTHRT_CREATE");
        throw new BusinessException(CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }

    /**
     * 권한 수정
     */
    @Transactional
    public void updateAuthor(@NonNull AuthorManageDto dto) {
        SecurityUtil.assertPermission("AUTHRT_UPDATE");
        throw new BusinessException(CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }

    /**
     * 권한 삭제.
     *
     * <p>[2026-08-29 GAP-AUTH-002] 보유자가 있으면 삭제하지 않는다.
     *
     * <p>이 메서드가 정리하는 롤·메뉴 매핑은 권한의 <b>구성</b>이지만, 사용자 할당은 사람에게
     * <b>준 것</b>이다. 그런데 tb_user_authrt_map 에는 tb_authrt_info 로의 FK 가 없어 삭제가
     * 그대로 성공하고 사용자 행은 없어진 권한을 가리킨 채 남았다 — 같은 코드로 권한을 다시
     * 만들면 그 사용자들이 <b>아무도 배정하지 않은 권한을 그대로 물려받는다.</b>
     *
     * <p>두 선택지 중 회수(cascade delete)가 아니라 차단을 택했다. 회수는 오삭제 시 복구가
     * 불가능하고 인가 의미를 조용히 지우지만(H3), 차단은 최악이 "삭제가 막힘" 이고 그건
     * 정확히 드러나야 할 상황이다 — 아직 그 역할을 가진 사람이 있다는 뜻이다.
     *
     * <p>⚠ 이 가드는 애플리케이션 계층이다. DB 제약(FK)으로의 승격은 기존 고아 행 census 와
     * 정리가 선행되며 인가 데이터 DML 이라 사용자 승인 경계다(V2_12 선례 참조).
     */
    @Transactional
    public void deleteAuthor(@NonNull String authrtCd) {
        SecurityUtil.assertPermission("AUTHRT_DELETE");
        throw new BusinessException(CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }

    /**
     * 권한 일괄 삭제
     */
    @Transactional
    public void deleteAuthors(@NonNull String[] authrtCds) {
        SecurityUtil.assertPermission("AUTHRT_DELETE");
        throw new BusinessException(CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
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
