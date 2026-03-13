package com.company.project.service.usermanagement;

import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.usermanagement.dto.UserManageDto;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserManageService 테스트")
class UserManageServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserManageService userManageService;

    private User.UserBuilder<?, ?> createBaseUser(String userId) {
        return User.builder()
                .userId(userId)
                .esntlId("ESNTL_" + userId)
                .userNm("Name_" + userId)
                .password("password");
    }

    @Test
    @DisplayName("사용자 목록 조회 성공")
    void selectUserList_Success() {
        // Given
        ComDefaultVO vo = new ComDefaultVO();
        vo.setPageIndex(1);
        vo.setPageUnit(10);
        
        User user = createBaseUser("user1").userNm("User 1").build();
        Page<User> page = new PageImpl<>(List.of(user));
        given(userRepository.findAll(any(Pageable.class))).willReturn(page);

        // When
        List<UserManageDto> result = userManageService.selectUserList(vo);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUserId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("사용자 총 갯수 조회")
    void selectUserListTotCnt_Success() {
        given(userRepository.count()).willReturn(5L);
        int result = userManageService.selectUserListTotCnt(new ComDefaultVO());
        assertThat(result).isEqualTo(5);
    }

    @Test
    @DisplayName("사용자 상세 조회 성공")
    void selectUser_Success() {
        User user = createBaseUser("user1").build();
        given(userRepository.findById("user1")).willReturn(Optional.of(user));

        UserManageDto result = userManageService.selectUser("user1");
        assertThat(result.getUserId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("사용자 상세 조회 실패 - 존재하지 않음")
    void selectUser_NotFound() {
        given(userRepository.findById(anyString())).willReturn(Optional.empty());
        UserManageDto result = userManageService.selectUser("user1");
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("사용자 등록 성공 - 모든 필드 포함")
    void insertUser_Full_Success() {
        UserManageDto dto = new UserManageDto();
        dto.setUserId("fulluser");
        dto.setPassword("pass");
        dto.setUserNm("Full Name");
        dto.setPasswordHint("Hint");
        dto.setPasswordCnsr("Answer");
        dto.setEmplNo("12345");
        dto.setSexdstnCode("M");
        dto.setBrthdy("1990-01-01");
        dto.setAreaNo("02");
        dto.setHomemiddleTelno("1234");
        dto.setHomeendTelno("5678");
        dto.setHomeadres("Address");
        dto.setDetailAdres("Detail");
        dto.setZip("12345");
        dto.setMoblphonNo("010-1234-5678");
        dto.setEmailAdres("test@test.com");
        dto.setOfcpsNm("Rank");
        dto.setGroupId("GROUP1");
        dto.setOrgnztId("ORG1");
        dto.setInsttCode("INST1");

        given(passwordEncoder.encode("pass")).willReturn("encoded");

        userManageService.insertUser(dto);
        verify(userRepository).save(argThat(user -> 
            user.getUserId().equals("fulluser") && 
            user.getUserNm().equals("Full Name") &&
            user.getEmailAdres().equals("test@test.com")
        ));
    }

    @Test
    @DisplayName("사용자 수정 성공 - 모든 필드 포함")
    void updateUser_Full_Success() {
        User user = createBaseUser("user1").userNm("Old").role(Role.USER).build();
        given(userRepository.findById("user1")).willReturn(Optional.of(user));

        UserManageDto dto = new UserManageDto();
        dto.setUserId("user1");
        dto.setUserNm("New Name");
        dto.setEmailAdres("new@test.com");
        dto.setGroupId("NEWGRP");

        userManageService.updateUser(dto);
        assertThat(user.getUserNm()).isEqualTo("New Name");
    }

    @Test
    @DisplayName("사용자 수정 실패 - 사용자 없음")
    void updateUser_NotFound() {
        UserManageDto dto = new UserManageDto();
        dto.setUserId("none");
        given(userRepository.findById("none")).willReturn(Optional.empty());

        assertThatThrownBy(() -> userManageService.updateUser(dto))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("사용자 삭제 성공")
    void deleteUser_Success() {
        userManageService.deleteUser("user1");
        verify(userRepository).deleteById("user1");
    }

    @Test
    @DisplayName("사용자 목록 일괄 삭제 성공")
    void deleteUserList_Success() {
        userManageService.deleteUserList(List.of("u1", "u2"));
        verify(userRepository).deleteAllByIdInBatch(anyList());
    }

    @Test
    @DisplayName("아이디 중복 확인")
    void checkIdDplct_Success() {
        given(userRepository.existsById("user1")).willReturn(true);
        assertThat(userManageService.checkIdDplct("user1")).isEqualTo(1);
        
        given(userRepository.existsById("new")).willReturn(false);
        assertThat(userManageService.checkIdDplct("new")).isEqualTo(0);
    }

    @Test
    @DisplayName("비밀번호 수정 성공")
    void updatePassword_Success() {
        User user = createBaseUser("user1").build();
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        given(passwordEncoder.encode("newpass")).willReturn("encoded");

        userManageService.updatePassword("user1", "newpass");
        assertThat(user.getPassword()).isEqualTo("encoded");
    }

    @Test
    @DisplayName("비밀번호 수정 실패 - 사용자 없음")
    void updatePassword_NotFound() {
        given(userRepository.findById("none")).willReturn(Optional.empty());

        assertThatThrownBy(() -> userManageService.updatePassword("none", "newpass"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_FOUND);
    }
}
