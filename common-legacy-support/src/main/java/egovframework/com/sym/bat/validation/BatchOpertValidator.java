package egovframework.com.sym.bat.validation;

import java.io.File;

import org.springframework.stereotype.Component;
import org.springframework.validation.Errors;
import org.springframework.validation.Validator;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.sym.bat.service.BatchOpert;

/**
 * BatchOpert?????????validator ?????
 * common validator ???? ???????
 *
 * @author ?
 * @version 1.0
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *   ????		????	????
 *  -------			--------    ---------------------------
 *  2010.08.20		?	????
 *  2023.06.09		??		NSR ? (?????? ?????? ????)
 *      </pre>
 **/
@Component("batchOpertValidator")
public class BatchOpertValidator implements Validator {

    /*
     * (non-Javadoc)
     * 
     * @see org.springframework.validation.Validator#supports(java.lang.Class)
     */
    @Override
    public boolean supports(Class<?> clazz) {
        return BatchOpert.class.isAssignableFrom(clazz);
    }

    /*
     * (non-Javadoc)
     * 
     * @see org.springframework.validation.Validator#validate(java.lang.Object,
     * org.springframework.validation.Errors)
     */
    @Override
    public void validate(Object obj, Errors errors) {
        // ????? ? ?????????? ????
        BatchOpert batchOpert = (BatchOpert) obj;
        // KISA ?? ??(2018-10-29, ????
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
