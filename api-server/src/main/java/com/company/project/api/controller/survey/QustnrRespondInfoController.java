package com.company.project.api.controller.survey;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qri.service.EgovQustnrRespondInfoService;
import egovframework.com.uss.olp.qri.service.QustnrRespondInfoVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Survey Response", description = "설문 조사 응답 및 통계 관리")
public class QustnrRespondInfoController {

    private final EgovQustnrRespondInfoService egovQustnrRespondInfoService;

    public QustnrRespondInfoController(
            @org.springframework.context.annotation.Lazy EgovQustnrRespondInfoService egovQustnrRespondInfoService) {
        this.egovQustnrRespondInfoService = egovQustnrRespondInfoService;
    }

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Operation(summary = "설문 응답 목록 조회")
    @GetMapping("/response")
    public ResponseEntity<?> getResponseList(@ModelAttribute ComDefaultVO searchVO) throws Exception {

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
        egovQustnrRespondInfoService.insertQustnrRespondInfo(qustnrRespondInfoVO);
        return ResponseEntity.ok("Successfully registered survey response.");
    }

    @Operation(summary = "설문 응답 상세 조회")
    @GetMapping("/response/{id}")
    public ResponseEntity<?> getResponseDetail(@PathVariable String id) throws Exception {
        QustnrRespondInfoVO vo = new QustnrRespondInfoVO();
        vo.setQestnrQesitmId(id);

        List<?> detail = egovQustnrRespondInfoService.selectQustnrRespondInfoDetail(vo);
        if (detail == null || detail.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(detail.get(0));
    }

    @Operation(summary = "설문 응답 삭제")
    @DeleteMapping("/response/{id}")
    public ResponseEntity<?> deleteResponse(@PathVariable String id) throws Exception {
        QustnrRespondInfoVO vo = new QustnrRespondInfoVO();
        vo.setQestnrQesitmId(id);

        egovQustnrRespondInfoService.deleteQustnrRespondInfo(vo);
        return ResponseEntity.ok("Successfully deleted survey response.");
    }

    @Operation(summary = "설문 통계 조회 (객관식/주관식)")
    @GetMapping("/stats")
    public ResponseEntity<?> getSurveyStats(
            @RequestParam String qestnrId,
            @RequestParam(required = false) String qestnrTmplatId,
            @RequestParam(defaultValue = "1") String type) throws Exception {

        Map<String, Object> params = new HashMap<>();
        params.put("qestnrId", qestnrId);
        if (qestnrTmplatId != null) {
            params.put("qestnrTmplatId", qestnrTmplatId);
        }

        List<?> stats;
        if ("1".equals(type)) {
            stats = egovQustnrRespondInfoService.selectQustnrRespondInfoManageStatistics1(params);
        } else {
            stats = egovQustnrRespondInfoService.selectQustnrRespondInfoManageStatistics2(params);
        }

        return ResponseEntity.ok(stats);
    }
}
