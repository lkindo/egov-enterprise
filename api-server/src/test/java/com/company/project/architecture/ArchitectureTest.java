package com.company.project.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

@AnalyzeClasses(packages = "com.company.project", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchitectureTest {

    @ArchTest
    static final ArchRule layer_dependencies_are_respected = layeredArchitecture()
            .consideringAllDependencies()
            .layer("Controller").definedBy("com.company.project.api..", "com.company.project.web..", "com.company.project.controller..")
            .layer("Service").definedBy("com.company.project.service..")
            .layer("Domain").definedBy("com.company.project.domain..")
            .layer("Security").definedBy("com.company.project.security..")
            .layer("Common").definedBy("com.company.project.common..")
            .layer("Core").definedBy("com.company.project.core..")

            .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
            .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Security", "Service")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Service", "Controller", "Security", "Domain", "Common")
            .whereLayer("Common").mayOnlyBeAccessedByLayers("Service", "Controller", "Security", "Common")
            .whereLayer("Security").mayOnlyBeAccessedByLayers("Controller", "Service", "Security")
            .whereLayer("Core").mayOnlyBeAccessedByLayers("Controller", "Service", "Security", "Domain", "Common", "Core");

    @ArchTest
    static final ArchRule modules_should_stay_independent = classes()
            .that().resideInAPackage("..service.board..")
            .should().onlyDependOnClassesThat()
            .resideInAnyPackage("..service.board..", "..domain.board..", "..service.user..", "..service.file..", "..core..", "..common..", "java..", "org.springframework..", "lombok..", "org.egovframe..");
}
