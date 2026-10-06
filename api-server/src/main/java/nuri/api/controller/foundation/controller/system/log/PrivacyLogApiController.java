package nuri.api.controller.foundation.controller.system.log;

import nuri.api.support.XlsxExport;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.PrivacyLogManageService;
import nuri.business.service.log.dto.PrivacyLogDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 개인정보 조회 로그 열람 API (Admin 전용).
 *
 * <p>[D-1 이행] 관리 화면 {@code /admin/system/logs/privacy} 는 이미 존재했고
 * {@code systemLogAdminService.getPrivacyLogs()} 를 호출하고 있었으나 대응 엔드포인트가 없었다.
 * <b>볼 수 없는 증적은 증적이 아니다</b>.
 *
 * <p><b>⚠ 인가를 다른 로그보다 좁혔다 — 목록은 {@code PRIVACY_READ}, 내보내기는
 * {@code PRIVACY_EXPORT} 권한이 필요하고(기본 그룹 {@code ROLE_ADMIN}), 시스템 운영 그룹
 * {@code ROLE_SYSTEM} 은 강제 제외한다(operation binding 의 {@code excludedGroups}).</b>
 * 웹·시스템·로그인 로그의 조회 권한은 {@code ROLE_SYSTEM} 에도 기본 배정되지만 여기는 제외한다.
 * 이 로그의 내용 자체가 개인정보이기 때문이다 — {@code inqInfo}(조회 대상 정보) ·
 * {@code dmndUserId}(조회자) · {@code dmndUserIpAddr}(조회자 IP)가 모두 식별 가능한 값이라,
 * "개인정보 접근 기록을 누가 볼 수 있는가" 가 그 자체로 개인정보 이슈다.
 * (2026-08-05 사용자 결정: "개인정보 로그는 관리자 권한만 볼 수 있게".)
 *
 * <p><b>제외는 그룹 합집합으로 풀리지 않는다.</b> {@code ROLE_SYSTEM} 구성원이 다른 그룹에서
 * {@code PRIVACY_READ} 를 받아도 {@code PermissionPolicy#allows} 가 권한 판정보다 먼저 거부한다.
 * 판정 원본은 {@code config/governance/authorization-policies.json} 의 operation binding 이며,
 * HTTP 계층({@code OperationAuthorizationManager})과 메서드 계층
 * ({@code @PreAuthorize("@permissionPolicy.allowed(...)")})이 같은 binding 을 이중 집행한다.
 * 제외 목록이 바뀌면 {@code SecurityAuthAnnotationLinterTest} 가 "개인정보 SYSTEM 배제 drift" 로 막는다.
 *
 * <p>[2026-08-27 정정 이력] 역할 계층({@code ROLE_SYSTEM > ROLE_ADMIN})을 메서드 인가에 주입하던
 * 시절에는 {@code hasRole('ADMIN')} 이 SYSTEM 보유자도 통과시켜 위 결정이 집행되지 않았다.
 * ADR-0016 이후 역할 계층은 없고, 제외는 위 {@code excludedGroups} 가 집행한다.
 *
 * <p><b>조회만 노출한다.</b> 적재는 개인정보 접근 지점이, 삭제는 보존기간 정책
 * ({@code LogRetentionScheduler})이 담당한다. 증적을 열람자가 수정·삭제할 수 있으면 증적이 아니다.
 */
@Slf4j
@Tag(name = "PrivacyLog", description = "개인정보 조회 로그 열람 API (Admin 전용)")
@RestController("systemPrivacyLogApiController")
@RequestMapping("/api/v1/admin/system/logs/privacy")
@RequiredArgsConstructor
public class PrivacyLogApiController {

    private final PrivacyLogManageService privacyLogManageService;

    @Operation(summary = "개인정보 조회 로그 목록",
            description = "조회 대상 정보 부분일치 검색과 페이징을 지원한다. "
                    + "개인정보 로그 조회 권한(PRIVACY_READ)이 필요하며 시스템 운영 그룹(ROLE_SYSTEM)은 제외된다.")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.log.PrivacyLogApiController#getPrivacyLogList')")
    public ResponseEntity<ApiResponse<PageResponse<PrivacyLogDto>>> getPrivacyLogList(
            @Valid @ModelAttribute BaseSearchDto searchDto) {
        Page<PrivacyLogDto> page = privacyLogManageService.selectPrivacyLogList(searchDto);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    /**
     * 개인정보 조회 로그 전체 결과 xlsx export.
     *
     * <p>[검색 조건 동일 바인딩] 목록 API 와 같은 {@link BaseSearchDto} 를 같은 서비스 메서드에 그대로
     * 전달하므로 화면에서 보던 필터(검색어·기간)와 정확히 같은 모집단이 내려간다. 페이지 파라미터만
     * 전체 결과로 덮어써 페이지와 무관하게 조건 일치 전량을 내보낸다.
     *
     * <p>[상한 판정] 이 서비스는 {@code Page} 를 돌려주므로 1건만 조회해 총 건수를 먼저 읽고,
     * 상한을 넘지 않을 때만 전량을 다시 조회한다 — 상한 초과 요청이 힙에 전량을 올리지 않게 한다.
     *
     * <p>[인가 — H3] 목록 API 와 같은 축이다 — 권한은 {@code PRIVACY_EXPORT}(목록은 {@code PRIVACY_READ})이고
     * 둘 다 {@code ROLE_SYSTEM} 을 강제 제외한다({@code excludedGroups}). 반출은 조건 일치 <b>전량</b>을
     * 파일로 내보내므로 목록보다 넓게 열려서는 안 된다. HTTP·메서드 계층이 같은 binding 을 이중 집행한다.
     *
     * <p>[헌법 제6조 3항] binary/stream 예외의 세 조건(attachment · 명시 produces · 허용 census)을 따른다.
     */
    @Operation(summary = "개인정보 조회 로그 전체 결과 xlsx export",
            description = "검색 조건(검색어·기간)은 목록 API 와 동일하게 바인딩하되 페이지 파라미터는 무시하고 "
                    + "조건 일치 전체 결과를 xlsx 로 스트리밍한다. 행 수가 상한을 초과하면 400 을 반환한다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "xlsx 바이너리 스트림",
            content = @Content(mediaType = XlsxExport.XLSX_MEDIA_TYPE,
                    schema = @Schema(type = "string", format = "binary")))
    @nuri.foundation.core.annotation.PrivacyAccess("운영 로그 내보내기(사용자 식별자·접속 정보)")
    @GetMapping(value = "/export.xlsx", produces = XlsxExport.XLSX_MEDIA_TYPE)
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.log.PrivacyLogApiController#exportPrivacyLogs')")
    public ResponseEntity<StreamingResponseBody> exportPrivacyLogs(
            @Valid @ModelAttribute BaseSearchDto searchDto) {

        searchDto.setPageIndex(1);
        searchDto.setPageUnit(1);
        int totalCount = (int) privacyLogManageService.selectPrivacyLogList(searchDto).getTotalElements();
        XlsxExport.assertWithinCap(totalCount);

        searchDto.setPageUnit(Math.max(totalCount, 1));
        List<PrivacyLogDto> rows = privacyLogManageService.selectPrivacyLogList(searchDto).getContent();

        return XlsxExport.attachment("privacy-logs.xlsx", "privacy-logs",
                new String[]{"개인정보 로그 일련번호", "요청 ID", "조회일시", "서비스명", "조회정보", "요청자 ID", "요청 IP"},
                rows,
                (row, dto) -> {
                    row.createCell(0).setCellValue(XlsxExport.nullSafe(dto.prvcLogSn()));
                    row.createCell(1).setCellValue(XlsxExport.nullSafe(dto.dmndId()));
                    row.createCell(2).setCellValue(dto.inqDt() != null ? dto.inqDt().toString() : "");
                    row.createCell(3).setCellValue(XlsxExport.nullSafe(dto.srvcNm()));
                    row.createCell(4).setCellValue(XlsxExport.nullSafe(dto.inqInfo()));
                    row.createCell(5).setCellValue(XlsxExport.nullSafe(dto.dmndUserId()));
                    row.createCell(6).setCellValue(XlsxExport.nullSafe(dto.dmndUserIpAddr()));
                });
    }
}
