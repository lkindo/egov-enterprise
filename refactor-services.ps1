# Service Refactoring Automation Script
# Foundation + Business Suite 의 모든 서비스를 BaseAbstractService 기반으로 리팩토링

$ErrorActionPreference = "Stop"
$projectRoot = "d:\project\egov-enterprise"

# 리팩토링할 서비스 파일 목록 (UserService 제외 - 이미 완료됨)
$foundationServices = @(
    "foundation\src\main\java\com\company\project\foundation\service\menu\MenuService.java",
    "foundation\src\main\java\com\company\project\foundation\core\storage\FileStorageService.java",
    "foundation\src\main\java\com\company\project\foundation\security\iam\CustomUserDetailsService.java",
    "foundation\src\main\java\com\company\project\foundation\service\auth\AuthorManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\auth\AuthorRoleManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\auth\AuthService.java",
    "foundation\src\main\java\com\company\project\foundation\service\auth\EgovAuthService.java",
    "foundation\src\main\java\com\company\project\foundation\service\auth\RoleManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\auth\UserAuthorityManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\code\AdministCodeService.java",
    "foundation\src\main\java\com\company\project\foundation\service\code\CodeService.java",
    "foundation\src\main\java\com\company\project\foundation\service\code\CommonCodeService.java",
    "foundation\src\main\java\com\company\project\foundation\service\code\EgovCodeService.java",
    "foundation\src\main\java\com\company\project\foundation\service\code\EgovCommonCodeService.java",
    "foundation\src\main\java\com\company\project\foundation\service\code\InstitutionCodeService.java",
    "foundation\src\main\java\com\company\project\foundation\service\group\GroupManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\isg\EgovInternetSvcGuidanceService.java",
    "foundation\src\main\java\com\company\project\foundation\service\isg\InternetSvcGuidanceService.java",
    "foundation\src\main\java\com\company\project\foundation\service\log\EgovLogService.java",
    "foundation\src\main\java\com\company\project\foundation\service\log\LoginLogManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\log\LogManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\log\LogService.java",
    "foundation\src\main\java\com\company\project\foundation\service\login\LoginPolicyManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\mypage\EgovIndividualPageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\mypage\IndividualPageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\operation\EventInfoService.java",
    "foundation\src\main\java\com\company\project\foundation\service\operation\ExternalHrService.java",
    "foundation\src\main\java\com\company\project\foundation\service\operation\RewardManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\program\ProgramService.java",
    "foundation\src\main\java\com\company\project\foundation\service\sec\AuthorManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\stats\EgovStatsService.java",
    "foundation\src\main\java\com\company\project\foundation\service\stats\ReportStatsService.java",
    "foundation\src\main\java\com\company\project\foundation\service\stats\StatsService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\content\banner\BannerService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\content\banner\EgovBannerService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\content\community\CommunityService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\content\popup\PopupService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\policy\PolicyService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\service\consult\CnsltService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\service\consult\EgovCnsltService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\service\qna\EgovQnaService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\service\qna\QnaService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\service\survey\EgovOnlinePollService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\service\survey\EgovSurveyRespondentService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\service\survey\EgovSurveyService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\service\survey\OnlinePollService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\service\survey\SurveyRespondentService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\service\survey\SurveyService.java",
    "foundation\src\main\java\com\company\project\foundation\service\system\user\UserAbsenceService.java",
    "foundation\src\main\java\com\company\project\foundation\service\template\EgovTemplateService.java",
    "foundation\src\main\java\com\company\project\foundation\service\template\TemplateService.java",
    "foundation\src\main\java\com\company\project\foundation\service\template\TmplatInfoService.java",
    "foundation\src\main\java\com\company\project\foundation\service\usermanagement\EgovDeptManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\usermanagement\EgovEntrprsManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\usermanagement\EgovMberManageService.java",
    "foundation\src\main\java\com\company\project\foundation\service\workspace\MyPageService.java"
)

