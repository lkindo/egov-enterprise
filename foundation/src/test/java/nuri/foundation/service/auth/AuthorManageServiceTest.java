package nuri.foundation.service.auth;

import nuri.foundation.domain.auth.Authority;
import nuri.foundation.domain.auth.AuthorityRepository;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.service.auth.dto.AuthorManageDto;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthorManageService 단위 테스트")
class AuthorManageServiceTest {

    @Mock
    private AuthorityRepository authorityRepository;

    @InjectMocks
    private AuthorManageService authorManageService;

    @Test
    @DisplayName("권한 목록 조회 테스트")
    void selectAuthorListTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        
        Page<Authority> page = new PageImpl<>(List.of(Authority.builder().authrtCd("ROLE_ADMIN").authrtNm("관리자").build()));
        given(authorityRepository.findAll(any(Pageable.class))).willReturn(page);

        List<AuthorManageDto> result = authorManageService.selectAuthorList(searchVO);

        assertEquals(1, result.size());
        assertEquals("ROLE_ADMIN", result.get(0).getAuthrtCd());
    }

    @Test
    @DisplayName("권한 상세 조회 테스트")
    void selectAuthorTest() {
        Authority authority = Authority.builder().authrtCd("ROLE_ADMIN").authrtNm("관리자").build();
        given(authorityRepository.findById("ROLE_ADMIN")).willReturn(Optional.of(authority));

        AuthorManageDto result = authorManageService.selectAuthor("ROLE_ADMIN");

        assertNotNull(result);
        assertEquals("ROLE_ADMIN", result.getAuthrtCd());
    }

    @Test
    @DisplayName("권한 등록 테스트")
    void insertAuthorTest() {
        AuthorManageDto dto = AuthorManageDto.builder()
                .authrtCd("ROLE_NEW")
                .authrtNm("신규권한")
                .build();
        
        authorManageService.insertAuthor(dto);

        verify(authorityRepository).save(any());
    }

    @Test
    @DisplayName("권한 수정 테스트")
    void updateAuthorTest() {
        AuthorManageDto dto = AuthorManageDto.builder()
                .authrtCd("ROLE_EXIST")
                .authrtNm("수정된이름")
                .build();
        
        Authority authority = mock(Authority.class);
        given(authorityRepository.findById("ROLE_EXIST")).willReturn(Optional.of(authority));

        authorManageService.updateAuthor(dto);

        verify(authority).update(eq("수정된이름"), any());
    }

    @Test
    @DisplayName("권한 삭제 테스트")
    void deleteAuthorTest() {
        authorManageService.deleteAuthor("ROLE_ADMIN");
        verify(authorityRepository).deleteById("ROLE_ADMIN");
    }

    @Test
    @DisplayName("권한 일괄 삭제 테스트")
    void deleteAuthorsTest() {
        String[] codes = {"ROLE_1", "ROLE_2"};
        authorManageService.deleteAuthors(codes);
        verify(authorityRepository).deleteAllById(anyList());
    }
}
