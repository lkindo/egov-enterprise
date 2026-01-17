package com.company.project.config;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class MenuFixBean {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixMenuUrl() {
        try {
            String sql = "UPDATE NPROGRMLIST SET URL = '/sym/mnu/mpm/EgovMenuListSelect.do' WHERE PROGRM_FILE_NM = 'EgovMenuListSelect'";
            jdbcTemplate.update(sql);
            System.out.println("FIX_MENU_URL_LOG: EgovMenuListSelect updated via MenuFixBean.");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
