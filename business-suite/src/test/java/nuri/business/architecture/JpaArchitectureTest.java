package nuri.business.architecture;

import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields;

@AnalyzeClasses(packages = "nuri.business.domain", importOptions = ImportOption.DoNotIncludeTests.class)
public class JpaArchitectureTest {

    @ArchTest
    public static final ArchRule manyToOneAndOneToOneAssociationsMustBeLazy =
            fields().that().areAnnotatedWith(ManyToOne.class).or().areAnnotatedWith(OneToOne.class)
                    .should(beLazyFetched())
                    .as("ManyToOne and OneToOne associations must be explicitly defined as FetchType.LAZY to prevent N+1 queries.");

    private static ArchCondition<JavaField> beLazyFetched() {
        return new ArchCondition<>("be lazy fetched") {
            @Override
            public void check(JavaField field, ConditionEvents events) {
                FetchType fetchType = getFetchType(field);
                boolean isLazy = FetchType.LAZY.equals(fetchType);
                String message = String.format("Field %s in class %s has FetchType %s (Should be LAZY)",
                        field.getName(), field.getOwner().getName(), fetchType != null ? fetchType : "EAGER (Default)");
                events.add(new SimpleConditionEvent(field, isLazy, message));
            }
        };
    }

    private static FetchType getFetchType(JavaField field) {
        if (field.isAnnotatedWith(ManyToOne.class)) {
            return field.getAnnotationOfType(ManyToOne.class).fetch();
        }
        if (field.isAnnotatedWith(OneToOne.class)) {
            return field.getAnnotationOfType(OneToOne.class).fetch();
        }
        return null;
    }
}
