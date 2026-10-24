# generate-domain.ps1
# Usage: ./generate-domain.ps1 -DomainName <domain_name> -FieldName <field_name> [-FieldType <field_type>]
# Example: ./generate-domain.ps1 -DomainName "dummyproduct" -FieldName "title"

param (
    [Parameter(Mandatory=$true)]
    [string]$DomainName,
    
    [Parameter(Mandatory=$true)]
    [string]$FieldName,
    
    [string]$FieldType = "String"
)

# 첫 글자 대문자화 (파워쉘 로케일 무관하게 문자 처리)
$domainCap = $DomainName.Substring(0,1).ToUpper() + $DomainName.Substring(1)
$fieldCap = $FieldName.Substring(0,1).ToUpper() + $FieldName.Substring(1)
$domainLower = $DomainName.ToLower()
# [G-1 버그수정] here-string 안에서 `${FieldName.ToLower()}` 는 확장되지 않는다 —
#   `${...}` 는 변수명만 받으므로 메서드 호출이 들어가면 빈 문자열이 된다.
#   그래서 엔티티 컬럼명이 "<domain>_" 로 잘려 나왔다(필드명 누락). 미리 계산해 단순 변수로 넘긴다.
$fieldLower = $FieldName.ToLower()
$columnName = "${domainLower}_${fieldLower}"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Generating Domain: $domainCap in business-app" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 대상 경로 정의
#   ⚠ 컨트롤러만 api-server 모듈에 생성한다(아래 6번 참조) — 도메인/서비스/리포지토리는 business-app.
#     아키텍처 흐름(api-server Controller → business-* Service)과 인가 린터의 스캔 범위가 모두
#     그 배치를 전제한다.
#   [2026-10-24 DEC-OPS-382] 기능 소유 판정(project-composer-catalog.mjs appSourceDomain)은 business-app 의
#     domain/<d>·service/<d> 만 기능 디렉터리로 본다. 종전 repository/<d> 는 '소유 미상 소스'였다. 저장소 관례대로
#     리포지토리는 엔티티와 같은 domain/<d>, DTO 는 service/<d>/dto 에 둔다.
$baseDir = "business-app/src/main/java/nuri/business"
$domainDir = "$baseDir/domain/$domainLower"
$serviceDir = "$baseDir/service/$domainLower"
$dtoDir = "$serviceDir/dto"
$repoDir = $domainDir

# 디렉터리 보장
New-Item -ItemType Directory -Force -Path $domainDir | Out-Null
New-Item -ItemType Directory -Force -Path $serviceDir | Out-Null
New-Item -ItemType Directory -Force -Path $dtoDir | Out-Null

# 문자열 필드는 엔티티 컬럼 길이(100)와 같은 상한을 요청 DTO 에 둔다(입력 계약 거울).
$sizeAnnotation = if ($FieldType -eq 'String') { '@Size(max = 100) ' } else { '' }
$sizeImport = if ($FieldType -eq 'String') { "import jakarta.validation.constraints.Size;`n" } else { '' }

# Helper function to write BOM-free UTF-8 file
function Write-Utf8File($filePath, $content) {
    [System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))
}

# 1. Dto 생성 — 요청과 응답을 나눈다(한 파일의 중첩 record, 쓰는 파일 수 계약은 그대로다).
#    요청에는 식별자를 두지 않는다 — 대상은 경로가 정한다. 문자열 상한은 엔티티 컬럼과 같다.
$dtoContent = @"
package nuri.business.service.$domainLower.dto;

${sizeImport}
/** $domainCap 요청·응답 (스캐폴드 생성 초안). 새 쓰기 DTO 는 저장 경로를 확인한 뒤 입력 계약 원장에 등재한다. */
public final class ${domainCap}Dto {

    private ${domainCap}Dto() {
    }

    /** 등록·수정 요청. */
    // OpenAPI 는 중첩 타입을 단순 이름으로 싣는다 — 도메인마다 고유한 이름이어야 스키마가 서로 덮어쓰지 않는다.
    public record ${domainCap}Request(${sizeAnnotation}$FieldType $FieldName) {
    }