$businessServices = @(
    "business-suite\src\main\java\com\company\project\business\service\notification\NotificationService.java",
    "business-suite\src\main\java\com\company\project\business\service\notification\EgovNotificationService.java",
    "business-suite\src\main\java\com\company\project\business\service\board\BoardService.java",
    "business-suite\src\main\java\com\company\project\business\service\addressbook\AddressBookService.java",
    "business-suite\src\main\java\com\company\project\business\service\board\BoardMasterService.java",
    "business-suite\src\main\java\com\company\project\business\service\board\EgovBoardMasterService.java",
    "business-suite\src\main\java\com\company\project\business\service\board\EgovBoardService.java",
    "business-suite\src\main\java\com\company\project\business\service\board\EgovSatisfactionService.java",
    "business-suite\src\main\java\com\company\project\business\service\board\SatisfactionService.java",
    "business-suite\src\main\java\com\company\project\business\service\comment\CommentService.java",
    "business-suite\src\main\java\com\company\project\business\service\deptjob\DeptJobBoxService.java",
    "business-suite\src\main\java\com\company\project\business\service\deptjob\DeptJobService.java",
    "business-suite\src\main\java\com\company\project\business\service\deptjob\EgovDeptJobBoxService.java",
    "business-suite\src\main\java\com\company\project\business\service\deptjob\EgovDeptJobService.java",
    "business-suite\src\main\java\com\company\project\business\service\faq\EgovFaqService.java",
    "business-suite\src\main\java\com\company\project\business\service\faq\FaqService.java",
    "business-suite\src\main\java\com\company\project\business\service\file\EgovFileService.java",
    "business-suite\src\main\java\com\company\project\business\service\file\FileService.java",
    "business-suite\src\main\java\com\company\project\business\service\file\LocalFileStorageService.java",
    "business-suite\src\main\java\com\company\project\business\service\help\EgovHelpService.java",
    "business-suite\src\main\java\com\company\project\business\service\help\HelpService.java",
    "business-suite\src\main\java\com\company\project\business\service\image\EgovMainImageService.java",
    "business-suite\src\main\java\com\company\project\business\service\image\MainImageService.java",
    "business-suite\src\main\java\com\company\project\business\service\informalsanction\InformalSanctionService.java",
    "business-suite\src\main\java\com\company\project\business\service\knowledge\EgovKnowledgeService.java",
    "business-suite\src\main\java\com\company\project\business\service\knowledge\KnowledgeService.java",
    "business-suite\src\main\java\com\company\project\business\service\mail\EgovMailService.java",
    "business-suite\src\main\java\com\company\project\business\service\mail\MailService.java",
    "business-suite\src\main\java\com\company\project\business\service\memoreport\EgovMemoReportService.java",
    "business-suite\src\main\java\com\company\project\business\service\memoreport\MemoReportService.java",
    "business-suite\src\main\java\com\company\project\business\service\note\NoteService.java",
    "business-suite\src\main\java\com\company\project\business\service\report\EgovWorkReportService.java",
    "business-suite\src\main\java\com\company\project\business\service\report\WorkReportService.java",
    "business-suite\src\main\java\com\company\project\business\service\roughmap\EgovRoughMapService.java",
    "business-suite\src\main\java\com\company\project\business\service\roughmap\RoughMapService.java",
    "business-suite\src\main\java\com\company\project\business\service\schedule\EgovLeaderScheduleService.java",
    "business-suite\src\main\java\com\company\project\business\service\schedule\EgovMemoTodoService.java",
    "business-suite\src\main\java\com\company\project\business\service\schedule\EgovScheduleService.java",
    "business-suite\src\main\java\com\company\project\business\service\schedule\LeaderScheduleService.java",
    "business-suite\src\main\java\com\company\project\business\service\schedule\MemoTodoService.java",
    "business-suite\src\main\java\com\company\project\business\service\schedule\ScheduleService.java",
    "business-suite\src\main\java\com\company\project\business\service\scrap\EgovScrapService.java",
    "business-suite\src\main\java\com\company\project\business\service\scrap\ScrapService.java",
    "business-suite\src\main\java\com\company\project\business\service\sms\EgovSmsService.java",
    "business-suite\src\main\java\com\company\project\business\service\sms\SmsService.java"
)

