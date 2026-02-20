package com.company.project.api.interceptor;

import com.company.project.security.service.CustomUserDetails;

import egovframework.com.sym.log.wlg.service.WebLog;

import jakarta.servlet.http.HttpServletRequest;

import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import org.springframework.security.core.Authentication;

import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.stereotype.Component;

import org.springframework.web.servlet.HandlerInterceptor;

import org.springframework.web.servlet.ModelAndView;

/**

 * ??                  ????         ???         ??       (Spring Security ?         )

 */

@Slf4j

@Component

@RequiredArgsConstructor

public class OperationalAuditInterceptor implements HandlerInterceptor {

    // private final EgovWebLogService webLogService;

    @Override

    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)

            throws Exception {

        return true;

    }

    @Override

    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,

            ModelAndView modelAndView) throws Exception {

        // API ?                   ??            ?

        WebLog webLog = new WebLog();

        String reqURL = request.getRequestURI();

        // Spring Security ?      ???      ?   ?    ??????          ?      ??

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated()

                && !authentication.getPrincipal().equals("anonymousUser")) {

            Object principal = authentication.getPrincipal();

            if (principal instanceof CustomUserDetails) {

                webLog.setRqesterId(((CustomUserDetails) principal).getUser().getUserId());

            } else {

                webLog.setRqesterId(authentication.getName());

            }

        } else {

            webLog.setRqesterId("ANONYMOUS");

        }

        webLog.setUrl(reqURL);

        webLog.setRqesterIp(getRemoteAddr(request));

        // try {

        // webLogService.logInsertWebLog(webLog);

        // } catch (Exception e) {

        // log.error("Failed to insert web log for auditing: {}", e.getMessage());

        // }

        log.info("API Audit Log: URL={}, User={}, IP={}", webLog.getUrl(), webLog.getRqesterId(),

                webLog.getRqesterIp());

    }

    private String getRemoteAddr(HttpServletRequest request) {

        String ip = request.getHeader("X-Forwarded-For");

        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {

            ip = request.getHeader("Proxy-Client-IP");

        }

        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {

            ip = request.getHeader("WL-Proxy-Client-IP");

        }

        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {

            ip = request.getRemoteAddr();

        }

        return ip;

    }

}

