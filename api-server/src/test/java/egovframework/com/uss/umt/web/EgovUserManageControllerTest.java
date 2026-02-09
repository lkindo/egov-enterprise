package egovframework.com.uss.umt.web;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.EgovUserDetailsService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.umt.service.EgovUserManageService;
import egovframework.com.uss.umt.service.UserDefaultVO;
import egovframework.com.uss.umt.service.UserManageVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.ui.ModelMap;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

public class EgovUserManageControllerTest {

    @Mock
    private EgovUserManageService userManageService;

    @Mock
    private EgovUserDetailsService egovUserDetailsService;

    @InjectMocks
    private EgovUserManageController egovUserManageController;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);

        // Mock EgovUserDetailsHelper
        EgovUserDetailsHelper helper = new EgovUserDetailsHelper();
        helper.setEgovUserDetailsService(egovUserDetailsService);
    }

    @Test
    public void updatePassword_ShouldUseAuthenticatedUserId_NotRequestUserId() throws Exception {
        // Arrange
        LoginVO loginVO = new LoginVO();
        loginVO.setUniqId("USER_SESSION_UNIQ_ID");
        loginVO.setId("USER_SESSION_ID");

        when(egovUserDetailsService.isAuthenticated()).thenReturn(true);
        when(egovUserDetailsService.getAuthenticatedUser()).thenReturn(loginVO);

        Map<String, Object> commandMap = new HashMap<>();
        commandMap.put("uniqId", "ATTACKER_TARGET_UNIQ_ID"); // Attempt IDOR
        commandMap.put("oldPassword", "oldPass");
        commandMap.put("newPassword", "newPass");
        commandMap.put("newPassword2", "newPass");

        UserDefaultVO searchVO = new UserDefaultVO();
        UserManageVO userManageVO = new UserManageVO();
        userManageVO.setUniqId("ATTACKER_TARGET_UNIQ_ID"); // Usually bound by Spring
        userManageVO.setEmplyrId("ATTACKER_TARGET_ID");

        ModelMap model = new ModelMap();

        // Simulate password check success (mocking selectPassword)
        UserManageVO resultVO = new UserManageVO();
        resultVO.setPassword("ENCRYPTED_PASSWORD"); // Mock result

        when(userManageService.selectPassword(any(UserManageVO.class))).thenReturn(resultVO);

        // Act
        try {
            egovUserManageController.updatePassword(model, commandMap, searchVO, userManageVO);
        } catch (Exception e) {
            // Ignore exceptions unrelated to our check (e.g. encryption or validation)
            // We just want to verify the service call
        }

        // Assert
        ArgumentCaptor<UserManageVO> argument = ArgumentCaptor.forClass(UserManageVO.class);
        verify(userManageService).selectPassword(argument.capture());

        assertEquals("USER_SESSION_UNIQ_ID", argument.getValue().getUniqId(),
            "Should use UniqId from Session, NOT from Request! This indicates an IDOR vulnerability.");
    }
}
