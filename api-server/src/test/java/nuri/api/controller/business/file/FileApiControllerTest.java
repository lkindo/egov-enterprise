package nuri.api.controller.business.file;

import nuri.business.service.file.FileService;
import nuri.business.service.file.dto.FileDto;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.support.ControllerTestSupport;
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

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
        given(fileService.uploadFiles(anyList())).willReturn(101L);

        // When & Then
        mockMvc.perform(multipart("/api/v1/files")
                .file(file1)
                .file(file2)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(101));
    }

    @Test
    @DisplayName("파일 목록 조회 성공")
    void getFileList_Success() throws Exception {
        // Given
        FileDto fileDto = FileDto.builder()
                .atchFileSn(101L)
                .fileSn(1)
                .orignlFileNm("test.txt")
                .fileExtsn("txt")
                .fileMg(100L)
                .build();
        given(fileService.getFileList(101L)).willReturn(List.of(fileDto));

        // When & Then
        mockMvc.perform(get("/api/v1/files/101")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].atchFileSn").value(101))
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
        given(fileService.getFileResource(101L, 1)).willReturn(resource);

        // When & Then
        mockMvc.perform(get("/api/v1/files/101/1"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"test.txt\""))
                .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
                .andExpect(content().bytes(content));
    }

    @Test
    @DisplayName("파일 단건 삭제 성공 — 서비스에 (atchFileSn, fileSn) 그대로 위임한다")
    void deleteFile_Success() throws Exception {
        mockMvc.perform(delete("/api/v1/files/101/2")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(fileService).deleteFile(101L, 2);
    }

    @Test
    @DisplayName("🔒 삭제 판정이 거부하면 403 으로 드러난다 — 서비스 계층 인가가 HTTP 경계까지 전파됨")
    void deleteFile_deniedByPolicy_isForbidden() throws Exception {
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(fileService).deleteFile(101L, 2);

        mockMvc.perform(delete("/api/v1/files/101/2")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
