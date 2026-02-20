package com.company.project.api.controller.batch;

import java.io.File;

import org.springframework.stereotype.Component;

import org.springframework.validation.Errors;

import org.springframework.validation.Validator;

import egovframework.com.cmm.EgovWebUtil;

import egovframework.com.cmm.service.EgovProperties;

/**

 * BatchOpertValidator relocated.

 */

@Component("batchOpertValidator")

public class BatchOpertValidator implements Validator {

    @Override

    public boolean supports(Class<?> clazz) {

        return BatchOpert.class.isAssignableFrom(clazz);

    }

    @Override

    public void validate(Object obj, Errors errors) {

        BatchOpert batchOpert = (BatchOpert) obj;

        String filePath = EgovProperties.getProperty("SHELL.batchShellFolder") + batchOpert.getBatchProgrm();

        File file = new File(EgovWebUtil.filePathBlackList(filePath));

        try {

            if (!file.exists()) {

                errors.rejectValue("batchProgrm", "errors.batchProgrm", new Object[] { batchOpert.getBatchProgrm() },

                        "         ??                  ??{0}??          ???? ??      ??      .");

                return;

            }

            if (!file.isFile()) {

                errors.rejectValue("batchProgrm", "errors.batchProgrm", new Object[] { batchOpert.getBatchProgrm() },

                        "         ??                  ??{0}?????   ???         ??      .");

                return;

            }

        } catch (SecurityException se) {

            errors.rejectValue("batchProgrm", "errors.batchProgrm", new Object[] { batchOpert.getBatchProgrm() },

                    "          ??                  ??{0}???         ??????      ??      . ???   ?                     ???         ??      ??");

        }

    }

}

