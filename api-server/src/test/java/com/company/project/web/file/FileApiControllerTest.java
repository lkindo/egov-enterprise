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
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 파일 API 컨트롤러 슬라이스 테스트
 */
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

        @MockBean
        private FileService fileService;

        @MockBean
        private JwtTokenProvider jwtTokenProvider;

        @MockBean
        private PasswordEncoder passwordEncoder;

        @MockBean
        private AuthenticationManager authenticationManager;

        @Test
        @DisplayName("파일 업로드 성공")
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
        @DisplayName("인증 없이 파일 업로드 시 401 에러")
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
