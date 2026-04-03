package com.company.project.foundation.service.auth;

import com.company.project.foundation.domain.auth.AuthorGroupProjection;
import com.company.project.foundation.domain.auth.DeptAuthorProjection;
import com.company.project.foundation.domain.auth.UserAuthority;
import com.company.project.foundation.domain.auth.UserAuthorityRepository;
import com.company.project.foundation.service.auth.dto.UserAuthorityDto;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserAuthorityManageService (사용자 권한 관리) 테스트")
class UserAuthorityManageServiceTest {

    @Mock
    private UserAuthorityRepository userAuthorityRepository;

    @InjectMocks
    private UserAuthorityManageService userAuthorityManageService;

    @Nested
    @DisplayName("사용자별 권한 목록 조회 테스트")
    class SelectUserAuthorityListTests {

        @Test
        @DisplayName("사용자별 권한 목록 조회 성공")
        void testSelectUserAuthorityList_Success() {
            // Given
            ComDefaultVO searchVO = new ComDefaultVO();
            searchVO.setPageIndex(1);
            searchVO.setPageUnit(10);
            searchVO.setSearchKeyword("user01");

            AuthorGroupProjection projection = AuthorGroupProjection.builder()
                    .userId("user01")
                    .userNm("사용자1")
                    .authorCode("ROLE_USER")
                    .build();

            Page<AuthorGroupProjection> page = new PageImpl<>(Collections.singletonList(projection));
            when(userAuthorityRepository.searchAuthorGroups(any(), any(), any(Pageable.class))).thenReturn(page);

            // When
            Page<AuthorGroupProjection> result = userAuthorityManageService.selectUserAuthorityList(searchVO);

            // Then
            assertNotNull(result);
            assertEquals(1, result.getContent().size());
            assertEquals("user01", result.getContent().get(0).getUserId());
            verify(userAuthorityRepository, times(1)).searchAuthorGroups(any(), any(), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("부서별 권한 목록 조회 테스트")
    class SelectDeptAuthorityListTests {

        @Test
        @DisplayName("부서별 권한 목록 조회 성공")
        void testSelectDeptAuthorityList_Success() {
            // Given
            String deptCode = "DEPT001";
            ComDefaultVO searchVO = new ComDefaultVO();
            searchVO.setPageIndex(1);

            new DeptAuthorProjection(); // Assuming it has a default constructor or builder
            // Note: If DeptAuthorProjection is also a class like AuthorGroupProjection, it should work.
            
            Page<DeptAuthorProjection> page = new PageImpl<>(Collections.emptyList());
            when(userAuthorityRepository.searchDeptAuthors(eq(deptCode), any(Pageable.class))).thenReturn(page);

            // When
            Page<DeptAuthorProjection> result = userAuthorityManageService.selectDeptAuthorityList(deptCode, searchVO);

            // Then
            assertNotNull(result);
            verify(userAuthorityRepository, times(1)).searchDeptAuthors(eq(deptCode), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("사용자 권한 정보 저장 테스트")
    class SaveUserAuthoritiesTests {

        @Test
        @DisplayName("새로운 사용자 권한 저장 성공")
        void testSaveUserAuthorities_New() {
            // Given
            UserAuthorityDto dto = UserAuthorityDto.builder()
                    .uniqId("UNIQ_001")
                    .authorCode("ROLE_ADMIN")
                    .mberTyCode("USR")
                    .build();

            when(userAuthorityRepository.findById("UNIQ_001")).thenReturn(Optional.empty());

            // When
            userAuthorityManageService.saveUserAuthorities(Collections.singletonList(dto));

            // Then
            verify(userAuthorityRepository, times(1)).saveAll(anyList());
        }

        @Test
        @DisplayName("기존 사용자 권한 수정 성공")
        void testSaveUserAuthorities_Update() {
            // Given
            UserAuthorityDto dto = UserAuthorityDto.builder()
                    .uniqId("UNIQ_001")
                    .authorCode("ROLE_ADMIN")
                    .build();

            UserAuthority existing = UserAuthority.builder()
                    .uniqId("UNIQ_001")
                    .authorCode("ROLE_USER")
                    .build();

            when(userAuthorityRepository.findById("UNIQ_001")).thenReturn(Optional.of(existing));

            // When
            userAuthorityManageService.saveUserAuthorities(Collections.singletonList(dto));

            // Then
            assertEquals("ROLE_ADMIN", existing.getAuthorCode());
            verify(userAuthorityRepository, times(1)).saveAll(anyList());
        }

        @Test
        @DisplayName("빈 권한 목록 저장 시 동작 안함")
        void testSaveUserAuthorities_Empty() {
            // When
            userAuthorityManageService.saveUserAuthorities(Collections.emptyList());

            // Then
            verify(userAuthorityRepository, never()).saveAll(any());
        }
    }

    @Nested
    @DisplayName("사용자 권한 삭제 테스트")
    class DeleteUserAuthoritiesTests {

        @Test
        @DisplayName("사용자 권한 목록 삭제 성공")
        void testDeleteUserAuthorities_Success() {
            // Given
            List<String> uniqIds = Arrays.asList("UNIQ_001", "UNIQ_002");

            // When
            userAuthorityManageService.deleteUserAuthorities(uniqIds);

            // Then
            verify(userAuthorityRepository, times(1)).deleteAllByIdInBatch(uniqIds);
        }

        @Test
        @DisplayName("null 입력 시 삭제 동작 안함")
        void testDeleteUserAuthorities_Empty() {
            // When
            userAuthorityManageService.deleteUserAuthorities(null);

            // Then
            verify(userAuthorityRepository, never()).deleteAllByIdInBatch(any());
        }
    }
}
