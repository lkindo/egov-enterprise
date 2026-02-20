package egovframework.com.sym.sym.bak.validation;

import java.io.File;

import org.springframework.stereotype.Component;
import org.springframework.validation.Errors;
import org.springframework.validation.Validator;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import com.company.project.service.backup.dto.BackupOpertDto;
import egovframework.com.utl.fcc.service.EgovStringUtil;

/**
 * BackupOpert?????????validator ?????
 * common validator ???? ???????
 *
 * @author ?
 * @version 1.0
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.09.02   ?    ????
 *  2022.11.16   ???    ????????
 *      </pre>
 **/
@Component("backupOpertValidator")
public class BackupOpertValidator implements Validator {

	private static final String SOURCE_BASE_DIRECTORY = EgovProperties.getProperty("Globals.SynchrnServerPath");
	private static final String TARGET_BASE_DIRECTORY = EgovProperties.getProperty("Globals.SynchrnServerPath");

	/*
	 * (non-Javadoc)
	 * 
	 * @see org.springframework.validation.Validator#supports(java.lang.Class)
	 */
	@Override
	public boolean supports(Class<?> clazz) {
		return BackupOpertDto.class.isAssignableFrom(clazz);
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
		BackupOpertDto backupOpert = (BackupOpertDto) obj;
		File dir = null;
		String srcDir = backupOpert.getBackupOrginlDrctry();
		// KISA ?? ??(2018-10-29, ????
		dir = new File(SOURCE_BASE_DIRECTORY + EgovWebUtil.filePathBlackList(srcDir));
		try {
			if (!dir.exists()) {
				errors.rejectValue("backupOrginlDrctry", "errors.backupOrginlDrctry", new Object[] { srcDir },
						"?         ?          {0}??          ???? ??      ??      .");
				return;
			}
			if (!dir.isDirectory()) {
				errors.rejectValue("backupOrginlDrctry", "errors.backupOrginlDrctry", new Object[] { srcDir },
						"            ??      ??{0}???         ?                  ?         ??      .");
				return;
			}
		} catch (SecurityException se) {
			errors.rejectValue("backupOrginlDrctry", "errors.backupOrginlDrctry", new Object[] { srcDir },
					" ?         ?          {0}???         ??????      ??      . ???   ?                     ???         ??      ??");
			return;
		}

		// KISA ?? ??(2018-10-29, ????
		String targetDir = EgovStringUtil.isNullToString(backupOpert.getBackupStreDrctry());
		// KISA ?? ??(2018-10-29, ????
		dir = new File(TARGET_BASE_DIRECTORY
				+ EgovWebUtil.filePathBlackList(EgovStringUtil.isNullToString(backupOpert.getBackupStreDrctry())));
		try {
			if (!dir.exists()) {
				errors.rejectValue("backupStreDrctry", "errors.backupStreDrctry", new Object[] { targetDir },
						"?         ?          {0}??          ???? ??      ??      .");
				return;
			}
			if (!dir.isDirectory()) {
				errors.rejectValue("backupStreDrctry", "errors.backupStreDrctry", new Object[] { targetDir },
						"?         ?          {0}???         ?                  ?         ??      .");
				return;
			}
		} catch (SecurityException se) {
			errors.rejectValue("backupStreDrctry", "errors.backupStreDrctry", new Object[] { targetDir },
					" ?         ?          {0}???         ??????      ??      . ???   ?                     ???         ??      ??");
			return;
		}

		if (targetDir.equals(srcDir)) {
			errors.rejectValue("backupStreDrctry", "errors.backupStreDrctry", new Object[] { srcDir, targetDir },
					"            ?   ?   ?         ?         {0}??            ???      ??      ??{1}??         ?       ???                 ????      ??      .");
			return;
		}

	}

}
