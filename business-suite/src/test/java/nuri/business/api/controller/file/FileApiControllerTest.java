package nuri.business.api.controller.file;

import nuri.business.service.file.FileService;
import nuri.business.service.file.dto.FileDto;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FileApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("FileApiController 테스트")
class FileApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private FileService fileService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("파일 업로드 성공")
    void uploadFiles_Success() throws Exception {
        // Given
        MockMultipartFile file1 = new MockMultipartFile("files", "test1.txt", MediaType.TEXT_PLAIN_VALUE, "test content 1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile("files", "test2.txt", MediaType.TEXT_PLAIN_VALUE, "test content 2".getBytes());
        given(fileService.uploadFiles(anyList())).willReturn("FILE_001");

        // When & Then
        mockMvc.perform(multipart("/api/v1/files")
                .file(file1)
                .file(file2)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("FILE_001"));
    }

    @Test
    @DisplayName("파일 목록 조회 성공")
    void getFileList_Success() throws Exception {
        // Given
        FileDto fileDto = FileDto.builder()
                .atchFileId("FILE_001")
                .fileSn(1)
                .orignlFileNm("test.txt")
                .fileExtsn("txt")
                .fileMg(100L)
                .build();
        given(fileService.getFileList("FILE_001")).willReturn(List.of(fileDto));

        // When & Then
        mockMvc.perform(get("/api/v1/files/FILE_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].atchFileId").value("FILE_001"))
                .andExpect(jsonPath("$.data[0].orignlFileNm").value("test.txt"))
                .andExpect(jsonPath("$.data[0].fileSn").value(1));
    }

    @Test
    @DisplayName("파일 다운로드 성공")
    void downloadFile_Success() throws Exception {
        // Given
        byte[] content = "file download content".getBytes();
        Resource resource = new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return "test.txt";
            }
        };
        given(fileService.getFileResource("FILE_001", 1)).willReturn(resource);

        // When & Then
        mockMvc.perform(get("/api/v1/files/FILE_001/1"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"test.txt\""))
                .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
                .andExpect(content().bytes(content));
    }
}