    /** 조회 응답. */
    public record ${domainCap}Response(Long id, $FieldType $FieldName) {
    }
}
"@
Write-Utf8File "$dtoDir/${domainCap}Dto.java" $dtoContent

# 2. SearchDto — **생성하지 않는다** (2026-08-03)
#    종전에는 `searchKeyword` 필드 하나짜리 <Domain>SearchDto 를 찍었는데, 그것을 쓰던 유일한 소비처가
#    BaseCrudService/BaseCrudController 의 제네릭 인자였다. 그 상속을 걷어낸 지금은 **참조 0건**이 된다.
#    참조 0건 산출물은 용량이 아니라 '살아 있는 훅으로 오인된다'는 점이 문제다(12축 감사 클러스터 D).
#    검색 조건이 필요하면 저장소 관례인 nuri.business.domain.common.BaseSearchDto 를 @ModelAttribute 로
#    받는다(FaqApiController 참조) — 도메인마다 같은 필드를 새로 정의하지 않는다.

# 3. Entity 생성
$entityContent = @"
package nuri.business.domain.$domainLower;

import jakarta.persistence.*;
import lombok.*;
import nuri.foundation.domain.common.BaseEntity;

@Entity
@Table(name = "tb_$domainLower")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class $domainCap extends BaseEntity {
    // [2026-10-24] 클래스 레벨 @Builder·@AllArgsConstructor 를 걷었다 — 백엔드 헌법 제5조 3항 (a)와
    //   GH-ENTITY-LOMBOK-SOURCE 가 금지한다. 빌더는 아래 정적 팩토리 create(...) 에 둔다.
    // [2026-08-04] 상위 클래스를 BaseTimeEntity -> BaseEntity 로 바꿨다.
    //   BaseEntity 는 frstRgtrId/lastMdfrId(각 length 20)를 @CreatedBy/@LastModifiedBy 로 채운다.
    //   아래 DDL 초안이 frst_rgtr_id/last_mdfr_id 를 만들고 있었는데 엔티티에는 그 매핑이 없어
    //   **생성 즉시 스키마와 엔티티가 어긋난 상태**였다(실 PG + ddl-auto:validate 에서 드러난다).
    //   더 중요한 건 소유권이다 — 이 저장소의 IDOR 가드는 frstRgtrId 를 전제로 판정하므로,
    //   그 컬럼이 없는 엔티티는 소유권 기반 인가를 **원리적으로 걸 수 없다**.
    // [G-1] 신규 엔티티는 JPA 관리 생성(@GeneratedValue)을 쓴다.
    //   PkGenerationStandardLinterTest 가 이를 강제한다 — 기존 69종만 동결(GRANDFATHERED)돼 있고
    //   신규 수동 PK 는 위반이다. 종전 스캐폴드는 @GeneratedValue 없는 String id 를 찍어내
    //   생성 즉시 저장소 자신의 게이트를 위반하는 코드를 만들었다.
    //   수동 할당 PK 는 save() 가 merge 로 흘러 낙관적 락 충돌을 내는 함정도 있다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "${domainLower}_id")
    private Long id;

    @Column(name = "$columnName", length = 100)
    private $FieldType $FieldName;

    private $domainCap($FieldType $FieldName) {
        this.$FieldName = $FieldName;
    }

    @Builder
    public static $domainCap create($FieldType $FieldName) {
        return new $domainCap($FieldName);
    }

    public void update($FieldType $FieldName) {
        this.$FieldName = $FieldName;
    }
}
"@
Write-Utf8File "$domainDir/${domainCap}.java" $entityContent

# 4. Repository 생성
$repoContent = @"
package nuri.business.domain.$domainLower;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${domainCap}Repository extends JpaRepository<$domainCap, Long> {
}
"@
Write-Utf8File "$repoDir/${domainCap}Repository.java" $repoContent

