package com.company.project.api.controller.test;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.RestController;

/**

 * ?                  ??         ??????   ???      ?      ?      

 *             ?        ????       ?         ??         ???       ?         ??  ????      ??         ?????   ??

 */

@RestController

public class TestPingController {

    @GetMapping("/test/ping")

    public String ping() {

        System.out.println(">>> TestPingController.ping ENTERED <<<");

        return "PONG from TestPingController";

    }

}
