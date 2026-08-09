package nuri.business.service.auth;

import nuri.business.domain.auth.AuthorRoleProjection;
import nuri.business.domain.auth.AuthorityRole;
import nuri.business.domain.auth.AuthorityRoleRepository;
import nuri.business.domain.common.BaseSearchDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 권한-롤 매핑 관계를 관리하는 서비스
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthorRoleManageService {

    private final AuthorityRoleRepository authorityRoleRepository;

    /**
     * 특정 권한전체 롤 목록과 할당 여부 조회
     */
    public Page<AuthorRoleProjection> selectAuthorRoleList(String authrtCd, BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable();

        return authorityRoleRepository.searchAuthorRoles(authrtCd, pageable);
    }

    /**
     * 권한에 롤 할당 정보 저장 (기존 정보 삭제 후 재발행)
     */
    @Transactional
    public void insertAuthorRole(String authrtCd, List<String> roleCds) {
        // 기존 매핑 정보 삭제
        authorityRoleRepository.deleteByIdAuthrtCd(Objects.requireNonNull(authrtCd));

        // 새로운 매핑 정보 저장
        if (roleCds != null && !roleCds.isEmpty()) {
            List<AuthorityRole> entities = roleCds.stream()
                    .filter(Objects::nonNull)
                    .map(roleCd -> AuthorityRole.builder()
                            .id(AuthorityRole.AuthorityRoleId.builder()
                                    .authrtCd(authrtCd)
                                    .roleCd(roleCd)
                                    .build())
                            .build())
                    .collect(Collectors.toList());
            authorityRoleRepository.saveAll(entities);
        }
    }
}