# 리팩토링 함수
function Invoke-ServiceRefactor {
    param(
        [string]$filePath
    )
    
    $fullPath = Join-Path $projectRoot $filePath
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "⚠️ 파일 없음: $filePath" -ForegroundColor Yellow
        return $false
    }
    
    $content = Get-Content $fullPath -Raw -Encoding UTF8
    $originalContent = $content
    $modified = $false
    
    # 1. EgovAbstractServiceImpl → BaseAbstractService
    if ($content -match "extends EgovAbstractServiceImpl") {
        $content = $content -replace "extends EgovAbstractServiceImpl", "extends BaseAbstractService"
        $modified = $true
        Write-Host "  ✓ extends 변경" -ForegroundColor Green
    }
    
    # 2. Objects.requireNonNull() → required() - 간단한 경우만
    # 패턴: Objects.requireNonNull(변수)
    $count = 0
    $content = $content -replace "Objects\.requireNonNull\(([^,)]+)\)", {
        param($match)
        $count++
        "required($($match.Groups[1].Value))"
    }
    
    if ($count -gt 0) {
        Write-Host "  ✓ Objects.requireNonNull() $count 개 → required()" -ForegroundColor Green
        $modified = $true
    }
    
    # 3. import 추가 (필요한 경우)
    if ($modified -and $content -match "extends BaseAbstractService") {
        # BaseAbstractService import 추가
        if ($content -notmatch "import com\.company\.project\.foundation\.core\.service\.BaseAbstractService") {
            $content = $content -replace "(import com\.company\.project\.foundation\.core\.exception\.[^;]+;)", @"
$1
import com.company.project.foundation.core.service.BaseAbstractService;
"@
            Write-Host "  ✓ BaseAbstractService import 추가" -ForegroundColor Green
        }
        
        # Objects import 제거 (더 이상 필요 없음)
        if ($content -match "import java\.util\.Objects;") {
            $content = $content -replace "import java\.util\.Objects;\s*", ""
            Write-Host "  ✓ Objects import 제거" -ForegroundColor Green
        }
    }
    
    # 4. assertNotBlank private 메서드 제거 (있는 경우)
    if ($content -match "private String assertNotBlank\([^)]+\) \{[^}]+\}") {
        $content = $content -replace "private String assertNotBlank\([^)]+\) \{[^}]+\}\s*", ""
        Write-Host "  ✓ assertNotBlank 메서드 제거" -ForegroundColor Green
        $modified = $true
    }
    
    # 파일 저장
    if ($modified) {
        Set-Content -Path $fullPath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  💾 저장 완료" -ForegroundColor Cyan
        return $true
    } else {
        Write-Host "  ⏭️ 변경 사항 없음" -ForegroundColor Gray
        return $false
    }
}

# 메인 실행
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Service Refactoring Automation" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$foundationCount = 0
$businessCount = 0

Write-Host "[1/2] Foundation 모듈 리팩토링..." -ForegroundColor Yellow
foreach ($service in $foundationServices) {
    Write-Host "`n📁 $service" -ForegroundColor White
    if (Invoke-ServiceRefactor $service) {
        $foundationCount++
    }
}

Write-Host "`n[2/2] Business Suite 모듈 리팩토링..." -ForegroundColor Yellow
foreach ($service in $businessServices) {
    Write-Host "`n📁 $service" -ForegroundColor White
    if (Invoke-ServiceRefactor $service) {
        $businessCount++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ✅ 리팩토링 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Foundation: $foundationCount 개 파일" -ForegroundColor White
Write-Host "  Business Suite: $businessCount 개 파일" -ForegroundColor White
Write-Host "  총계: $($foundationCount + $businessCount) 개 파일`n" -ForegroundColor White