# 5. Service 생성
#    [G-1 수정 2026-08-03] 종전 템플릿은 `extends BaseCrudService` 였는데 그 클래스는 **저장소에
#    존재하지 않는다**(nuri.business.core.crud 패키지 자체가 없다). 즉 스캐폴드 산출물이 컴파일되지
#    않았다. 제네릭 CRUD 베이스를 새로 만드는 선택지는 채택하지 않는다 — 이 팀은 2026-07 에
#    단일-impl 인터페이스 39개와 EgovIdGnrService 를 걷어내며 two-paradigm 부채를 청산했고,
#    66개 컨트롤러의 명시(explicit) 관례 옆에 두 번째 작성 방식을 다시 들이는 것이 그 청산을 되돌린다.
#    그래서 저장소의 실제 관례대로 **명시 CRUD** 를 찍는다.
$serviceContent = @"
package nuri.business.service.$domainLower;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.$domainLower.$domainCap;
import nuri.business.domain.$domainLower.${domainCap}Repository;
import nuri.business.service.$domainLower.dto.${domainCap}Dto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * $domainCap 도메인 서비스 (스캐폴드 생성 초안).
 *
 * <p>클래스레벨 {@code @Transactional(readOnly = true)} 는 ServiceReadOnlyTransactionalLinterTest
 * 가 신규 @Service 에 강제하는 규칙이다 — 쓰기 메서드에만 메서드레벨 {@code @Transactional} 을 얹는다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ${domainCap}Service {

    private final ${domainCap}Repository repository;

    public Page<${domainCap}Dto.${domainCap}Response> getList(Pageable pageable) {
        return repository.findAll(pageable).map(this::toDto);
    }

    public ${domainCap}Dto.${domainCap}Response get(Long id) {
        return repository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
    }

    @Transactional
    public Long create(${domainCap}Dto.${domainCap}Request request) {
        $domainCap entity = $domainCap.builder()
                .$FieldName(request.$FieldName())
                .build();
        return repository.save(entity).getId();
    }

    @Transactional
    public void update(Long id, ${domainCap}Dto.${domainCap}Request request) {
        $domainCap entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        entity.update(request.$FieldName());
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        }
        repository.deleteById(id);
    }

    private ${domainCap}Dto.${domainCap}Response toDto($domainCap entity) {
        return new ${domainCap}Dto.${domainCap}Response(entity.getId(), entity.get$fieldCap());
    }
}
"@
Write-Utf8File "$serviceDir/${domainCap}Service.java" $serviceContent

# 6. Controller 생성
#    [G-1 수정 2026-08-03] 생성 위치를 business-app 의 `nuri.business.api.*` 에서
#    api-server 의 `nuri.api.controller.business.*` 로 옮긴다.
#
#    이유: SecurityAuthAnnotationLinterTest 는 두 테스트 모두 `nuri.api.controller` 접두로
#    오딧 대상을 고른다(현행 소스 실측). `nuri.business.api.*` 는 컴포넌트 스캔 대상이라
#    **요청은 정상적으로 받으면서** 인가 린터의 판정 범위 밖이었다 — 저장소의 공식 도구가
#    신규 개발자를 게이트 사각지대로 안내하는 형태였다.
#
#    정확한 handler 가드를 생성한다. 기능 코드와 operation binding은 검토자가 등록해야 한다.
#    미등록 상태에서는 HTTP/메서드 모두 거부하고 린터도 red이며, 기본 그룹에 권한을 자동 부여하지 않는다.
$apiDir = "api-server/src/main/java/nuri/api/controller/business/$domainLower"
New-Item -ItemType Directory -Force -Path $apiDir | Out-Null

$controllerContent = @"
package nuri.api.controller.business.$domainLower;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.business.service.$domainLower.${domainCap}Service;
import nuri.business.service.$domainLower.dto.${domainCap}Dto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * $domainCap API (스캐폴드 생성 초안).
 *
 * <p><b>인가</b>: 정확한 handler 가드만 생성하며 기능 코드나 그룹 권한을 자동 부여하지 않는다.
 * permission-catalog.json과 authorization-policies.json의 operationBindings를 검토 등록하고
 * node scripts/generate-permissions.mjs를 실행해야 한다. 미등록 경로는 거부되며 린터도 red다.
 * 본인 데이터는 서비스 소유권/참여자 가드와 타 사용자 접근 거부 테스트를 별도로 추가한다.
 */
@Tag(name = "$domainCap", description = "$domainCap API")
@RestController
@RequestMapping("/api/v1/$domainLower")
@RequiredArgsConstructor
public class ${domainCap}ApiController {

    private final ${domainCap}Service service;

