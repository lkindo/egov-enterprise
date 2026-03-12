package com.company.project.service.login;

import com.company.project.domain.login.LoginPolicy;
import com.company.project.domain.login.LoginPolicyRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.login.dto.LoginPolicyDto;
import egovframework.com.cmm.ComDefaultVO;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("LoginPolicyManageService 테스트")
class LoginPolicyManageServiceTest {

    @Mock
    private LoginPolicyRepository loginPolicyRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LoginPolicyManageService loginPolicyManageService;

    @Test
    @DisplayName("로그인 정책 목록 조회 - 상세 매핑 검증")
    void selectLoginPolicyList_Detailed_Success() {
        User user = User.builder()
                .userId("user1")
                .esntlId("ESNTL_001")
                .userNm("Name 1")
                .password("password")
                .build();
        Page<User> page = new PageImpl<>(List.of(user));
        // Use any() to be safe
        given(userRepository.findAll(any(Pageable.class))).willReturn(page);

        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId("user1")
                .ipInfo("1.1.1.1")
                .dplctPermAt("Y")
                .lmttAt("N")
                .build();
        given(loginPolicyRepository.findById("user1")).willReturn(Optional.of(policy));

        ComDefaultVO vo = new ComDefaultVO();
        vo.setPageIndex(1);
        vo.setPageUnit(10);
        
        List<LoginPolicyDto> result = loginPolicyManageService.selectLoginPolicyList(vo);
        
        assertThat(result).hasSize(1);
        LoginPolicyDto dto = result.get(0);
        assertThat(dto.getEmplyrId()).isEqualTo("user1");
        assertThat(dto.getRegYn()).isEqualTo("Y");
        assertThat(dto.getIpInfo()).isEqualTo("1.1.1.1");
        assertThat(dto.getDplctPermAt()).isEqualTo("Y");
        assertThat(dto.getLmttAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("로그인 정책 목록 조회 - 정책 없음")
    void selectLoginPolicyList_NoPolicy_Success() {
        User user = User.builder()
                .userId("user2")
                .esntlId("ESNTL_002")
                .userNm("Name 2")
                .password("password")
                .build();
        given(userRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of(user)));
        given(loginPolicyRepository.findById("user2")).willReturn(Optional.empty());

        List<LoginPolicyDto> result = loginPolicyManageService.selectLoginPolicyList(new ComDefaultVO());
        assertThat(result.get(0).getRegYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("로그인 정책 목록 조회 - 정책 없음")
    void selectLoginPolicyList_WithoutPolicy_Success() {
        User user = User.builder()
                .userId("user2")
                .esntlId("ESNTL_002")
                .userNm("Name 2")
                .password("password")
                .build();
        given(userRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of(user)));
        given(loginPolicyRepository.findById("user2")).willReturn(Optional.empty());

        List<LoginPolicyDto> result = loginPolicyManageService.selectLoginPolicyList(new ComDefaultVO());
        assertThat(result.get(0).getRegYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("로그인 정책 총 갯수 조회")
    void selectLoginPolicyListTotCnt_Success() {
        given(userRepository.count()).willReturn(100L);
        int result = loginPolicyManageService.selectLoginPolicyListTotCnt(new ComDefaultVO());
        assertThat(result).isEqualTo(100);
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 성공 - 정책 있음")
    void selectLoginPolicy_WithPolicy_Success() {
        User user = User.builder()
                .userId("user1")
                .esntlId("ESNTL_001")
                .userNm("Name")
                .password("password")
                .build();
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        
        LoginPolicy policy = LoginPolicy.builder().ipInfo("192.168.0.1").build();
        given(loginPolicyRepository.findById("user1")).willReturn(Optional.of(policy));

        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy("user1");
        assertThat(result.getIpInfo()).isEqualTo("192.168.0.1");
        assertThat(result.getRegYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 성공 - 정책 없음")
    void selectLoginPolicy_WithoutPolicy_Success() {
        User user = User.builder()
                .userId("user1")
                .esntlId("ESNTL_001")
                .userNm("Name")
                .password("password")
                .build();
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        given(loginPolicyRepository.findById("user1")).willReturn(Optional.empty());

        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy("user1");
        assertThat(result.getRegYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("로그인 정책 상세 조회 실패 - 회원 데이터 없음")
    void selectLoginPolicy_UserNotFound() {
        given(userRepository.findById(anyString())).willReturn(Optional.empty());
        LoginPolicyDto result = loginPolicyManageService.selectLoginPolicy("user1");
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("로그인 정책 등록 성공")
    void insertLoginPolicy_Success() {
        LoginPolicyDto dto = LoginPolicyDto.builder()
                .emplyrId("user1")
                .ipInfo("127.0.0.1")
                .build();
        
        loginPolicyManageService.insertLoginPolicy(dto);
        verify(loginPolicyRepository).save(any(LoginPolicy.class));
    }

    @Test
    @DisplayName("로그인 정책 수정 성공")
    void updateLoginPolicy_Success() {
        LoginPolicy policy = LoginPolicy.builder().emplyrId("user1").ipInfo("Old").build();
        given(loginPolicyRepository.findById("user1")).willReturn(Optional.of(policy));

        LoginPolicyDto dto = LoginPolicyDto.builder().emplyrId("user1").ipInfo("New").build();
        loginPolicyManageService.updateLoginPolicy(dto);
        
        assertThat(policy.getIpInfo()).isEqualTo("New");
    }

    @Test
    @DisplayName("로그인 정책 수정 실패 - 정책 없음")
    void updateLoginPolicy_NotFound() {
        LoginPolicyDto dto = LoginPolicyDto.builder().emplyrId("none").build();
        given(loginPolicyRepository.findById("none")).willReturn(Optional.empty());

        assertThatThrownBy(() -> loginPolicyManageService.updateLoginPolicy(dto))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("로그인 정책 삭제 성공")
    void deleteLoginPolicy_Success() {
        loginPolicyManageService.deleteLoginPolicy("user1");
        verify(loginPolicyRepository).deleteById("user1");
    }
}
