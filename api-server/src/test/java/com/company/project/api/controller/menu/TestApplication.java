package com.company.project.api.controller.menu;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import com.company.project.core.config.FullBeanNameGenerator;

@SpringBootApplication(exclude = {
  DataSourceAutoConfiguration.class,
  HibernateJpaAutoConfiguration.class
}, nameGenerator = FullBeanNameGenerator.class)
public class TestApplication {
}
