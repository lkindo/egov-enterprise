package com.company.project.service.menu;

import com.company.project.domain.auth.AuthorityRepository;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = MenuServicePerformanceTest.TestConfig.class, properties = "spring.main.allow-bean-definition-overriding=true")
@Transactional
public class MenuServicePerformanceTest {

    @Configuration
    @EnableAutoConfiguration
    @EnableCaching
    @EntityScan("com.company.project.domain")
    @EnableJpaRepositories("com.company.project.domain")
    @Import(MenuService.class)
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }

        @Bean
        public CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("allMenus", "menuParentMap", "allMenuDtos");
        }
    }

    @Autowired
    private MenuRepository menuRepository;

    @Autowired
    private MenuService menuService;

    @MockitoBean
    private ProgramRepository programRepository;

    @MockitoBean
    private AuthorityRepository authorityRepository;

    @MockitoBean
    private MenuAuthorityRepository menuAuthorityRepository;

    @BeforeEach
    void setUp() {
        // Setup a deep hierarchy
        List<Menu> menus = new ArrayList<>();
        // Root
        menus.add(createMenu(1L, "Root", "root.do", 0L));

        // Depth 1 to 20
        for (int i = 1; i <= 20; i++) {
             menus.add(createMenu( (long)(i+1), "Level" + i, "level" + i + ".do", (long)i));
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
    void measureGetRootMenuIdBenchmark() {
        String targetFile = "level20.do";

        // Warmup
        menuService.getRootMenuIdByProgrmFileNm(targetFile);

        // Verification of correctness
        Long rootId = menuService.getRootMenuIdByProgrmFileNm(targetFile);
        assertThat(rootId).isEqualTo(1L);
    }
}
