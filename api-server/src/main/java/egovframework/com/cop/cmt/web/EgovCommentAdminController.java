package egovframework.com.cop.cmt.web;

import com.company.project.service.comment.EgovCommentService;
import com.company.project.service.comment.dto.CommentDto;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

/**
 * 전역 댓글 관리를 위한 관리자 컨트롤러
 */
@RestController
@RequestMapping("/api/v1/admin/cop/cmt")
public class EgovCommentAdminController {

    @Resource(name = "egovCommentService")
    private EgovCommentService commentService;

    @GetMapping("/selectCommentList.do")
    public ResponseEntity<Map<String, Object>> selectCommentList(
            @RequestParam(value = "pageIndex", defaultValue = "1") int pageIndex,
            @RequestParam(value = "searchKeyword", defaultValue = "") String searchKeyword) {

        Pageable pageable = PageRequest.of(pageIndex - 1, 10, Sort.Direction.DESC, "id");
        Page<CommentDto> pageResult = commentService.getAllCommentList(pageable, searchKeyword);

        Map<String, Object> response = new HashMap<>();
        response.put("list", pageResult.getContent());
        response.put("totalRecordCount", (int) pageResult.getTotalElements());
        response.put("success", true);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/deleteComment.do")
    public ResponseEntity<Map<String, Object>> deleteComment(@RequestParam("commentNo") Long commentNo) {
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        String userId = user != null ? user.getUniqId() : "SYSTEM";

        commentService.deleteComment(commentNo, userId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        return ResponseEntity.ok(response);
    }
}
