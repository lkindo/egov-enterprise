package com.company.project.api.controller.file;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.file.FileItem;
import com.company.project.service.file.FileService;
import com.company.project.service.file.dto.FileDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Tag(name = "File", description = "File Management APIs")
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @Operation(summary = "Upload Files")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadFiles(
            @RequestPart("files") List<MultipartFile> files,
            @RequestParam(value = "atchFileId", required = false) String atchFileId) throws IOException {
        String resultId = fileService.uploadFiles(files, atchFileId);
        return ResponseEntity.ok(ApiResponse.success(resultId));
    }

    @Operation(summary = "Get File List")
    @GetMapping("/{atchFileId}")
    public ResponseEntity<ApiResponse<List<FileDto>>> getFileList(@PathVariable String atchFileId) {
        return ResponseEntity.ok(ApiResponse.success(fileService.getFileList(atchFileId)));
    }

    @Operation(summary = "Download File")
    @GetMapping("/{atchFileId}/{fileSn}")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String atchFileId,
            @PathVariable Integer fileSn) throws IOException {

        FileItem item = fileService.getFileItem(atchFileId, fileSn);
        Path filePath = Paths.get(item.getFileStreCours(), item.getStreFileNm());
        Resource resource = new UrlResource(filePath.toUri());

        String encodedFileName = UriUtils.encode(item.getOrignlFileNm(), StandardCharsets.UTF_8);
        String contentDisposition = "attachment; filename=\"" + encodedFileName + "\"";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .body(resource);
    }
}
