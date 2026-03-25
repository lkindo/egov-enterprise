package com.company.project.foundation.service.auth;

import com.company.project.foundation.domain.auth.AuthorRoleProjection;
import com.company.project.foundation.domain.auth.AuthorityRole;
import com.company.project.foundation.domain.auth.AuthorityRoleRepository;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    public Page<AuthorRoleProjection> selectAuthorRoleList(String authorCode, ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageSize = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageSize);

        return authorityRoleRepository.searchAuthorRoles(authorCode, pageable);
    }

    /**
     * 권한에 롤 할당 정보 저장 (기존 정보 삭제 후 재발행)
     */
    @Transactional
    public void insertAuthorRole(String authorCode, List<String> roleCodes) {
        // 기존 매핑 정보 삭제
        authorityRoleRepository.deleteByIdAuthorCode(Objects.requireNonNull(authorCode));

        // 새로운 매핑 정보 저장
        if (roleCodes != null && !roleCodes.isEmpty()) {
            List<AuthorityRole> entities = roleCodes.stream()
                    .filter(Objects::nonNull)
                    .map(roleCode -> AuthorityRole.builder()
                            .id(AuthorityRole.AuthorityRoleId.builder()
                                    .authorCode(authorCode)
                                    .roleCode(roleCode)
                                    .build())
                            .build())
                    .collect(Collectors.toList());
            authorityRoleRepository.saveAll(entities);
        }
    }
}
