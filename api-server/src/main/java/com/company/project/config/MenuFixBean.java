package com.company.project.config;

import org.springframework.jdbc.core.JdbcTemplate;

import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

@Slf4j

@Component

@RequiredArgsConstructor

public class MenuFixBean {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct

    public void fixMenuUrl() {

        try {

            String sql = "UPDATE NPROGRMLIST SET URL = '/sym/mnu/mpm/EgovMenuListSelect.do' WHERE PROGRM_FILE_NM = 'EgovMenuListSelect'";

            jdbcTemplate.update(sql);

            log.info("FIX_MENU_URL_LOG: EgovMenuListSelect updated via MenuFixBean.");

        } catch (Exception e) {

            log.error("Error updating menu URL", e);

        }

    }

}

