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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthorManageService (Auth) 테스트")
class AuthorManageServiceTest {

    @Mock
    private AuthorityRepository authorityRepository;

    @InjectMocks
    private AuthorManageService authorManageService;

    @Test
    @DisplayName("권한 목록 조회 성공")
    void selectAuthorList_Success() {
        Authority auth = Authority.builder().authorCode("AUTH_001").authorNm("Admin").build();
        Page<Authority> page = new PageImpl<>(List.of(auth));
        given(authorityRepository.findAll(any(Pageable.class))).willReturn(page);

        ComDefaultVO vo = new ComDefaultVO();
        List<AuthorManageDto> result = authorManageService.selectAuthorList(vo);
        
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAuthorCode()).isEqualTo("AUTH_001");
    }

    @Test
    @DisplayName("권한 총 갯수 조회")
    void selectAuthorListTotCnt_Success() {
        given(authorityRepository.count()).willReturn(50L);
        int result = authorManageService.selectAuthorListTotCnt(new ComDefaultVO());
        assertThat(result).isEqualTo(50);
    }

    @Test
    @DisplayName("권한 상세 조회 성공")
    void selectAuthor_Success() {
        Authority auth = Authority.builder().authorCode("AUTH_001").authorNm("Admin").build();
        given(authorityRepository.findById("AUTH_001")).willReturn(Optional.of(auth));

        AuthorManageDto result = authorManageService.selectAuthor("AUTH_001");
        assertThat(result.getAuthorNm()).isEqualTo("Admin");
    }

    @Test
    @DisplayName("권한 등록 성공")
    void insertAuthor_Success() {
        AuthorManageDto dto = AuthorManageDto.builder()
                .authorCode("AUTH_NEW")
                .authorNm("New Auth")
                .build();
        
        authorManageService.insertAuthor(dto);
        verify(authorityRepository).save(any(Authority.class));
    }

    @Test
    @DisplayName("권한 수정 성공")
    void updateAuthor_Success() {
        Authority auth = Authority.builder().authorCode("AUTH_001").authorNm("Old").build();
        given(authorityRepository.findById("AUTH_001")).willReturn(Optional.of(auth));

        AuthorManageDto dto = AuthorManageDto.builder().authorCode("AUTH_001").authorNm("New").build();
        authorManageService.updateAuthor(dto);
        assertThat(auth.getAuthorNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("권한 삭제 성공")
    void deleteAuthor_Success() {
        authorManageService.deleteAuthor("AUTH_001");
        verify(authorityRepository).deleteById("AUTH_001");
    }

    @Test
    @DisplayName("권한 일괄 삭제 성공")
    void deleteAuthors_Success() {
        String[] codes = {"AUTH_1", "AUTH_2"};
        authorManageService.deleteAuthors(codes);
        verify(authorityRepository).deleteAllById(any());
    }
}
