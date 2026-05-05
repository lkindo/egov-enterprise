package nuri.foundation.service.usermanagement;

import nuri.foundation.domain.user.entity.GeneralUser;
import nuri.foundation.domain.user.repository.GeneralUserRepository;
import nuri.foundation.service.usermanagement.dto.GeneralUserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MberManageService 단위 테스트")
class MberManageServiceTest {

    @Mock
    private GeneralUserRepository generalUserRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private MberManageServiceImpl mberManageService;

    @Test
    @DisplayName("일반회원 목록 조회 테스트")
    void getMberListTest() {
        Page<GeneralUser> page = new PageImpl<>(List.of(
                GeneralUser.builder().esntlId("MBER1").mberId("testuser").build()
        ));
        given(generalUserRepository.searchGeneralUsers(any(), anyString(), anyString(), any(Pageable.class)))
                .willReturn(page);

        Page<GeneralUserDto> result = mberManageService.getMberList("test", PageRequest.of(0, 10));

        assertEquals(1, result.getContent().size());
        assertEquals("MBER1", result.getContent().get(0).getEsntlId());
    }

    @Test
    @DisplayName("일반회원 상세 조회 테스트 - 성공")
    void getMberSuccessTest() {
        GeneralUser entity = GeneralUser.builder().esntlId("MBER1").mberId("testuser").build();
        given(generalUserRepository.findById("MBER1")).willReturn(Optional.of(entity));

        GeneralUserDto result = mberManageService.getMber("MBER1");

        assertNotNull(result);
        assertEquals("testuser", result.getMberId());
    }

    @Test
    @DisplayName("일반회원 등록 테스트")
    void insertMberTest() {
        GeneralUserDto dto = GeneralUserDto.builder()
                .mberId("newuser")
                .password("pass123")
                .mberNm("신규회원")
                .build();
        
        given(passwordEncoder.encode("pass123")).willReturn("encodedPass");

        mberManageService.insertMber(dto);

        verify(generalUserRepository).save(any());
        verify(passwordEncoder).encode("pass123");
    }

    @Test
    @DisplayName("비밀번호 변경 테스트")
    void updatePasswordTest() {
        GeneralUser entity = mock(GeneralUser.class);
        given(generalUserRepository.findById("MBER1")).willReturn(Optional.of(entity));
        given(passwordEncoder.encode("newpass")).willReturn("encodedNewPass");

        mberManageService.updatePassword("MBER1", "newpass");

        verify(entity).updatePassword("encodedNewPass");
    }

    @Test
    @DisplayName("일반회원 삭제 테스트")
    void deleteMberTest() {
        mberManageService.deleteMber("MBER1");
        verify(generalUserRepository).deleteById("MBER1");
    }
}
