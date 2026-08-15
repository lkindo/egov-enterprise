package nuri.api.controller.foundation.controller.system.service.survey;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.system.service.survey.SurveyRespondentService;
import nuri.business.service.system.service.survey.dto.SurveyRespondentDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.security.annotation.AdminOnly;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 설문 응답자 관리 API (Admin).
 *
 * <p>[D-4 2단계] {@link SurveyRespondentService} 는 목록·단건·등록·수정·삭제 5종이 이미 구현돼
 * 있었고 리포지토리에 설문별 검색 술어까지 있었으나, <b>이를 참조하는 클래스가 단위 테스트뿐</b>
 * 이었다 — 컨트롤러만 없어 도메인 전체가 도달 불가였다(D-1 의 {@code UserLogRepositoryImpl} 과
 * 동일 패턴).
 *
 * <p><b>⚠ 인가를 {@code @AdminOnly} 로 좁힌 이유</b>: 응답자 레코드는 성별({@code gndrCd})·
 * 생년월일({@code brdt})·전화번호 3분할({@code rgnTelno}/{@code midTelno}/{@code endTelno})을 담는
 * <b>개인정보 그 자체</b>다. 설문 정의({@code SurveyApiController})가 관리자/시스템 공용인 것과
 * 달리, 참여자 신상은 운영 모니터링 목적의 SYSTEM 롤이 열람할 이유가 없다.
 * 개인정보 조회 로그를 {@code @AdminOnly} 로 좁힌 2026-08-05 결정과 같은 기준이다.
 *
 * <p>경로를 {@code /{srvySn}/respondents} 로 중첩한 것도 같은 이유다. 서비스는 설문 범위로
 * 한정해 조회하며(1단계에서 전체 설문을 훑던 결함을 고쳤다), 경로가 그 범위를 강제한다.
 */
@Tag(name = "SurveyRespondent", description = "설문 응답자 관리 API (Admin)")
@RestController("systemSurveyRespondentApiController")
@RequestMapping("/api/v1/admin/system/surveys/{srvySn}/respondents")
@RequiredArgsConstructor
public class SurveyRespondentApiController {

    private final SurveyRespondentService surveyRespondentService;

    @Operation(summary = "설문 응답자 목록", description = "해당 설문의 응답자를 이름 부분일치로 검색한다.")
    @AdminOnly
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SurveyRespondentDto>>> getRespondents(
            @PathVariable Long srvySn,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<SurveyRespondentDto> page = surveyRespondentService.getSurveyRespondentList(srvySn, keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "설문 응답자 단건 조회")
    @AdminOnly
    @GetMapping("/{respondentId}")
    public ResponseEntity<ApiResponse<SurveyRespondentDto>> getRespondent(
            @PathVariable Long srvySn,
            @PathVariable String respondentId) {
        return ResponseEntity.ok(ApiResponse.success(surveyRespondentService.getSurveyRespondent(srvySn, respondentId)));
    }

    @Operation(summary = "설문 응답자 등록")
    @AdminOnly
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createRespondent(
            @PathVariable Long srvySn,
            @Valid @RequestBody SurveyRespondentDto dto) {
        // 경로의 설문 ID 를 정본으로 삼는다 — 본문이 다른 설문을 가리켜도 경로가 이긴다.
        dto.setSrvySn(srvySn);
        String id = surveyRespondentService.createSurveyRespondent(currentUserId(), dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "설문 응답자 수정")
    @AdminOnly
    @PutMapping("/{respondentId}")
    public ResponseEntity<ApiResponse<Void>> updateRespondent(
            @PathVariable Long srvySn,
            @PathVariable String respondentId,
            @Valid @RequestBody SurveyRespondentDto dto) {
        dto.setSrvySn(srvySn);
        surveyRespondentService.updateSurveyRespondent(srvySn, respondentId, currentUserId(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "설문 응답자 삭제")
    @AdminOnly
    @DeleteMapping("/{respondentId}")
    public ResponseEntity<ApiResponse<Void>> deleteRespondent(
            @PathVariable Long srvySn,
            @PathVariable String respondentId) {
        surveyRespondentService.deleteSurveyRespondent(srvySn, respondentId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /** 감사 컬럼(frstRgtrId/lastMdfrId)은 표준 Auditing 이 채우지만, 서비스 시그니처가 요구한다. */
    private String currentUserId() {
        return SecurityUtil.getCurrentLoginId().orElse("SYSTEM");
    }
}
