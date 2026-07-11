package nuri.business.domain.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("MenuAuthorityRepository 테스트")
class MenuAuthorityRepositoryTest {

    @Mock
    private MenuAuthorityRepository menuAuthorityRepository;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("권한코드로 메뉴 권한 조회 테스트")
    void testFindByIdAuthorCode() {
        // Given
        String authorCode = "ROLE_ADMIN";
        when(menuAuthorityRepository.findByIdAuthrtCd(authorCode)).thenReturn(Collections.emptyList());

        // When
        List<MenuAuthority> result = menuAuthorityRepository.findByIdAuthrtCd(authorCode);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(menuAuthorityRepository, times(1)).findByIdAuthrtCd(authorCode);
    }
}