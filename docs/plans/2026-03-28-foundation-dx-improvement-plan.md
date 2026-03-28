# Foundation DX Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve code quality and developer experience in the `foundation` module by introducing ArchUnit, Test Base Classes, MapStruct standardization, and QueryDSL utilities.

**Architecture:** Enhancing the existing Spring Boot 3 architecture with defensive testing (ArchUnit) and boilerplate-reducing patterns (Base classes, MapStruct).

**Tech Stack:** Spring Boot 3, ArchUnit, MapStruct, QueryDSL, JUnit 5.

---

### Task 1: Add Dependencies
**Files:**
- Modify: `foundation/build.gradle`

**Step 1: Add ArchUnit and MapStruct dependencies**
Add the following to `dependencies` block:
```gradle
    // ArchUnit
    testImplementation libs.archunit.junit5
    testImplementation libs.archunit.library
```

**Step 2: Run build to verify dependencies**
Run: `./gradlew :foundation:classes`
Expected: BUILD SUCCESS

**Step 3: Commit**
```bash
git add foundation/build.gradle
git commit -m "chore: add ArchUnit dependencies to foundation module"
```

### Task 2: Implement ArchUnit Architecture Test
**Files:**
- Create: `foundation/src/test/java/com/company/project/foundation/ArchunitTest.java`

**Step 1: Write initial ArchUnit tests**
```java
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
            .layer("Controller").definedBy("..api.controller..")
            .layer("Service").definedBy("..service..")
            .layer("Repository").definedBy("..repository..")
            .layer("Domain").definedBy("..domain..")
            .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
            .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Service")
            .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Controller", "Service", "Repository", "Domain");
}
```

**Step 2: Run the test**
Run: `./gradlew :foundation:test --tests com.company.project.foundation.ArchunitTest`
Expected: PASS

**Step 3: Commit**
```bash
git add foundation/src/test/java/com/company/project/foundation/ArchunitTest.java
git commit -m "test: add ArchUnit tests for layered architecture"
```

### Task 3: Create Test Support Classes
**Files:**
- Create: `foundation/src/test/java/com/company/project/foundation/IntegrationTestSupport.java`
- Create: `foundation/src/test/java/com/company/project/foundation/PersistenceTestSupport.java`

**Step 1: Implement IntegrationTestSupport**
```java
package com.company.project.foundation;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public abstract class IntegrationTestSupport {
    @Autowired
    protected MockMvc mockMvc;
}
```

**Step 2: Implement PersistenceTestSupport**
```java
package com.company.project.foundation;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@DataJpaTest
@Import(PersistenceTestSupport.TestQuerydslConfig.class)
public abstract class PersistenceTestSupport {

    @TestConfiguration
    static class TestQuerydslConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }
}
```

**Step 3: Commit**
```bash
git add foundation/src/test/java/com/company/project/foundation/*Support.java
git commit -m "feat: add test support base classes"
```

### Task 4: Standardize MapStruct Mapper
**Files:**
- Create: `foundation/src/main/java/com/company/project/foundation/core/mapper/GenericMapper.java`

**Step 1: Implement GenericMapper**
```java
package com.company.project.foundation.core.mapper;

import java.util.List;

public interface GenericMapper<D, E> {
    D toDto(E entity);
    E toEntity(D dto);
    List<D> toDtoList(List<E> entityList);
    List<E> toEntityList(List<D> dtoList);
}
```

**Step 2: Commit**
```bash
git add foundation/src/main/java/com/company/project/foundation/core/mapper/GenericMapper.java
git commit -m "feat: add generic mapper interface for MapStruct"
```

### Task 5: Implement QueryDSL Support
**Files:**
- Create: `foundation/src/main/java/com/company/project/foundation/core/repository/QuerydslSupport.java`

**Step 1: Implement QuerydslSupport**
```java
package com.company.project.foundation.core.repository;

import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.PathBuilder;
import com.querydsl.jpa.impl.JPAQuery;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class QuerydslSupport {

    public <T> JPAQuery<T> applyPagination(Pageable pageable, JPAQuery<T> query) {
        if (pageable.isUnpaged()) {
            return query;
        }
        return query.offset(pageable.getOffset())
                    .limit(pageable.getPageSize());
    }

    public <T> OrderSpecifier[] getOrderSpecifier(Sort sort, Class<T> entityClass, String variable) {
        PathBuilder<T> pathBuilder = new PathBuilder<>(entityClass, variable);
        return sort.stream()
                .map(order -> new OrderSpecifier(
                        order.isAscending() ? Order.ASC : Order.DESC,
                        pathBuilder.get(order.getProperty())
                ))
                .toArray(OrderSpecifier[]::new);
    }
}
```

**Step 2: Commit**
```bash
git add foundation/src/main/java/com/company/project/foundation/core/repository/QuerydslSupport.java
git commit -m "feat: add QuerydslSupport for easier pagination and sorting"
```
