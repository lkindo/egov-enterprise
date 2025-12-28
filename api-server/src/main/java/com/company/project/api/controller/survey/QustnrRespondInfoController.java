package com.company.project.api.controller.survey;

import egovframework.let.uss.olp.qri.service.EgovQustnrRespondInfoService;
import egovframework.let.uss.olp.qri.service.QustnrRespondInfoVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/survey")
@RequiredArgsConstructor
@Tag(name = "Survey Response", description = "설문 조사 응답 및 통계 관리")
public class QustnrRespondInfoController {

    @Resource(name = "egovQustnrRespondInfoService")
    private EgovQustnrRespondInfoService egovQustnrRespondInfoService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Operation(summary = "설문 응답 목록 조회")
    @GetMapping("/response")
    public ResponseEntity<?> getResponseList(@ModelAttribute QustnrRespondInfoVO searchVO) throws Exception {

        searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
        searchVO.setPageSize(propertiesService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
        paginationInfo.setPageSize(searchVO.getPageSize());

        searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
        searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        List<?> list = egovQustnrRespondInfoService.selectQustnrRespondInfoList(searchVO);
        int totCnt = egovQustnrRespondInfoService.selectQustnrRespondInfoListCnt(searchVO);
        paginationInfo.setTotalRecordCount(totCnt);

        Map<String, Object> response = new HashMap<>();
        response.put("resultList", list);
        response.put("paginationInfo", paginationInfo);

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "설문 응답 등록")
    @PostMapping("/response")
    public ResponseEntity<?> registerResponse(@RequestBody QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception {
        // Assume FrstRegisterId/LastUpdusrId are set from authenticated user context in
        // real app
        // Here getting from request body for simplicity or relying on service/client to
        // provide

        egovQustnrRespondInfoService.insertQustnrRespondInfo(qustnrRespondInfoVO);

        return ResponseEntity.ok("Successfully registered survey response.");
    }

    @Operation(summary = "설문 통계 조회 (객관식/주관식)")
    @GetMapping("/stats")
    public ResponseEntity<?> getSurveyStats(
            @RequestParam String qestnrId,
            @RequestParam String qestnrTmplatId,
            @RequestParam(defaultValue = "1") String type) throws Exception {

        Map<String, Object> params = new HashMap<>();
        params.put("qestnrId", qestnrId);
        params.put("qestnrTmplatId", qestnrTmplatId);

        List<?> stats;
        if ("1".equals(type)) {
            stats = egovQustnrRespondInfoService.selectQustnrRespondInfoManageStatistics1(params);
        } else {
            stats = egovQustnrRespondInfoService.selectQustnrRespondInfoManageStatistics2(params);
        }

        return ResponseEntity.ok(stats);
    }
}
