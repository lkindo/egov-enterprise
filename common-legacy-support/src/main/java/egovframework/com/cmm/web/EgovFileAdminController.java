package egovframework.com.cmm.web;

import com.company.project.service.file.EgovFileService;
import com.company.project.service.file.dto.FileDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * ? ??? ??? ? ?? ???
 **/
@RestController
@RequestMapping("/api/v1/admin/cmm/fms")
public class EgovFileAdminController {

    @Resource(name = "egovFileService")
    private EgovFileService fileService;

    @GetMapping("/selectFileList.do")
    public ResponseEntity<Map<String, Object>> selectFileList(
            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,
            @RequestParam(value = "searchKeyword", defaultValue = "") String searchKeyword) {

        Pageable pageable = PageRequest.of(pageIndex - 1, 10, Sort.Direction.DESC, "fileSn");
        Page<FileDto> pageResult = fileService.getAllFileList(pageable, searchKeyword);

        Map<String, Object> response = new HashMap<>();
        response.put("list", pageResult.getContent());
        response.put("totalRecordCount", (int) pageResult.getTotalElements());
        response.put("success", true);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/deleteFile.do")
    public ResponseEntity<Map<String, Object>> deleteFile(
            @RequestParam("atchFileId") String atchFileId,
            @RequestParam("fileSn") int fileSn) throws IOException {

        fileService.deleteFile(atchFileId, fileSn);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        return ResponseEntity.ok(response);
    }
}
