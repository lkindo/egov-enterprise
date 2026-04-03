package com.company.project.foundation.domain.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("UserAuthorityRepository 테스트")
class UserAuthorityRepositoryTest {

    @Mock
    private UserAuthorityRepository userAuthorityRepository;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("고유 ID 목록으로 권한 목록 조회 테스트")
    void testFindByUniqIdIn() {
        // Given
        List<String> uniqIds = Collections.singletonList("ESNTL_01");
        when(userAuthorityRepository.findByUniqIdIn(uniqIds)).thenReturn(Collections.emptyList());

        // When
        List<UserAuthority> result = userAuthorityRepository.findByUniqIdIn(uniqIds);

        // Then
        assertNotNull(result);
        verify(userAuthorityRepository, times(1)).findByUniqIdIn(uniqIds);
    }
}