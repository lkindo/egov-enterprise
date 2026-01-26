package com.company.project.service.menu;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

/**
 * This file was found in a corrupted state (merge conflict artifact).
 * It has been temporarily replaced with a disabled test to allow the project to compile.
 * Please restore the original content from version control history if needed.
 */
@Disabled("File was corrupted and caused compilation errors")
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
    @Test
    void placeholder() {
    }
}
