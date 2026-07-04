package nuri.business.architecture;

import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import org.hibernate.annotations.Filter;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.base.DescribedPredicate;
import java.util.Set;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields;

@AnalyzeClasses(packages = "nuri.business.domain", importOptions = ImportOption.DoNotIncludeTests.class)
public class JpaArchitectureTest {

    @ArchTest
    public static final ArchRule manyToOneAndOneToOneAssociationsMustBeLazy =
            fields().that().areAnnotatedWith(ManyToOne.class).or().areAnnotatedWith(OneToOne.class)
                    .should(beLazyFetched())
                    .as("ManyToOne and OneToOne associations must be explicitly defined as FetchType.LAZY to prevent N+1 queries.");

    // 소프트삭제 커버리지 강제: useYn 컬럼을 가진 @Entity 는 softDeleteFilter @Filter 를 선언해야 한다.
    // 예외 목록 = admin 이 비활성 행까지 관리하는 참조/설정 엔티티(@Filter + @DisableSoftDelete 배선 후속 과제) 및 read-path 얽힘으로 보류한 엔티티.
    @ArchTest
    public static final ArchRule softDeletableEntitiesMustDeclareFilter =
            classes().that().areAnnotatedWith(Entity.class)
                    .and(haveUseYnField())
                    .and(areNotSoftDeleteExempt())
                    .should(declareSoftDeleteFilter())
                    .as("Entities with a useYn (soft-delete) column must declare @Filter(name=\"softDeleteFilter\") so logically-deleted rows are hidden from normal reads.");

    private static final Set<String> SOFT_DELETE_EXEMPT = Set.of(
            // FILTER_WITH_DISABLE (admin 이 비활성 행 관리 — @Filter + @DisableSoftDelete 배선 후속 과제):
            "BoardMaster", "AdministCode", "CommonCode", "CommonCodeCategory", "CommonCodeGroup", "Menu", "Template",
            // SKIP_RISKY (read-path 얽힘으로 현재 보류):
            "Community", "OnlinePollManage"
    );

    private static DescribedPredicate<JavaClass> haveUseYnField() {
        return new DescribedPredicate<>("have a useYn column") {
            @Override
            public boolean test(JavaClass javaClass) {
                return javaClass.getAllFields().stream().anyMatch(f -> f.getName().equals("useYn"));
            }
        };
    }

    private static DescribedPredicate<JavaClass> areNotSoftDeleteExempt() {
        return new DescribedPredicate<>("are not soft-delete exempt") {
            @Override
            public boolean test(JavaClass javaClass) {
                return !SOFT_DELETE_EXEMPT.contains(javaClass.getSimpleName());
            }
        };
    }

    private static ArchCondition<JavaClass> declareSoftDeleteFilter() {
        return new ArchCondition<>("declare @Filter(name=\"softDeleteFilter\")") {
            @Override
            public void check(JavaClass item, ConditionEvents events) {
                boolean has = item.isAnnotatedWith(Filter.class)
                        && "softDeleteFilter".equals(item.getAnnotationOfType(Filter.class).name());
                events.add(new SimpleConditionEvent(item, has,
                        String.format("%s has a useYn column but no @Filter(name=\"softDeleteFilter\")", item.getName())));
            }
        };
    }

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
