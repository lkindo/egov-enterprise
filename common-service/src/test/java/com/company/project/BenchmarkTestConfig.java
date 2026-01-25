package com.company.project;

import com.company.project.service.code.CommonCodeService;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.mockito.Mockito;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

@SpringBootConfiguration
@EnableAutoConfiguration
@EnableCaching
@Import(CommonCodeService.class)
public class BenchmarkTestConfig {

    @Bean(name = "reprtStatsIdGnrService")
    public EgovIdGnrService reprtStatsIdGnrService() {
        return Mockito.mock(EgovIdGnrService.class);
    }

    @Bean(name = "leaveaTrace")
    public LeaveaTrace leaveaTrace() {
        return Mockito.mock(LeaveaTrace.class);
    }

    @Bean(name = "propertiesService")
    public EgovPropertyService propertiesService() {
        return Mockito.mock(EgovPropertyService.class);
    }

    @Bean
    public JPAQueryFactory jpaQueryFactory() {
        return Mockito.mock(JPAQueryFactory.class);
    }
}
