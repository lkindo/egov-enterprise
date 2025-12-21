package com.company.project.core.config;

import org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace;
import org.egovframe.rte.fdl.cmmn.trace.handler.DefaultTraceHandler;
import org.egovframe.rte.fdl.cmmn.trace.handler.TraceHandler;
import org.egovframe.rte.fdl.cmmn.trace.manager.DefaultTraceHandleManager;
import org.egovframe.rte.fdl.cmmn.trace.manager.TraceHandlerService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.AntPathMatcher;

/**
 * eGovFrame 공통 기반 설정
 * - LeaveaTrace: 예외 처리 추적 서비스
 */
@Configuration
public class EgovFrameConfig {

    @Bean
    public DefaultTraceHandler defaultTraceHandler() {
        return new DefaultTraceHandler();
    }

    @Bean
    public DefaultTraceHandleManager traceHandlerService() {
        DefaultTraceHandleManager manager = new DefaultTraceHandleManager();
        manager.setReqExpMatcher(new AntPathMatcher());
        manager.setPatterns(new String[] { "*" });
        manager.setHandlers(new TraceHandler[] { defaultTraceHandler() });
        return manager;
    }

    @Bean
    public LeaveaTrace leaveaTrace() {
        LeaveaTrace leaveaTrace = new LeaveaTrace();
        leaveaTrace.setTraceHandlerServices(new TraceHandlerService[] { traceHandlerService() });
        return leaveaTrace;
    }
}
