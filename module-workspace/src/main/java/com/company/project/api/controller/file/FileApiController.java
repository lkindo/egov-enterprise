package com.company.project.api.controller.file;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.file.FileService;
import com.company.project.service.file.dto.FileDto;
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

 * JPA             ????    ?     ??API ?      ?      ?       (         ??            ??         )

 */

@Tag(name = "File", description = "???    ?     ??API")

@RestController

@RequestMapping("/api/v1/files")

@RequiredArgsConstructor

public class FileController {

    private final FileService fileService;

@Operation(summary = "???    ??      ??")

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)

    public ResponseEntity<ApiResponse<String>> uploadFiles(

            @RequestPart("files") List<MultipartFile> files) throws IOException {

        String resultId = fileService.uploadFiles(files);

        return ResponseEntity.ok(ApiResponse.success(resultId));

    }

@Operation(summary = "         ????                ?         ??")

    @GetMapping("/{atchFileId}")

    public ResponseEntity<ApiResponse<List<FileDto>>> getFileList(@PathVariable String atchFileId) {

        return ResponseEntity.ok(ApiResponse.success(fileService.getFileList(atchFileId)));

    }

@Operation(summary = "???    ??                  ?")

    @GetMapping("/{atchFileId}/{fileSn}")

    public ResponseEntity<Resource> downloadFile(

            @PathVariable String atchFileId,

            @PathVariable Integer fileSn) throws IOException {

        Resource resource = fileService.getFileResource(atchFileId, fileSn);

        return ResponseEntity.ok()

                .contentType(MediaType.APPLICATION_OCTET_STREAM)

                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")

                .body(resource);

    }

}
