package com.company.project.web.file;

import com.company.project.api.controller.file.FileController;
import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.service.file.FileService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.batch.BatchAutoConfiguration;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 회원API ??쳜?猿낆뿉??댁몠 테스트사용자 */
@WebMvcTest(controllers = FileController.class, excludeAutoConfiguration = {
        DataSourceAutoConfiguration.class,
        JpaRepositoriesAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class,
        BatchAutoConfiguration.class
})
@ActiveProfiles("test")
class FileApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileService fileService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private AuthenticationManager authenticationManager;

    @Test
    @DisplayName("사용자 醫롫윥餓??성공)")
    void uploadFiles_success() throws Exception {
        // Given
        when(jwtTokenProvider.validateToken(any())).thenReturn(true);
        when(fileService.uploadFiles(anyList())).thenReturn("FILE_ID_001");

        MockMultipartFile file1 = new MockMultipartFile(
                "files",
                "test1.txt",
                MediaType.TEXT_PLAIN_VALUE,
                "Hello World 1".getBytes());

        // When & Then
        mockMvc.perform(multipart("/api/v1/files")
                .file(file1)
                .header("Authorization", "Bearer mock-token"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("??醫롫윪凉사용자 醫롫윥餓????401 테스트)")
    void uploadFiles_unauthorized() throws Exception {
        MockMultipartFile file1 = new MockMultipartFile(
                "files",
                "test1.txt",
                MediaType.TEXT_PLAIN_VALUE,
                "Hello World 1".getBytes());

        // When & Then
        mockMvc.perform(multipart("/api/v1/files")
                .file(file1))
                .andDo(print())
                .andExpect(status().isUnauthorized());
    }
}
