package egovframework.com.sym.sym.bak.validation;

import java.io.File;

import org.springframework.stereotype.Component;
import org.springframework.validation.Errors;
import org.springframework.validation.Validator;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.sym.sym.bak.service.BackupOpert;
import egovframework.com.utl.fcc.service.EgovStringUtil;

/**
 * BackupOpert?대옒?ㅼ뿉???validator ?대옒??
 * common validator媛 泥섎━?섏? 紐삵븯??遺遺?寃??
 *
 * @author 源吏꾨쭔
 * @version 1.0
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.09.02   源吏꾨쭔     理쒖큹 ?앹꽦
 *  2022.11.16   ?좎슜??    ?쒗걧?댁퐫??議곗튂
 * </pre>
 */
@Component("backupOpertValidator")
public class BackupOpertValidator implements Validator {

	private static final String SOURCE_BASE_DIRECTORY = EgovProperties.getProperty("Globals.SynchrnServerPath");
	private static final String TARGET_BASE_DIRECTORY = EgovProperties.getProperty("Globals.SynchrnServerPath");

	/*
	 * (non-Javadoc)
	 * @see org.springframework.validation.Validator#supports(java.lang.Class)
	 */
    @Override
	public boolean supports(Class<?> clazz) {
        return BackupOpert.class.isAssignableFrom(clazz);
     }

    /*
     * (non-Javadoc)
     * @see org.springframework.validation.Validator#validate(java.lang.Object, org.springframework.validation.Errors)
     */
	@Override
	public void validate(Object obj, Errors errors) {
		// 諛곗튂?꾨줈洹몃옩?쇰줈 吏?뺣맂 媛믪씠 ?뚯씪濡?議댁옱?섎뒗吏 寃?ы븳??
		BackupOpert backupOpert = (BackupOpert) obj;
		File dir = null;
		String srcDir = backupOpert.getBackupOrginlDrctry();
		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		dir = new File(SOURCE_BASE_DIRECTORY + EgovWebUtil.filePathBlackList(srcDir));
		try {
			if (!dir.exists()) {
				errors.rejectValue("backupOrginlDrctry", "errors.backupOrginlDrctry", new Object [] { srcDir },
			    "?붾젆?좊━ {0}?? 議댁옱?섏? ?딆뒿?덈떎.");
				return ;
			}
			if (!dir.isDirectory()) {
				errors.rejectValue("backupOrginlDrctry", "errors.backupOrginlDrctry", new Object [] { srcDir },
			    "蹂몃뵒?됲넗由?{0}???붾젆?좊━媛 ?꾨떃?덈떎.");
				return ;
			}
		} catch (SecurityException  se) {
			errors.rejectValue("backupOrginlDrctry", "errors.backupOrginlDrctry", new Object [] { srcDir },
		    " ?붾젆?좊━ {0}???묎렐?????놁뒿?덈떎. ?뚯씪?묎렐沅뚰븳???뺤씤?섏꽭??");
			return ;
		}

		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		String targetDir = EgovStringUtil.isNullToString(backupOpert.getBackupStreDrctry());
		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		dir = new File(TARGET_BASE_DIRECTORY + EgovWebUtil.filePathBlackList(EgovStringUtil.isNullToString(backupOpert.getBackupStreDrctry())));
		try {
			if (!dir.exists()) {
				errors.rejectValue("backupStreDrctry", "errors.backupStreDrctry", new Object [] { targetDir },
			    "?붾젆?좊━ {0}?? 議댁옱?섏? ?딆뒿?덈떎.");
				return ;
			}
			if (!dir.isDirectory()) {
				errors.rejectValue("backupStreDrctry", "errors.backupStreDrctry", new Object [] { targetDir },
			    "?붾젆?좊━ {0}???붾젆?좊━媛 ?꾨떃?덈떎.");
				return ;
			}
		} catch (SecurityException  se) {
			errors.rejectValue("backupStreDrctry", "errors.backupStreDrctry", new Object [] { targetDir },
		    " ?붾젆?좊━ {0}???묎렐?????놁뒿?덈떎. ?뚯씪?묎렐沅뚰븳???뺤씤?섏꽭??");
			return ;
		}

		if ( targetDir.equals(srcDir)) {
			errors.rejectValue("backupStreDrctry", "errors.backupStreDrctry", new Object [] { srcDir, targetDir },
		    "諛깆뾽?먮낯?붾젆?좊━{0}怨?諛깆뾽??λ뵒?됲넗由?{1}??媛숈? 媛믪쓣 媛吏덉닔 ?놁뒿?덈떎.");
			return ;
		}


	}

}
