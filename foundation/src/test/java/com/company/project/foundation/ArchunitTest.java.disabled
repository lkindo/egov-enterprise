package com.company.project.foundation;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

@AnalyzeClasses(packages = "com.company.project.foundation", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchunitTest {

    @ArchTest
    static final ArchRule layered_architecture_rule = layeredArchitecture()
            .consideringOnlyDependenciesInAnyPackage("com.company.project.foundation..")
            .layer("Controller").definedBy("..api..")
            .layer("Service").definedBy("..service..")
            .layer("Security").definedBy("..security..")
            .layer("Repository").definedBy("..repository..")
            .layer("Domain").definedBy("..domain..")
            .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
            .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Service", "Security")
            .whereLayer("Security").mayOnlyBeAccessedByLayers("Controller", "Service", "Security")
            .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service", "Security")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Controller", "Service", "Repository", "Domain", "Security");
}
