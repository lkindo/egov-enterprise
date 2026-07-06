package nuri.web.file;

import nuri.api.controller.business.file.FileApiController;
import nuri.business.core.exception.GlobalExceptionHandler;
import nuri.business.service.file.FileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * FileApiController 테스트 (Standalone)
 */
class FileApiControllerTest {

    private MockMvc mockMvc;
    private FileService fileService;

    @BeforeEach
    void setUp() {
        fileService = mock(FileService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new FileApiController(fileService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("파일 업로드 - 성공")
    void uploadFiles_success() throws Exception {
        // Given
        when(fileService.uploadFiles(anyList())).thenReturn("FILE_ID_001");

        MockMultipartFile file1 = new MockMultipartFile(
                "files",
                "test1.txt",
                MediaType.TEXT_PLAIN_VALUE,
                "Hello World 1".getBytes());

        // When & Then
        mockMvc.perform(multipart("/api/v1/files")
                .file(file1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("FILE_ID_001"));
    }
}
