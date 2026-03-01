package com.company.project;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

@AnalyzeClasses(packages = "com.company.project", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchitectureTest {

    @ArchTest
    static final ArchRule layered_architecture_rule = layeredArchitecture()
            .consideringOnlyDependenciesInAnyPackage("com.company.project..")
            .layer("Controller").definedBy("com.company.project.api.controller..")
            .layer("Service").definedBy("com.company.project.service..")
            .layer("Domain").definedBy("com.company.project.domain..", "com.company.project.service..dto..")

            .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
            .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Service", "Controller");
}
