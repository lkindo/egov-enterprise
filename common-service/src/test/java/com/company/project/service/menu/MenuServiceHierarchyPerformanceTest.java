package com.company.project.service.menu;

import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ExtendWith(MockitoExtension.class)
public class MenuServiceHierarchyPerformanceTest {

    @SpringBootApplication
    @EntityScan("com.company.project.domain")
    @EnableJpaRepositories("com.company.project.domain")
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private MenuRepository menuRepository;

    @Mock
    private ProgramRepository programRepository;

    @Mock
    private MenuAuthorityRepository menuAuthorityRepository;

    private MenuService menuService;

    @BeforeEach
    void setUp() throws Exception {
        menuService = new MenuService(menuRepository, programRepository, menuAuthorityRepository);

        // Inject self to avoid NPE
        java.lang.reflect.Field selfField = MenuService.class.getDeclaredField("self");
        selfField.setAccessible(true);
        selfField.set(menuService, menuService);

        // Populate Data
        List<Menu> menus = new ArrayList<>();
        long idCounter = 1;

        // Create 20 Roots
        for (int i = 0; i < 20; i++) {
            long rootId = idCounter++;
            menus.add(createMenu(rootId, "Root" + i, "root_" + i + ".do", 0L));

            // Create 10 Children for each Root
            for (int j = 0; j < 10; j++) {
                long childId = idCounter++;
                menus.add(createMenu(childId, "Child" + i + "_" + j, "child_" + i + "_" + j + ".do", rootId));

                // Create 10 GrandChildren for each Child
                for (int k = 0; k < 10; k++) {
                    long grandChildId = idCounter++;
                    menus.add(createMenu(grandChildId, "GrandChild" + i + "_" + j + "_" + k,
                            "grandchild_" + i + "_" + j + "_" + k + ".do", childId));
                }
            }
        }
        menuRepository.saveAll(java.util.Objects.requireNonNull(menus));
        menuRepository.flush();
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
    void measurePerformance() {
        // Warm up
        menuService.getRootMenuIdByProgrmFileNm("grandchild_0_0_0.do");

        long startTime = System.nanoTime();

        // Run 100 times to amplify the effect
        for (int i = 0; i < 100; i++) {
            // Search for a deep node
            // The last one: grandChildId for i=19, j=9, k=9
            menuService.getRootMenuIdByProgrmFileNm("grandchild_19_9_9.do");
        }

        long endTime = System.nanoTime();
        double durationMs = (endTime - startTime) / 1_000_000.0;

        System.out.println("Execution time for 100 calls: " + durationMs + " ms");

        // Verify correctness for one call
        Long rootId = menuService.getRootMenuIdByProgrmFileNm("grandchild_19_9_9.do");

        // We find the menu associated with rootId and check its name
        // The root for grandchild_19_9_9 should be Root19.
        Menu m = menuRepository.findById(java.util.Objects.requireNonNull(rootId)).orElseThrow();
        assertThat(m.getMenuNm()).startsWith("Root19");
    }
}
