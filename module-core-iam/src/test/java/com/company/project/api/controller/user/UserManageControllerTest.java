package com.company.project.api.controller.user;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.group.GroupManageService;

import com.company.project.service.usermanagement.UserManageService; // Fixed import
import egovframework.com.cmm.ComDefaultVO;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.ui.ModelMap;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class UserManageControllerTest {

  @Mock
  private UserManageService userManageService;

  @Mock
  private CommonCodeService commonCodeService;

  @Mock
  private GroupManageService groupManageService;

  @Mock
  private EgovPropertyService propertiesService;

  @Mock
  private org.springframework.context.MessageSource messageSource;

  @InjectMocks
  private UserManageController userManageController;

  @BeforeEach
  public void setup() {
    MockitoAnnotations.openMocks(this);
  }

  @Test
  public void selectUserList_ShouldLogAndThrow_WhenExceptionOccurs() throws Exception {
    // Arrange
    ComDefaultVO searchVO = new ComDefaultVO();
    ModelMap model = new ModelMap();

    // Mock propertiesService to avoid NullPointerException before the service call
    when(propertiesService.getInt("pageUnit")).thenReturn(10);
    when(propertiesService.getInt("pageSize")).thenReturn(10);

    // Simulate an exception in the service layer
    when(userManageService.selectUserList(any())).thenThrow(new RuntimeException("Test Exception"));

    // Act & Assert
    assertThrows(RuntimeException.class, () -> {
      userManageController.selectUserList(searchVO, model);
    });
  }
}
