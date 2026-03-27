package com.company.project.foundation.service.auth;

import com.company.project.foundation.domain.auth.AuthorRoleProjection;
import com.company.project.foundation.domain.auth.AuthorityRoleRepository;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthorRoleManageService 테스트")
class AuthorRoleManageServiceTest {

    @Mock
    private AuthorityRoleRepository authorityRoleRepository;

    @InjectMocks
    private AuthorRoleManageService authorRoleManageService;

    @Nested
    @DisplayName("권한별 롤 목록 조회 테스트")
    class SelectAuthorRoleListTests {

        @Test
        @DisplayName("권한별 롤 목록 조회 성공")
        void testSelectAuthorRoleList_Success() {
            // Given
            String authorCode = "ROLE_ADMIN";
            ComDefaultVO searchVO = new ComDefaultVO();
            searchVO.setPageIndex(1);

            AuthorRoleProjection projection = AuthorRoleProjection.builder()
                    .roleCode("web-001")
                    .roleNm("Web Role")
                    .authorCode(authorCode)
                    .regYn("Y")
                    .build();

            Page<AuthorRoleProjection> page = new PageImpl<>(Collections.singletonList(projection));
            when(authorityRoleRepository.searchAuthorRoles(eq(authorCode), any(Pageable.class))).thenReturn(page);

            // When
            Page<AuthorRoleProjection> result = authorRoleManageService.selectAuthorRoleList(authorCode, searchVO);

            // Then
            assertNotNull(result);
            assertEquals(1, result.getContent().size());
            assertEquals("web-001", result.getContent().get(0).getRoleCode());
            verify(authorityRoleRepository, times(1)).searchAuthorRoles(eq(authorCode), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("권한에 롤 할당 테스트")
    class InsertAuthorRoleTests {

        @Test
        @DisplayName("권한에 롤 할당 성공")
        void testInsertAuthorRole_Success() {
            // Given
            String authorCode = "ROLE_ADMIN";
            List<String> roleCodes = Arrays.asList("web-001", "web-002");

            // When
            authorRoleManageService.insertAuthorRole(authorCode, roleCodes);

            // Then
            verify(authorityRoleRepository, times(1)).deleteByIdAuthorCode(authorCode);
            verify(authorityRoleRepository, times(1)).saveAll(anyList());
        }

        @Test
        @DisplayName("빈 롤 목록 전달 시 기존 정보 삭제만 수행")
        void testInsertAuthorRole_EmptyRoles() {
            // Given
            String authorCode = "ROLE_ADMIN";

            // When
            authorRoleManageService.insertAuthorRole(authorCode, Collections.emptyList());

            // Then
            verify(authorityRoleRepository, times(1)).deleteByIdAuthorCode(authorCode);
            verify(authorityRoleRepository, never()).saveAll(any());
        }
    }
}
