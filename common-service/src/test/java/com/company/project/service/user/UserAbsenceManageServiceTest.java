package com.company.project.service.user;

import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.entity.UserAbsence;
import com.company.project.domain.user.repository.UserAbsenceRepository;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.user.dto.UserAbsenceDto;
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

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserAbsenceManageServiceTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private UserAbsenceRepository userAbsenceRepository;

  @InjectMocks
  private UserAbsenceManageService userAbsenceManageService;

  @Test
  @DisplayName("Verify N+1 query behavior is fixed in selectUserAbsenceList")
  void selectUserAbsenceList_checkRepositoryInteractions() {
    // given
    List<User> users = new ArrayList<>();
    int userCount = 5;
    for (int i = 0; i < userCount; i++) {
      users.add(User.builder()
          .userId("user" + i)
          .userNm("User " + i)
          .esntlId("ESNTL_" + i)
          .password("pw")
          .build());
    }
    Page<User> userPage = new PageImpl<>(java.util.Objects.requireNonNull(users));

    given(userRepository.findAll(any(Pageable.class))).willReturn(userPage);

    // Mock findAllById
    List<UserAbsence> absences = new ArrayList<>();
    // Add one absence for user0
    absences.add(UserAbsence.builder()
        .userId("user0")
        .userAbsnceAt("Y")
        .build());
    given(userAbsenceRepository.findAllById(any()))
        .willReturn(java.util.Objects.requireNonNull(absences));

    // when
    ComDefaultVO searchVO = new ComDefaultVO();
    searchVO.setPageIndex(1);
    searchVO.setPageUnit(10);
    List<UserAbsenceDto> result = userAbsenceManageService.selectUserAbsenceList(searchVO);

    // then
    assertThat(result).hasSize(userCount);

    // Verify user0 has absence
    assertThat(result.get(0).getUserId()).isEqualTo("user0");
    assertThat(result.get(0).getUserAbsnceAt()).isEqualTo("Y");
    assertThat(result.get(0).getRegYn()).isEqualTo("Y");

    // Verify user1 has no absence
    assertThat(result.get(1).getUserId()).isEqualTo("user1");
    assertThat(result.get(1).getUserAbsnceAt()).isEqualTo("N");
    assertThat(result.get(1).getRegYn()).isEqualTo("N");

    // Verify findAllById called once
    verify(userAbsenceRepository, times(1)).findAllById(any());
    // Verify findById called zero times
    verify(userAbsenceRepository, times(0)).findById(any(String.class));
  }
}
