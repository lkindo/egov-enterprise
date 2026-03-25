package com.company.project.foundation.service.usermanagement;

import com.company.project.foundation.domain.user.entity.EnterpriseUser;
import com.company.project.foundation.domain.user.repository.EnterpriseUserRepository;
import com.company.project.foundation.service.usermanagement.dto.EnterpriseUserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("EntrprsManageService 테스트")
class EntrprsManageServiceImplTest {

    @Mock
    private EnterpriseUserRepository enterpriseUserRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private EntrprsManageServiceImpl entrprsManageService;

    @Test
    @DisplayName("기업 사용자 상세 조회 성공")
    void getEntrprs_Success() {
        // Given
        EnterpriseUser entity = EnterpriseUser.builder()
                .esntlId("E1")
                .entrprsmberId("ent1")
                .cmpnyNm("Company")
                .build();
        given(enterpriseUserRepository.findById("E1")).willReturn(Optional.of(entity));

        // When
        EnterpriseUserDto result = entrprsManageService.getEntrprs("E1");

        // Then
        assertThat(result.getEntrprsmberId()).isEqualTo("ent1");
    }

    @Test
    @DisplayName("기업 사용자 등록 성공")
    void insertEntrprs_Success() {
        // Given
        EnterpriseUserDto dto = EnterpriseUserDto.builder()
                .entrprsmberId("ent2")
                .entrprsMberPassword("pass")
                .build();
        given(passwordEncoder.encode("pass")).willReturn("hashed");

        // When
        entrprsManageService.insertEntrprs(dto);

        // Then
        verify(enterpriseUserRepository).save(any(EnterpriseUser.class));
    }

    @Test
    @DisplayName("기업 사용자 수정 성공")
    void updateEntrprs_Success() {
        // Given
        EnterpriseUser entity = EnterpriseUser.builder().esntlId("E1").build();
        given(enterpriseUserRepository.findById("E1")).willReturn(Optional.of(entity));
        EnterpriseUserDto dto = EnterpriseUserDto.builder().esntlId("E1").cmpnyNm("New Name").build();

        // When
        entrprsManageService.updateEntrprs(dto);

        // Then
        assertThat(entity.getCmpnyNm()).isEqualTo("New Name");
    }

    @Test
    @DisplayName("비밀번호 수정 성공")
    void updatePassword_Success() {
        // Given
        EnterpriseUser entity = EnterpriseUser.builder().esntlId("E1").build();
        given(enterpriseUserRepository.findById("E1")).willReturn(Optional.of(entity));
        given(passwordEncoder.encode("newpass")).willReturn("newhashed");

        // When
        entrprsManageService.updatePassword("E1", "newpass");

        // Then
        assertThat(entity.getEntrprsMberPassword()).isEqualTo("newhashed");
    }
}
