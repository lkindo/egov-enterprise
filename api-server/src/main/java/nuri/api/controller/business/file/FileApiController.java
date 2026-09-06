package nuri.api.controller.business.file;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.service.file.FileService;
import nuri.business.service.file.dto.FileDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

/**
 * 파일 관리 API 컨트롤러
 */
@Tag(name = "File", description = "파일 관리 API")
@RestController
@RequestMapping({"/api/v1/files", "/api/v1/admin/system/files", "/api/v1/admin/content/files", "/api/v1/admin/operation/files"})
@org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class FileApiController {

    private final FileService fileService;

    @Operation(summary = "파일 업로드", description = "여러 파일을 업로드하고 첨부파일 일련번호를 반환합니다.")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Long>> uploadFiles(
            @RequestPart("files") List<MultipartFile> files) throws IOException {
        Long atchFileSn = fileService.uploadFiles(files);
        return ResponseEntity.ok(ApiResponse.success(atchFileSn));
    }

    @Operation(summary = "파일 목록 조회", description = "첨부파일 일련번호에 속한 파일 목록을 조회합니다.")
    @GetMapping("/{atchFileSn}")
    public ResponseEntity<ApiResponse<List<FileDto>>> getFileList(@PathVariable Long atchFileSn) {
        return ResponseEntity.ok(ApiResponse.success(fileService.getFileList(atchFileSn)));
    }

    @Operation(summary = "파일 다운로드", description = "특정 파일을 다운로드합니다.")
    @GetMapping("/{atchFileSn}/{fileSn}")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable Long atchFileSn,
            @PathVariable Integer fileSn) throws IOException {
        Resource resource = fileService.getFileResource(atchFileSn, fileSn);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    /**
     * 첨부 단건 삭제.
     *
     * <p>[2026-09-05 신설] 종전에는 서비스 계층의 {@code deleteFile} 만 있고 HTTP 노출도 화면 버튼도 없어
     * 한 번 올린 첨부를 사용자가 되돌릴 방법이 없었다(프런트 {@code FileService.ts} 는 405 를 만나던
     * 메서드를 2026-08-05 에 제거하며 "인가와 함께 먼저 설계할 것" 을 남겼다). 인가는 열람 정책과 별개의
     * 삭제 판정({@code FileAccessPolicy#assertDeletable})이 서비스 계층에서 집행한다 — 업로더 본인·참조 행
     * 소유자·(개인 귀속이 아닌 첨부의) 관리자만 지울 수 있고, 공유 열람 근거는 삭제 근거가 아니다.
     */
    @Operation(summary = "파일 삭제", description = "첨부파일 한 건을 삭제합니다. 업로더 본인, 참조 행의 소유자, 또는 개인 귀속이 아닌 첨부의 관리자만 삭제할 수 있습니다.")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    @DeleteMapping("/{atchFileSn}/{fileSn}")
    public ResponseEntity<ApiResponse<Void>> deleteFile(
            @PathVariable Long atchFileSn,
            @PathVariable Integer fileSn) throws IOException {
        fileService.deleteFile(atchFileSn, fileSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
