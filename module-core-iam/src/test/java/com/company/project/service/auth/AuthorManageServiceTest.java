package com.company.project.service.auth;

import com.company.project.domain.auth.Authority;
import com.company.project.domain.auth.AuthorityRepository;
import com.company.project.service.auth.dto.AuthorManageDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthorManageServiceTest {

    @Mock
    private AuthorityRepository authorityRepository;

    @InjectMocks
    private AuthorManageService authorManageService;

    @Test
    @DisplayName("권한 목록 조회 테스트")
    void selectAuthorListTest() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        
        Authority authority = Authority.builder()
                .authorCode("AUTH_USER")
                .authorNm("User Authority")
                .build();
        Page<Authority> page = new PageImpl<>(Collections.singletonList(authority));
        
        when(authorityRepository.findAll(any(Pageable.class))).thenReturn(page);

        // When
        List<AuthorManageDto> result = authorManageService.selectAuthorList(searchVO);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAuthorCode()).isEqualTo("AUTH_USER");
        verify(authorityRepository).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("권한 상세 조회 테스트")
    void selectAuthorTest() {
        // Given
        String authorCode = "AUTH_ADMIN";
        Authority authority = Authority.builder()
                .authorCode(authorCode)
                .authorNm("Admin Authority")
                .build();
        
        when(authorityRepository.findById(authorCode)).thenReturn(Optional.of(authority));

        // When
        AuthorManageDto result = authorManageService.selectAuthor(authorCode);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getAuthorCode()).isEqualTo(authorCode);
        verify(authorityRepository).findById(authorCode);
    }

    @Test
    @DisplayName("권한 등록 테스트")
    void insertAuthorTest() {
        // Given
        AuthorManageDto dto = AuthorManageDto.builder()
                .authorCode("AUTH_NEW")
                .authorNm("New Authority")
                .build();

        // When
        authorManageService.insertAuthor(dto);

        // Then
        verify(authorityRepository).save(any(Authority.class));
    }

    @Test
    @DisplayName("권한 수정 테스트")
    void updateAuthorTest() {
        // Given
        String authorCode = "AUTH_TARGET";
        AuthorManageDto dto = AuthorManageDto.builder()
                .authorCode(authorCode)
                .authorNm("Updated Name")
                .build();
        Authority authority = mock(Authority.class);
        
        when(authorityRepository.findById(authorCode)).thenReturn(Optional.of(authority));

        // When
        authorManageService.updateAuthor(dto);

        // Then
        verify(authority).update(anyString(), any());
    }

    @Test
    @DisplayName("권한 삭제 테스트")
    void deleteAuthorTest() {
        // Given
        String authorCode = "AUTH_DELETE";

        // When
        authorManageService.deleteAuthor(authorCode);

        // Then
        verify(authorityRepository).deleteById(authorCode);
    }
}
