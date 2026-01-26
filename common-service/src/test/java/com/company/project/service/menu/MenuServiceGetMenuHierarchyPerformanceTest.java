package com.company.project.service.menu;

import com.company.project.domain.auth.AuthorityRepository;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;
import com.company.project.service.menu.dto.MenuDto;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.TestPropertySource;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ExtendWith(MockitoExtension.class)
@Import(MenuService.class)
@TestPropertySource(properties = {
    "spring.main.allow-bean-definition-overriding=true",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
public class MenuServiceGetMenuHierarchyPerformanceTest {

    @SpringBootApplication
    @EntityScan("com.company.project.domain")
    @EnableJpaRepositories("com.company.project.domain")
    @EnableCaching
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }

        @Bean
        public CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("menuHierarchy", "allMenus");
        }
    }

    @Autowired
    private MenuRepository menuRepository;

    @Autowired
    private ProgramRepository programRepository;

    @MockBean
    private AuthorityRepository authorityRepository;

    @MockBean
    private MenuAuthorityRepository menuAuthorityRepository;

    @Autowired
    private MenuService menuService;

    @BeforeEach
    void setUp() throws Exception {
        // Populate Programs
        List<Program> programs = new ArrayList<>();
        for (int i = 0; i < 500; i++) {
            programs.add(Program.builder()
                    .progrmFileNm("program_" + i + ".do")
                    .progrmStrePath("/path/to/program_" + i)
                    .progrmKoreanNm("Program " + i)
                    .url("/program/url/" + i + ".do")
                    .progrmDc("Description " + i)
                    .build());
        }
        programRepository.saveAll(programs);

        // Populate Menus
        List<Menu> menus = new ArrayList<>();
        long idCounter = 1;

        // Create 20 Roots
        for (int i = 0; i < 20; i++) {
            long rootId = idCounter++;
            menus.add(createMenu(rootId, "Root" + i, "program_" + (i % 500) + ".do", 0L));

            // Create 10 Children for each Root
            for (int j = 0; j < 10; j++) {
                long childId = idCounter++;
                menus.add(createMenu(childId, "Child" + i + "_" + j, "program_" + ((i * 10 + j) % 500) + ".do", rootId));

                // Create 5 GrandChildren for each Child
                for (int k = 0; k < 5; k++) {
                    long grandChildId = idCounter++;
                    menus.add(createMenu(grandChildId, "GrandChild" + i + "_" + j + "_" + k, "program_" + ((i * 100 + j * 10 + k) % 500) + ".do", childId));
                }
            }
        }
        menuRepository.saveAll(menus);
        menuRepository.flush();
        programRepository.flush();
    }

    private Menu createMenu(Long id, String name, String fileNm, Long upperId) {
        return Menu.builder()
                .id(id)
                .menuNm(name)
                .progrmFileNm(fileNm)
                .upperMenuNo(upperId)
                .menuOrdr(1)
                .build();
    }

    @Test
    void measureGetMenuHierarchyPerformance() {
        // Warm up
        menuService.getMenuHierarchy();

        long startTime = System.nanoTime();

        // Run 50 times
        int iterations = 50;
        List<MenuDto> lastHierarchy = null;
        for (int i = 0; i < iterations; i++) {
            lastHierarchy = menuService.getMenuHierarchy();
            assertThat(lastHierarchy).isNotEmpty();
        }

        long endTime = System.nanoTime();
        double durationMs = (endTime - startTime) / 1_000_000.0;
        double avgMs = durationMs / iterations;

        System.out.println("Total execution time for " + iterations + " calls: " + durationMs + " ms");
        System.out.println("Average execution time: " + avgMs + " ms");

        // Verify structure (Correctness check)
        // Root0 (ID 1) should be present
        MenuDto root0 = lastHierarchy.stream()
                .filter(m -> m.getMenuNm().equals("Root0"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Root0 not found"));

        assertThat(root0.getChildren()).isNotEmpty();

        // Child0_0 should be child of Root0
        MenuDto child0_0 = root0.getChildren().stream()
                .filter(m -> m.getMenuNm().equals("Child0_0"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Child0_0 not found under Root0"));

        // GrandChild0_0_0 should be child of Child0_0
        assertThat(child0_0.getChildren()).isNotEmpty();
        MenuDto grandChild = child0_0.getChildren().stream()
                .filter(m -> m.getMenuNm().equals("GrandChild0_0_0"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("GrandChild0_0_0 not found under Child0_0"));

        assertThat(grandChild.getMenuNm()).isEqualTo("GrandChild0_0_0");
    }
}