    @Operation(summary = "$domainCap 목록 조회")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.$domainLower.${domainCap}ApiController#getList')")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<${domainCap}Dto.${domainCap}Response>>> getList(
            @PageableDefault(size = 10) Pageable pageable) {
        // ADR-0036: page 는 1 기반이고 리졸버가 0 기반 Pageable 로 바꾼다. 범위 검증은 PaginationRequestFilter 몫이다.
        Page<${domainCap}Dto.${domainCap}Response> page = service.getList(pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "$domainCap 상세 조회")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.$domainLower.${domainCap}ApiController#get')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<${domainCap}Dto.${domainCap}Response>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(service.get(id)));
    }

    @Operation(summary = "$domainCap 등록")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.$domainLower.${domainCap}ApiController#create')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ApiResponse<Long>> create(@Valid @RequestBody ${domainCap}Dto.${domainCap}Request request) {
        // ADR-0036: 자원을 만드는 POST 는 201 과 새 식별자다. ResponseContractLinterTest 의 생성 census 에 등재해야 green 이다.
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.create(request)));
    }

    @Operation(summary = "$domainCap 수정")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.$domainLower.${domainCap}ApiController#update')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> update(@PathVariable Long id, @Valid @RequestBody ${domainCap}Dto.${domainCap}Request request) {
        service.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "$domainCap 삭제")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.$domainLower.${domainCap}ApiController#delete')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
"@
Write-Utf8File "$apiDir/${domainCap}ApiController.java" $controllerContent

# 7. Flyway 마이그레이션 DDL — **파일로 쓰지 않고 콘솔에만 출력한다**
#
#    파일로 자동 생성하지 않는 이유:
#      (a) 버전 번호를 스크립트가 정하면 다른 작업자의 마이그레이션과 충돌한다.
#          이 저장소는 이미 Flyway checksum 드리프트로 부팅이 막힌 전력이 있다.
#      (b) 검토 없이 커밋된 DDL 이 공유 DB 에 적용되면 되돌리기 어렵다.
#      (c) 컬럼 명명은 DB 표준화 헌법 제2조상 meta_standard_words 조회가 선행돼야 하는데,
#          스크립트는 그것을 하지 않는다. 아래 DDL 은 **초안**이지 표준 준수 증명이 아니다.
#
#    개발자가 확인 후 db/migration/V<다음번호>__create_tb_<domain>.sql 로 직접 배치한다.
$colName = $columnName
# 다음 Flyway 번호는 안내만 한다(파일을 쓰지 않는다). 통합 전에 npm run verify:integrate 가 버전 중복·순서를 다시 본다.
$migrationDir = "api-server/src/main/resources/db/migration"
$latestMigration = (Get-ChildItem $migrationDir -Filter "V2_*__*.sql" | ForEach-Object { if ($_.Name -match '^V2_(\d+)__') { [int]$Matches[1] } } | Measure-Object -Maximum).Maximum
$nextMigration = "V2_$($latestMigration + 1)"
$ddl = @"
-- 검토 후 $migrationDir/${nextMigration}__create_tb_$domainLower.sql 로 배치할 것(번호는 지금 main 기준 안내다).
-- ⚠ 컬럼명은 meta_standard_words / meta_standard_terms 조회로 표준 용어를 확인한 뒤 확정하십시오
--    (DB 표준화 헌법 제2조 — 지레짐작 금지). 아래는 초안입니다. 표준 용어가 없으면 설계를 멈추고 등록을 요청합니다(제9조).

CREATE TABLE IF NOT EXISTS tb_$domainLower (
    ${domainLower}_id   BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    $colName            VARCHAR(100),
    crt_dt              TIMESTAMP NOT NULL DEFAULT NOW(),
    mdfcn_dt            TIMESTAMP,
    frst_rgtr_id        VARCHAR(20),
    last_mdfr_id        VARCHAR(20)
);

COMMENT ON TABLE  tb_$domainLower IS '$domainCap';
COMMENT ON COLUMN tb_$domainLower.${domainLower}_id IS '$domainCap ID';
COMMENT ON COLUMN tb_$domainLower.$colName IS '$FieldName';
"@

