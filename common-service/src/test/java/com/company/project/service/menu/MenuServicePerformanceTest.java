package com.company.project.service.menu;

import com.company.project.domain.auth.AuthorityRepository;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
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
public class MenuServicePerformanceTest {

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
    private AuthorityRepository authorityRepository;

    @Mock
    private MenuAuthorityRepository menuAuthorityRepository;

    private MenuService menuService;

    @BeforeEach
    void setUp() {
        menuService = new MenuService(menuRepository, programRepository, authorityRepository, menuAuthorityRepository);

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
                    menus.add(createMenu(grandChildId, "GrandChild" + i + "_" + j + "_" + k, "grandchild_" + i + "_" + j + "_" + k + ".do", childId));
                }
            }
        }
        menuRepository.saveAll(menus);
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
            Long rootId = menuService.getRootMenuIdByProgrmFileNm("grandchild_19_9_9.do");
            // The root for 19_9_9 is root_19.
            // verifying logic in performance test might be distracting but good for sanity
            // We just measure time here mostly.
        }

        long endTime = System.nanoTime();
        double durationMs = (endTime - startTime) / 1_000_000.0;

        System.out.println("Execution time for 100 calls: " + durationMs + " ms");

        // Verify correctness for one call
        Long rootId = menuService.getRootMenuIdByProgrmFileNm("grandchild_19_9_9.do");
        // We need to calculate what the root ID should be.
        // The roots were the first 20 IDs inserted?
        // Logic:
        // Roots: 20 items. IDs 1 to 20?
        // Wait, idCounter increments.
        // root 0 -> id 1
        // ...
        // root 19 -> id = ?
        // We can verify by finding the menu
        Menu m = menuRepository.findById(rootId).orElseThrow();
        assertThat(m.getMenuNm()).startsWith("Root19");
    }
}
