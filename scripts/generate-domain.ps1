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
$baseDir = "business-app/src/main/java/nuri/business"
$domainDir = "$baseDir/domain/$domainLower"
$serviceDir = "$baseDir/service/$domainLower"
$repoDir = "$baseDir/repository/$domainLower"

# 디렉터리 보장
New-Item -ItemType Directory -Force -Path $domainDir | Out-Null
New-Item -ItemType Directory -Force -Path $serviceDir | Out-Null
New-Item -ItemType Directory -Force -Path $repoDir | Out-Null

# Helper function to write BOM-free UTF-8 file
function Write-Utf8File($filePath, $content) {
    [System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))
}

# 1. Dto 생성
$dtoContent = @"
package nuri.business.service.$domainLower;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ${domainCap}Dto {
    private Long id;
    private $FieldType $FieldName;
}
"@
Write-Utf8File "$serviceDir/${domainCap}Dto.java" $dtoContent

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
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class $domainCap extends BaseEntity {
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

    public void update($FieldType $FieldName) {
        this.$FieldName = $FieldName;
    }
}
"@
Write-Utf8File "$domainDir/${domainCap}.java" $entityContent

# 4. Repository 생성
$repoContent = @"
package nuri.business.repository.$domainLower;

import nuri.business.domain.$domainLower.$domainCap;
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
import nuri.business.repository.$domainLower.${domainCap}Repository;
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

    public Page<${domainCap}Dto> getList(Pageable pageable) {
        return repository.findAll(pageable).map(this::toDto);
    }

    public ${domainCap}Dto get(Long id) {
        return repository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
    }

    @Transactional
    public Long create(${domainCap}Dto dto) {
        $domainCap entity = $domainCap.builder()
                .$FieldName(dto.get$fieldCap())
                .build();
        return repository.save(entity).getId();
    }

    @Transactional
    public void update(Long id, ${domainCap}Dto dto) {
        $domainCap entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        entity.update(dto.get$fieldCap());
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        }
        repository.deleteById(id);
    }

    private ${domainCap}Dto toDto($domainCap entity) {
        return ${domainCap}Dto.builder()
                .id(entity.getId())
                .$FieldName(entity.get$fieldCap())
                .build();
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
#    또한 생성 즉시 린터를 통과하도록 **인가 애노테이션을 기본 부착**한다(fail-closed).
#    권한을 넓히는 것은 개발자의 명시적 결정이어야 하며, 그 반대(기본 공개 → 나중에 조이기)는
#    조이는 시점이 오지 않는다.
$apiDir = "api-server/src/main/java/nuri/api/controller/business/$domainLower"
New-Item -ItemType Directory -Force -Path $apiDir | Out-Null

$controllerContent = @"
package nuri.api.controller.business.$domainLower;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.business.service.$domainLower.${domainCap}Dto;
import nuri.business.service.$domainLower.${domainCap}Service;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.security.annotation.AdminOrSystem;
import nuri.foundation.security.annotation.Authenticated;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * $domainCap API (스캐폴드 생성 초안).
 *
 * <p><b>인가</b>: 읽기는 {@code @Authenticated}, 쓰기는 {@code @AdminOrSystem} 을 기본으로 붙였다.
 * 도메인 성격에 맞게 <b>좁히거나 넓히되, 지우지는 말 것</b> — 애노테이션이 없으면
 * SecurityAuthAnnotationLinterTest 가 위반으로 잡는다. 소유권 기반(본인 데이터만) 도메인이면
 * 컨트롤러 인증 경계는 유지하고 서비스 레이어에 소유권 가드와 음성 테스트를 함께 둔다.
 */
@Tag(name = "$domainCap", description = "$domainCap API")
@RestController
@RequestMapping("/api/v1/$domainLower")
@RequiredArgsConstructor
public class ${domainCap}ApiController {

    private final ${domainCap}Service service;

    @Operation(summary = "$domainCap 목록 조회")
    @Authenticated
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<${domainCap}Dto>>> getList(
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {
        Pageable pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<${domainCap}Dto> page = service.getList(pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }

    @Operation(summary = "$domainCap 상세 조회")
    @Authenticated
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<${domainCap}Dto>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(service.get(id)));
    }

    @Operation(summary = "$domainCap 등록")
    @AdminOrSystem
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> create(@Valid @RequestBody ${domainCap}Dto dto) {
        return ResponseEntity.ok(ApiResponse.success(service.create(dto)));
    }

    @Operation(summary = "$domainCap 수정")
    @AdminOrSystem
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> update(@PathVariable Long id, @Valid @RequestBody ${domainCap}Dto dto) {
        service.update(id, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "$domainCap 삭제")
    @AdminOrSystem
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
$ddl = @"
-- 검토 후 api-server/src/main/resources/db/migration/V<다음번호>__create_tb_$domainLower.sql 로 배치할 것.
-- ⚠ 컬럼명은 meta_standard_words / meta_standard_terms 조회로 표준 용어를 확인한 뒤 확정하십시오
--    (DB 표준화 헌법 제2조 — 지레짐작 금지). 아래는 초안입니다.
--    조회: node .agent/scripts/db-bridge.js "SELECT * FROM meta_standard_words WHERE ..."

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

Write-Host ""
Write-Host "--- Flyway 마이그레이션 초안 (파일로 생성하지 않았습니다) ---" -ForegroundColor Yellow
Write-Host $ddl
Write-Host "-------------------------------------------------------------" -ForegroundColor Yellow

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Domain scaffolding generation completed successfully." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "생성 위치:" -ForegroundColor Cyan
Write-Host "  · 엔티티/서비스/리포지토리 → business-app/src/main/java/nuri/business/..." -ForegroundColor Gray
Write-Host "  · 컨트롤러               → api-server/src/main/java/nuri/api/controller/business/$domainLower" -ForegroundColor Gray
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  1. 위 DDL 의 컬럼명을 표준 용어로 확정한 뒤 마이그레이션 파일로 배치" -ForegroundColor Gray
Write-Host "  2. ./gradlew compileJava compileTestJava 로 컴파일 확인" -ForegroundColor Gray
Write-Host "  3. 인가 애노테이션은 이미 붙어 있습니다 — 읽기 @Authenticated / 쓰기 @AdminOrSystem." -ForegroundColor Gray
Write-Host "     도메인에 맞게 조정하되 **지우지 마십시오**. 컨트롤러가 nuri.api.controller 하위라" -ForegroundColor Gray
Write-Host "     SecurityAuthAnnotationLinterTest 의 오딧 대상이며, 애노테이션이 없으면 게이트가 red 입니다." -ForegroundColor Gray
Write-Host "  4. 본인 데이터만 다루는 도메인이면 컨트롤러 인증 경계를 유지한 채 서비스에" -ForegroundColor Gray
Write-Host "     소유권 가드와 타 사용자 접근 거부 테스트를 함께 추가하십시오." -ForegroundColor Gray