# 8. 표준 용어 확인 SQL — 읽기 전용 조회만 안내한다. 결과는 후보이며 확정은 사람이 한다.
$termQuery = "SELECT eng_abbr, term_name, domain_name, deprecated_yn FROM meta_standard_terms WHERE upper(eng_abbr) = upper('$colName')"

# 9. 기능 선언 초안 — 파일로 쓰지 않는다. 형식의 정본은 config/modules/_schema.json, 예시는 config/modules/scrap.json 이다.
#    권한 도메인·화면·의존은 검토자가 정한다(자동으로 채우면 검토 지점이 사라진다).
$featureDraft = @"
{
  "schemaVersion": 2,
  "id": "$domainLower",
  "label": "$domainCap",
  "presentation": { "area": "<업무 영역>", "order": 99, "summary": "<한 줄 설명>" },
  "backend": { "frontendOnly": false, "supportFiles": [] },
  "owns": {
    "tables": ["tb_$domainLower"], "sequences": [], "sharedTables": [], "frontend": [], "frontendAny": [],
    "routes": [], "exactRoutes": [], "menuTabs": [], "permissionDomains": [], "gates": [],
    "rbacMatrix": null, "markerBlocks": [], "commonCodeGroups": []
  },
  "dependsOn": [], "foreignKeys": [], "requires": [], "integrates": [],
  "registrationOnly": { "events": [], "contributions": [], "ports": [] },
  "requirements": [], "unassignedPermissions": []
}
"@

Write-Host ""
Write-Host "--- Flyway 마이그레이션 초안 (파일로 생성하지 않았습니다) ---" -ForegroundColor Yellow
Write-Host $ddl
Write-Host "--- 표준 용어 확인(읽기 전용, db-bridge) ---" -ForegroundColor Yellow
Write-Host "  node .agent/scripts/db-bridge.js `"$termQuery`""
Write-Host "--- config/modules/$domainLower.json 초안 (파일로 생성하지 않았습니다) ---" -ForegroundColor Yellow
Write-Host $featureDraft
Write-Host "-------------------------------------------------------------" -ForegroundColor Yellow

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Domain scaffolding generation completed successfully." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "생성 위치:" -ForegroundColor Cyan
Write-Host "  · 엔티티/리포지토리 → business-app/src/main/java/nuri/business/domain/$domainLower" -ForegroundColor Gray
Write-Host "  · 서비스/DTO        → business-app/src/main/java/nuri/business/service/$domainLower(/dto)" -ForegroundColor Gray
Write-Host "  · 컨트롤러          → api-server/src/main/java/nuri/api/controller/business/$domainLower" -ForegroundColor Gray
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  1. 위 DDL 의 컬럼명을 표준 용어로 확정한 뒤 마이그레이션 파일로 배치" -ForegroundColor Gray
Write-Host "  2. 기능 선언 초안을 검토해 config/modules/$domainLower.json 으로 두고 presets.json 의 해당 시작 구성에 넣기" -ForegroundColor Gray
Write-Host "  3. ./gradlew compileJava compileTestJava 로 컴파일 확인" -ForegroundColor Gray
Write-Host "  4. permission-catalog.json과 authorization-policies.json의 operationBindings에" -ForegroundColor Gray
Write-Host "     실제 기능 코드 및 HTTP method/path/handler를 검토 등록하십시오. 기본 그룹 부여는 자동화하지 않습니다." -ForegroundColor Gray
Write-Host "     node scripts/generate-permissions.mjs 실행 후 SecurityAuthAnnotationLinterTest로 검증하십시오." -ForegroundColor Gray
Write-Host "     미등록 상태는 HTTP/메서드 거부 및 린터 red입니다. 생성 완료가 인가 검증 성공은 아닙니다." -ForegroundColor Gray
Write-Host "  5. 본인 데이터만 다루는 도메인이면 컨트롤러 인증 경계를 유지한 채 서비스에" -ForegroundColor Gray
Write-Host "     소유권 가드와 타 사용자 접근 거부 테스트를 함께 추가하십시오." -ForegroundColor Gray
Write-Host "  6. 빠진 등록 지점은 node scripts/domain-registration-doctor.mjs $domainLower 로 확인하십시오." -ForegroundColor Gray
