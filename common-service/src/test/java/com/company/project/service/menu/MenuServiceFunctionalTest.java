package com.company.project.service.menu;

import com.company.project.domain.auth.Authority;
import com.company.project.domain.auth.AuthorityRepository;
import com.company.project.domain.auth.MenuAuthority;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.service.menu.dto.MenuCreateDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StopWatch;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = MenuServiceFunctionalTest.TestConfig.class)
@Transactional
public class MenuServiceFunctionalTest {

    @Configuration
    @EnableAutoConfiguration
    @EntityScan(basePackages = {"com.company.project.domain"})
    @EnableJpaRepositories(basePackages = {"com.company.project.domain"})
    @org.springframework.context.annotation.Import({MenuService.class})
    static class TestConfig {
        @jakarta.persistence.PersistenceContext
        private jakarta.persistence.EntityManager entityManager;

        @org.springframework.context.annotation.Bean
        public com.querydsl.jpa.impl.JPAQueryFactory jpaQueryFactory() {
            return new com.querydsl.jpa.impl.JPAQueryFactory(entityManager);
        }
    }

    @Autowired
    private MenuService menuService;

    @Autowired
    private AuthorityRepository authorityRepository;

    @Autowired
    private MenuAuthorityRepository menuAuthorityRepository;

    @Autowired
    private MenuRepository menuRepository;

    @BeforeEach
    public void setup() {
        menuAuthorityRepository.deleteAll();
        authorityRepository.deleteAll();
        menuRepository.deleteAll();

        // Seed 20 authorities
        for (int i = 0; i < 20; i++) {
            String authCode = "AUTH_" + i;
            Authority authority = Authority.builder()
                    .authorCode(authCode)
                    .authorNm("Authority " + i)
                    .authorDc("Description " + i)
                    .build();
            authorityRepository.save(authority);

            // Add some menu authorities for each
            for (int j = 0; j < 5; j++) {
                MenuAuthority ma = MenuAuthority.builder()
                        .id(MenuAuthority.MenuAuthorityId.builder()
                                .authorCode(authCode)
                                .menuNo((long) j + 1) // +1 to avoid 0 if any issue
                                .build())
                        .mapngCreatId("MAP_" + i)
                        .build();
                menuAuthorityRepository.save(ma);
            }
        }

        // Seed some menus
        for(int k=1; k<=10; k++) {
             Menu m = Menu.builder()
                .id((long)k)
                .menuNm("Menu "+k)
                .menuOrdr(k)
                .build();
             menuRepository.save(m);
        }
    }

    @Test
    public void testDeleteMenuManageList_Performance() {
        // Setup 1000 menus
        List<Menu> menus = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
             Menu m = Menu.builder()
                .id((long) i + 20000)
                .menuNm("DeleteMe" + i)
                .menuOrdr(i)
                .build();
             menus.add(m);
        }
        menuRepository.saveAll(menus);
        menuRepository.flush();

        String idsToDelete = menus.stream()
                .map(m -> String.valueOf(m.getId()))
                .collect(Collectors.joining(","));

        StopWatch sw = new StopWatch();
        sw.start();
        menuService.deleteMenuManageList(idsToDelete);
        sw.stop();

        System.out.println("Delete Execution time: " + sw.getTotalTimeMillis() + " ms");

        // Verify
        for(Menu m : menus) {
            assertThat(menuRepository.existsById(m.getId())).isFalse();
        }
    }
}
