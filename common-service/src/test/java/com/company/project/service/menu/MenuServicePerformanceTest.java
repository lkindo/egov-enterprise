package com.company.project.service.menu;

import com.company.project.domain.auth.Authority;
import com.company.project.domain.auth.AuthorityRepository;
import com.company.project.domain.auth.MenuAuthority;
import com.company.project.domain.auth.MenuAuthorityRepository;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = MenuServicePerformanceTest.TestConfig.class)
@Transactional
public class MenuServicePerformanceTest {

    @Configuration
    @EnableAutoConfiguration
    @EntityScan(basePackages = {"com.company.project.domain"})
    @EnableJpaRepositories(basePackages = {"com.company.project.domain"})
    @ComponentScan(basePackages = {"com.company.project.service.menu", "com.company.project.domain"}) // Scan service and domain configs (QueryDSL)
    static class TestConfig {
    }

    @Autowired
    private MenuService menuService;

    @Autowired
    private AuthorityRepository authorityRepository;

    @Autowired
    private MenuAuthorityRepository menuAuthorityRepository;

    @BeforeEach
    public void setup() {
        menuAuthorityRepository.deleteAll();
        authorityRepository.deleteAll();

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
                                .menuNo((long) j)
                                .build())
                        .mapngCreatId("MAP_" + i)
                        .build();
                menuAuthorityRepository.save(ma);
            }
        }
    }

    @Test
    public void testSelectMenuCreatManagList_PerformanceAndLogic() {
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setRecordCountPerPage(10); // Page size 10
        searchVO.setSearchKeyword("");

        StopWatch stopWatch = new StopWatch();
        stopWatch.start();
        List<MenuCreateDto> result = menuService.selectMenuCreatManagList(searchVO);
        stopWatch.stop();

        System.out.println("Execution time: " + stopWatch.getTotalTimeMillis() + " ms");
        System.out.println("Result size: " + result.size());

        // Baseline assertion: currently returns all 20 records (ignoring pagination)
        // After optimization, it should return 10 records (respecting pagination)

        assertThat(result).isNotNull();
        if (result.size() > 10) {
            System.out.println("Current implementation returns all records (N+1 pattern active, Pagination ignored)");
        } else {
             System.out.println("Implementation returns paginated records");
        }

        // Also verify chkYeoBu is correct (should be 5 for each)
        for (MenuCreateDto dto : result) {
            assertThat(dto.getChkYeoBu()).isEqualTo(5);
        }
    }
}
