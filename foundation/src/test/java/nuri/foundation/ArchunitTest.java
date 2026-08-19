package nuri.foundation;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTag;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

@AnalyzeClasses(packages = "nuri.foundation", importOptions = ImportOption.DoNotIncludeTests.class)
@ArchTag("architecture-gate")
public class ArchunitTest {

    @ArchTest
    static final ArchRule layered_architecture_rule = layeredArchitecture()
            .consideringOnlyDependenciesInAnyPackage("nuri.foundation..")
            .layer("Core").definedBy("..core..")
            .whereLayer("Core").mayOnlyBeAccessedByLayers("Core");
}
