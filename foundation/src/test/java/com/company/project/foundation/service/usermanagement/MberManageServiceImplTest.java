package com.company.project.foundation.service.usermanagement;

import com.company.project.foundation.domain.user.entity.GeneralUser;
import com.company.project.foundation.domain.user.repository.GeneralUserRepository;
import com.company.project.foundation.service.usermanagement.dto.GeneralUserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MberManageService (일반 회원 관리) 테스트")
class MberManageServiceImplTest {

    @Mock
    private GeneralUserRepository generalUserRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private MberManageServiceImpl mberManageService;

    @Test
    @DisplayName("회원 상세 조회 성공")
    void getMber_Success() {
        // Given
        GeneralUser user = GeneralUser.builder().esntlId("ID1").mberNm("Name").build();
        given(generalUserRepository.findById("ID1")).willReturn(Optional.of(user));

        // When
        GeneralUserDto result = mberManageService.getMber("ID1");

        // Then
        assertNotNull(result);
        assertEquals("ID1", result.getEsntlId());
    }

    @Test
    @DisplayName("회원 등록 성공")
    void insertMber_Success() {
        // Given
        GeneralUserDto dto = GeneralUserDto.builder().mberId("test").mberNm("Name").password("pass").build();
        given(passwordEncoder.encode("pass")).willReturn("encoded");

        // When
        mberManageService.insertMber(dto);

        // Then
        verify(generalUserRepository).save(any(GeneralUser.class));
    }

    @Test
    @DisplayName("회원 정보 수정 성공")
    void updateMber_Success() {
        // Given
        GeneralUser user = GeneralUser.builder().esntlId("ID1").mberNm("Old").build();
        given(generalUserRepository.findById("ID1")).willReturn(Optional.of(user));

        GeneralUserDto dto = GeneralUserDto.builder().esntlId("ID1").mberNm("New").build();

        // When
        mberManageService.updateMber(dto);

        // Then
        assertEquals("New", user.getMberNm());
    }

    @Test
    @DisplayName("비밀번호 변경 성공")
    void updatePassword_Success() {
        // Given
        GeneralUser user = GeneralUser.builder().esntlId("ID1").build();
        given(generalUserRepository.findById("ID1")).willReturn(Optional.of(user));
        given(passwordEncoder.encode("new")).willReturn("encoded");

        // When
        mberManageService.updatePassword("ID1", "new");

        // Then
        assertEquals("encoded", user.getPassword());
    }
}
