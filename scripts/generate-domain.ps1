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
    private String id;
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
    @Id
    @Column(name = "${domainLower}_id", length = 20)
    private String id;

    @Column(name = "${domainLower}_${FieldName.ToLower()}", length = 100)
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
public interface ${domainCap}Repository extends JpaRepository<$domainCap, String> {
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
public class ${domainCap}Service extends BaseCrudService<$domainCap, String, ${domainCap}Dto, ${domainCap}SearchDto> {

    private final ${domainCap}Repository repository;

    @Override
    protected JpaRepository<$domainCap, String> getRepository() {
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
public class ${domainCap}Controller extends BaseCrudController<$domainCap, String, ${domainCap}Dto, ${domainCap}SearchDto> {

    private final ${domainCap}Service service;

    @Override
    protected BaseCrudService<$domainCap, String, ${domainCap}Dto, ${domainCap}SearchDto> getService() {
        return service;
    }
}
"@
Write-Utf8File "$apiDir/${domainCap}Controller.java" $controllerContent

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Domain scaffolding generation completed successfully." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
