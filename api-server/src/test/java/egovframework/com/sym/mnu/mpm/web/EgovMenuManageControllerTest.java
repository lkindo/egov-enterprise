package egovframework.com.sym.mnu.mpm.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mock.web.MockMultipartHttpServletRequest;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.service.EgovUserDetailsService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.mnu.mpm.service.EgovMenuManageService;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;

class EgovMenuManageControllerTest {

    @InjectMocks
    private EgovMenuManageController controller;

    @Mock
    private EgovMenuManageService menuManageService;

    @Mock
    private EgovMessageSource egovMessageSource;

    @Mock
    private EgovUserDetailsService egovUserDetailsService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // Inject EgovMessageSource into controller
        ReflectionTestUtils.setField(controller, "egovMessageSource", egovMessageSource);

        // Setup EgovUserDetailsHelper mock
        new EgovUserDetailsHelper().setEgovUserDetailsService(egovUserDetailsService);
    }

    @Test
    void testMenuBndeRegistAPI_Success() throws Exception {
        // Given
        when(egovUserDetailsService.isAuthenticated()).thenReturn(true);
        when(menuManageService.menuBndeAllDelete()).thenReturn(true);
        when(menuManageService.menuBndeRegist(any(MenuManageVO.class), any(InputStream.class))).thenReturn("Upload Success");

        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content".getBytes());
        MockMultipartHttpServletRequest request = new MockMultipartHttpServletRequest();
        request.addFile(file);

        MenuManageVO menuManageVO = new MenuManageVO();

        // When
        Map<String, Object> result = controller.menuBndeRegistAPI(request, menuManageVO);

        // Then
        assertNotNull(result);
        assertEquals("success", result.get("status"));
        assertEquals("Upload Success", result.get("message"));
        verify(menuManageService).menuBndeAllDelete();
        verify(menuManageService).menuBndeRegist(any(MenuManageVO.class), any(InputStream.class));
    }

    @Test
    void testMenuBndeRegistAPI_InvalidExtension() throws Exception {
        // Given
        when(egovUserDetailsService.isAuthenticated()).thenReturn(true);
        when(egovMessageSource.getMessage("fail.common.msg")).thenReturn("fail.common.msg");

        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "content".getBytes());
        MockMultipartHttpServletRequest request = new MockMultipartHttpServletRequest();
        request.addFile(file);

        MenuManageVO menuManageVO = new MenuManageVO();

        // When
        Map<String, Object> result = controller.menuBndeRegistAPI(request, menuManageVO);

        // Then
        assertEquals("error", result.get("status"));
        assertEquals("xls, xlsx 파일 타입만 등록이 가능합니다.", result.get("message"));
    }

    @Test
    void testMenuBndeRegistAPI_Unauthenticated() throws Exception {
         // Given
        when(egovUserDetailsService.isAuthenticated()).thenReturn(false);
        when(egovMessageSource.getMessage("fail.common.login")).thenReturn("Login Required");

        MockMultipartHttpServletRequest request = new MockMultipartHttpServletRequest();
        MenuManageVO menuManageVO = new MenuManageVO();

        // When
        Map<String, Object> result = controller.menuBndeRegistAPI(request, menuManageVO);

        // Then
        assertEquals("error", result.get("status"));
        assertEquals("Login Required", result.get("message"));
    }

    @Test
    void testMenuBndeRegistAPI_ServiceFailure() throws Exception {
        // Given
        when(egovUserDetailsService.isAuthenticated()).thenReturn(true);
        when(menuManageService.menuBndeAllDelete()).thenReturn(true);
        doThrow(new IOException("IO Error")).when(menuManageService).menuBndeRegist(any(MenuManageVO.class), any(InputStream.class));

        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content".getBytes());
        MockMultipartHttpServletRequest request = new MockMultipartHttpServletRequest();
        request.addFile(file);

        MenuManageVO menuManageVO = new MenuManageVO();

        // When
        Map<String, Object> result = controller.menuBndeRegistAPI(request, menuManageVO);

        // Then
        assertEquals("error", result.get("status"));
        assertEquals("File upload failed", result.get("message"));
    }

    @Test
    void testMenuBndeRegistAPI_NoFile() throws Exception {
        // Given
        when(egovUserDetailsService.isAuthenticated()).thenReturn(true);

        MockMultipartHttpServletRequest request = new MockMultipartHttpServletRequest();
        // No file added

        MenuManageVO menuManageVO = new MenuManageVO();

        // When
        Map<String, Object> result = controller.menuBndeRegistAPI(request, menuManageVO);

        // Then
        assertEquals("error", result.get("status"));
        assertEquals("No file provided", result.get("message"));
    }
}
