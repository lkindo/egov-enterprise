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
$baseDir = "business-app/src/main/java/nuri/business"
$domainDir = "$baseDir/domain/$domainLower"
$serviceDir = "$baseDir/service/$domainLower"
$repoDir = "$baseDir/repository/$domainLower"
$apiDir = "$baseDir/api/$domainLower"

# 디렉터리 보장
New-Item -ItemType Directory -Force -Path $domainDir | Out-Null
New-Item -ItemType Directory -Force -Path $serviceDir | Out-Null
New-Item -ItemType Directory -Force -Path $repoDir | Out-Null
New-Item -ItemType Directory -Force -Path $apiDir | Out-Null

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

# 2. SearchDto 생성
$searchDtoContent = @"
package nuri.business.service.$domainLower;

import lombok.Data;

@Data
public class ${domainCap}SearchDto {
    private String searchKeyword;
}
"@
Write-Utf8File "$serviceDir/${domainCap}SearchDto.java" $searchDtoContent

# 3. Entity 생성
$entityContent = @"
package nuri.business.domain.$domainLower;

import jakarta.persistence.*;
import lombok.*;
import nuri.foundation.domain.common.BaseTimeEntity;

@Entity
@Table(name = "tb_$domainLower")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class $domainCap extends BaseTimeEntity {
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
$serviceContent = @"
package nuri.business.service.$domainLower;

import lombok.RequiredArgsConstructor;
import nuri.business.core.crud.BaseCrudService;
import nuri.business.domain.$domainLower.$domainCap;
import nuri.business.repository.$domainLower.${domainCap}Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ${domainCap}Service extends BaseCrudService<$domainCap, Long, ${domainCap}Dto, ${domainCap}SearchDto> {

    private final ${domainCap}Repository repository;

    @Override
    protected JpaRepository<$domainCap, Long> getRepository() {
        return repository;
    }

    @Override
    protected ${domainCap}Dto toDto($domainCap entity) {
        return ${domainCap}Dto.builder()
                .id(entity.getId())
                .$FieldName(entity.get$fieldCap())
                .build();
    }

    @Override
    protected $domainCap toEntity(${domainCap}Dto dto) {
        return $domainCap.builder()
                .id(dto.getId())
                .$FieldName(dto.get$fieldCap())
                .build();
    }

    @Override
    protected void updateEntity($domainCap entity, ${domainCap}Dto dto) {
        entity.update(dto.get$fieldCap());
    }
}
"@
Write-Utf8File "$serviceDir/${domainCap}Service.java" $serviceContent

# 6. Controller 생성
$controllerContent = @"
package nuri.business.api.$domainLower;

import lombok.RequiredArgsConstructor;
import nuri.business.core.crud.BaseCrudController;
import nuri.business.core.crud.BaseCrudService;
import nuri.business.domain.$domainLower.$domainCap;
import nuri.business.service.$domainLower.${domainCap}Dto;
import nuri.business.service.$domainLower.${domainCap}SearchDto;
import nuri.business.service.$domainLower.${domainCap}Service;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/$domainLower")
@RequiredArgsConstructor
public class ${domainCap}Controller extends BaseCrudController<$domainCap, Long, ${domainCap}Dto, ${domainCap}SearchDto> {

    private final ${domainCap}Service service;

    @Override
    protected BaseCrudService<$domainCap, Long, ${domainCap}Dto, ${domainCap}SearchDto> getService() {
        return service;
    }
}
"@
Write-Utf8File "$apiDir/${domainCap}Controller.java" $controllerContent

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
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  1. 위 DDL 의 컬럼명을 표준 용어로 확정한 뒤 마이그레이션 파일로 배치" -ForegroundColor Gray
Write-Host "  2. ./gradlew compileJava compileTestJava 로 컴파일 확인" -ForegroundColor Gray
Write-Host "  3. 인가가 필요한 엔드포인트면 @PreAuthorize 부착" -ForegroundColor Gray
Write-Host "     (SecurityAuthAnnotationLinterTest 는 .business/.foundation 패키지를 감사하지 않으므로" -ForegroundColor Gray
Write-Host "      이 스캐폴드가 만든 컨트롤러의 인가 누락은 게이트가 잡아주지 않습니다)" -ForegroundColor Gray
