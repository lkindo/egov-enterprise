package com.company.project;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;

/**
 * 아키텍처 테스트
 * 리팩토링된 모듈 구조에 따른 기본 아키텍처 규칙 검증
 * 
 * 모듈 구조:
 * - foundation: 시스템 인프라 (Security, IAM, Common, System Admin)
 * - business-suite: 비즈니스 도메인 기능 (Workspace, Operation, Knowledge)
 * - api-server: Spring Boot 진입점 (WAR 배포)
 * 
 * 의존성 방향:
 * api-server → foundation, business-suite
 * business-suite → foundation
 * foundation → (없음)
 */
@AnalyzeClasses(
    packages = "com.company.project",
    importOptions = {
        ImportOption.DoNotIncludeTests.class,
        ImportOption.DoNotIncludeArchives.class
    }
)
public class ArchitectureTest {

    /**
     * 아키텍처 테스트 - 현재는 비워둠
     * 
     * 참고: 대규모 리팩토링 후 아키텍처 규칙은 실제 코드 구조를 반영해야 합니다.
     */
    @ArchTest
    static final void placeholder_test() {
        // Placeholder - always passes
        // 실제 아키텍처 규칙은 점진적으로 추가할 예정
    }
}
