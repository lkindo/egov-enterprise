package com.company.project;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packages = "com.company.project", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchitectureTest {

    @ArchTest
    static final ArchRule services_should_not_be_accessed_by_domain = noClasses()
            .that().resideInAPackage("com.company.project.domain..")
            .should().accessClassesThat().resideInAPackage("com.company.project.service..");

    @ArchTest
    static final ArchRule controllers_should_not_be_accessed_by_service_or_domain = noClasses()
            .that().resideInAnyPackage("com.company.project.service..", "com.company.project.domain..")
            .should().accessClassesThat().resideInAPackage("com.company.project.api..")
            .because("Controllers should not be accessed by business logic or data layers");

    @ArchTest
    static final ArchRule domain_should_not_depend_on_services_or_controllers = noClasses()
            .that().resideInAPackage("com.company.project.domain..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("com.company.project.api..", "com.company.project.service..");

    @ArchTest
    static final ArchRule security_should_not_access_controllers = noClasses()
            .that().resideInAPackage("com.company.project.security..")
            .should().accessClassesThat().resideInAPackage("com.company.project.api..");
}
