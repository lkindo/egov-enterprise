package egovframework.com.sym.bat.validation;

import java.io.File;

import org.springframework.stereotype.Component;
import org.springframework.validation.Errors;
import org.springframework.validation.Validator;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.sym.bat.service.BatchOpert;

/**
 * BatchOpert?대옒?ㅼ뿉???validator ?대옒??
 * common validator媛 泥섎━?섏? 紐삵븯??遺遺?寃??
 *
 * @author 源吏꾨쭔
 * @version 1.0
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??		?섏젙??	?섏젙?댁슜
 *  -------			--------    ---------------------------
 *  2010.08.20		源吏꾨쭔		理쒖큹 ?앹꽦
 *  2023.06.09		源?섏슜		NSR 蹂댁븞議곗튂 (?ъ슜???묎렐 ?대뜑 ?쒗븳 湲곕뒫 異붽?)
 * </pre>
 */
@Component("batchOpertValidator")
public class BatchOpertValidator implements Validator {

	/*
	 * (non-Javadoc)
	 * @see org.springframework.validation.Validator#supports(java.lang.Class)
	 */
	@Override
	public boolean supports(Class<?> clazz) {
		return BatchOpert.class.isAssignableFrom(clazz);
	}

	/*
	 * (non-Javadoc)
	 * @see org.springframework.validation.Validator#validate(java.lang.Object, org.springframework.validation.Errors)
	 */
	@Override
	public void validate(Object obj, Errors errors) {
		// 諛곗튂?꾨줈洹몃옩?쇰줈 吏?뺣맂 媛믪씠 ?뚯씪濡?議댁옱?섎뒗吏 寃?ы븳??
		BatchOpert batchOpert = (BatchOpert) obj;
		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		String filePath = EgovProperties.getProperty("SHELL.batchShellFolder") + batchOpert.getBatchProgrm();
		File file = new File(EgovWebUtil.filePathBlackList(filePath));
		try {
			if (!file.exists()) {
				errors.rejectValue("batchProgrm", "errors.batchProgrm", new Object[] { batchOpert.getBatchProgrm() }, "諛곗튂?꾨줈洹몃옩 {0}?? 議댁옱?섏? ?딆뒿?덈떎.");
				return;
			}
			if (!file.isFile()) {
				errors.rejectValue("batchProgrm", "errors.batchProgrm", new Object[] { batchOpert.getBatchProgrm() }, "諛곗튂?꾨줈洹몃옩 {0}???뚯씪???꾨떃?덈떎.");
				return;
			}
		} catch (SecurityException se) {
			errors.rejectValue("batchProgrm", "errors.batchProgrm", new Object[] { batchOpert.getBatchProgrm() }, " 諛곗튂?꾨줈洹몃옩 {0}???묎렐?????놁뒿?덈떎. ?뚯씪?묎렐沅뚰븳???뺤씤?섏꽭??");
		}

	}

}
