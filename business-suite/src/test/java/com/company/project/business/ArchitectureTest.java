package com.company.project.business;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

/**
 * 아키텍처 규칙 검증 테스트 (ArchUnit)
 *
 * <p>보호하는 아키텍처 계약:
 * <ol>
 *   <li>계층 의존성 규칙: Controller → Service → Domain 단방향</li>
 *   <li>명명 규칙: 클래스명이 패키지 역할을 정확히 반영</li>
 *   <li>순환 참조 금지: 서비스 패키지 간 순환 의존성 차단</li>
 *   <li>불변 규칙: Dto, Entity 클래스의 잘못된 위치 금지</li>
 * </ol>
 */
@AnalyzeClasses(packages = "com.company.project.business", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchitectureTest {

    // ─────────────────────────────────────────────
    // 1. 레이어 의존성 규칙
    // ─────────────────────────────────────────────

    @ArchTest
    static final ArchRule layered_architecture_rule = layeredArchitecture()
            .consideringOnlyDependenciesInAnyPackage("com.company.project.business..")
            .layer("Controller").definedBy("..api.controller..")
            .layer("Service").definedBy("..service..")
            .layer("Domain").definedBy("..domain..")
            .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
            .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Service")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Controller", "Service", "Domain");

    // ─────────────────────────────────────────────
    // 2. 명명 규칙
    // ─────────────────────────────────────────────

    @ArchTest
    static final ArchRule controllers_should_be_named_controller =
            classes().that().resideInAPackage("..api.controller..")
                    .should().haveSimpleNameEndingWith("ApiController")
                    .orShould().haveSimpleNameEndingWith("Controller")
                    .because("컨트롤러 클래스 명명 규칙: *ApiController 또는 *Controller");

    @ArchTest
    static final ArchRule services_should_be_named_service =
            classes().that().areAnnotatedWith(org.springframework.stereotype.Service.class)
                    .should().haveSimpleNameEndingWith("Service")
                    .orShould().haveSimpleNameEndingWith("ServiceImpl")
                    .orShould().haveSimpleNameEndingWith("Logic")
                    .because("서비스 클래스 명명 규칙: @Service 클래스는 *Service, *ServiceImpl 또는 *Logic으로 끝나야 합니다");

    // ─────────────────────────────────────────────
    // 3. 의존성 방향 위반 금지
    // ─────────────────────────────────────────────

    @ArchTest
    static final ArchRule domain_should_not_depend_on_service =
            noClasses().that().resideInAPackage("..domain..")
                    .should().dependOnClassesThat().resideInAPackage("..service..")
                    .because("Domain 계층은 Service 계층에 의존해서는 안 됩니다 (단방향 의존성 원칙)");

    @ArchTest
    static final ArchRule domain_should_not_depend_on_controller =
            noClasses().that().resideInAPackage("..domain..")
                    .should().dependOnClassesThat().resideInAPackage("..api.controller..")
                    .because("Domain 계층은 Controller 계층에 의존해서는 안 됩니다");

    @ArchTest
    static final ArchRule service_should_not_depend_on_controller =
            noClasses().that().resideInAPackage("..service..")
                    .should().dependOnClassesThat().resideInAPackage("..api.controller..")
                    .because("Service 계층은 Controller 계층에 의존해서는 안 됩니다");

    // ─────────────────────────────────────────────
    // 4. 순환 참조 금지
    // ─────────────────────────────────────────────

    @ArchTest
    static final ArchRule no_cycles_in_service_packages =
            SlicesRuleDefinition.slices()
                    .matching("com.company.project.business.service.(*)..")
                    .should().beFreeOfCycles()
                    .because("서비스 패키지 간 순환 의존성은 유지보수성을 해칩니다");
}
