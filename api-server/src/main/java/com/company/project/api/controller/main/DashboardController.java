package com.company.project.api.controller.main;

import com.company.project.service.board.EgovBoardService;
import com.company.project.service.board.dto.BoardDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Dashboard", description = "대시보드 데이터 API")
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final EgovBoardService boardService;

    @Operation(summary = "대시보드 실데이터 조회 (오늘의 할일, 공지사항)")
    @GetMapping
    public ResponseEntity<?> getDashboardData() throws Exception {
        Map<String, Object> result = new HashMap<>();

        // 오늘의 할일 (업무게시판) - BBSMSTR_CCCCCCCCCCCC
        try {
            Page<BoardDto> taskList = boardService.getBoardPosts("BBSMSTR_CCCCCCCCCCCC", PageRequest.of(0, 5));
            result.put("taskList", taskList.getContent());
        } catch (Exception e) {
            result.put("taskList", List.of());
        }

        // 최신 업무공지 (공지사항) - BBSMSTR_AAAAAAAAAAAA
        try {
            Page<BoardDto> notiList = boardService.getBoardPosts("BBSMSTR_AAAAAAAAAAAA", PageRequest.of(0, 5));
            result.put("notiList", notiList.getContent());
        } catch (Exception e) {
            result.put("notiList", List.of());
        }

        result.put("success", true);
        return ResponseEntity.ok(result);
    }
}
