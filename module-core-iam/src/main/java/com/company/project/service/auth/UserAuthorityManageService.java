package com.company.project.service.auth;

import com.company.project.domain.auth.AuthorGroupProjection;
import com.company.project.domain.auth.DeptAuthorProjection;
import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.service.auth.dto.UserAuthorityDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 사용자-권한 매핑 관계를 관리하는 서비스
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserAuthorityManageService {

    private final UserAuthorityRepository userAuthorityRepository;

    /**
     * 사용자별 권한 목록 조회
     */
    public Page<AuthorGroupProjection> selectUserAuthorityList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageSize = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageSize);

        return userAuthorityRepository.searchAuthorGroups(
                searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(),
                pageable);
    }

    /**
     * 부서별 권한 목록 조회
     */
    public Page<DeptAuthorProjection> selectDeptAuthorityList(String deptCode, ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageSize = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageSize);

        return userAuthorityRepository.searchDeptAuthors(deptCode, pageable);
    }

    /**
     * 사용자의 권한 정보 저장/업데이트
     */
    @Transactional
    public void saveUserAuthorities(List<UserAuthorityDto> userAuthorities) {
        if (userAuthorities == null || userAuthorities.isEmpty()) {
            return;
        }

        List<UserAuthority> entities = userAuthorities.stream()
                .filter(dto -> dto.getUniqId() != null && dto.getAuthorCode() != null)
                .map(dto -> {
                    UserAuthority existing = userAuthorityRepository.findById(dto.getUniqId()).orElse(null);
                    if (existing != null) {
                        existing.update(dto.getAuthorCode(), dto.getMberTyCode());
                        return existing;
                    } else {
                        return UserAuthority.builder()
                                .uniqId(dto.getUniqId())
                                .authorCode(dto.getAuthorCode())
                                .mberTyCode(dto.getMberTyCode())
                                .build();
                    }
                })
                .collect(Collectors.toList());

        userAuthorityRepository.saveAll(entities);
    }

    /**
     * 사용자의 권한 삭제
     */
    @Transactional
    public void deleteUserAuthorities(List<String> uniqIds) {
        if (uniqIds == null || uniqIds.isEmpty()) {
            return;
        }
        userAuthorityRepository.deleteAllByIdInBatch(uniqIds);
    }
}
