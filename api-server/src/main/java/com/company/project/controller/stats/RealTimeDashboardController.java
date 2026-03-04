package com.company.project.controller.stats;

import com.company.project.service.stats.RealTimeDashboardService;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import org.springframework.messaging.handler.annotation.MessageMapping;

import org.springframework.messaging.handler.annotation.SendTo;

import org.springframework.web.bind.annotation.RestController;

/**

 * ??         ?????      ???      ?      ?

 */

@Slf4j

@RestController

@RequiredArgsConstructor

public class RealTimeDashboardController {

    private final RealTimeDashboardService dashboardService;

    /**

     * ??????          ???

     */

    @MessageMapping("/user.connect")

    @SendTo("/topic/dashboard/stats")

    public void handleUserConnect() {

        dashboardService.incrementActiveUsers();

        log.info("User connected");

    }

    /**

     * ??????          ?         ????

     */

    @MessageMapping("/user.disconnect")

    @SendTo("/topic/dashboard/stats")

    public void handleUserDisconnect() {

        dashboardService.decrementActiveUsers();

        log.info("User disconnected");

    }

}