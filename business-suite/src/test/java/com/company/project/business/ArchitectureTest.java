package com.company.project.business;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

@AnalyzeClasses(packages = "com.company.project.business", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchitectureTest {

    @ArchTest
    static final ArchRule layered_architecture_rule = layeredArchitecture()
            .consideringOnlyDependenciesInAnyPackage("com.company.project.business..")
            .layer("Controller").definedBy("..api.controller..")
            .layer("Service").definedBy("..service..")
            .layer("Domain").definedBy("..domain..") // business-suite에서는 Repository가 domain 하위에 위치함
            .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
            .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Service")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Controller", "Service", "Domain");
}
