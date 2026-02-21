package egovframework.com.sym.sym.bak.service;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.nio.charset.Charset;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.ArchiveStreamFactory;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.utl.sim.service.EgovFileTool;
import lombok.extern.slf4j.Slf4j;

/**
 * ??????? Quartz Job ?????? ???.
 *
 * @author ?
 * @since 2010.09.06
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.09.06  ?         ????
 *   2017.02.08  ????          ??????ES) - ?????? ?????? ??CWE-253, CWE-440, CWE-754]
 *   2022.11.16  ???         ????????
 *   2025.07.22  ????         2025????????PMD???????? ????????-SimplifyBooleanExpressions(boolean ??????????????????? ??
 *   2025.07.22  ????         2025????????PMD???????? ????????-CloseResource(?????? ??)
 *
 *      </pre>
 **/
@Slf4j
public class BackupJob implements Job {

	/** logger **/
	private static final String SOURCE_BASE_DIRECTORY = EgovProperties.getProperty("Globals.SynchrnServerPath");
	private static final String TARGET_BASE_DIRECTORY = EgovProperties.getProperty("Globals.SynchrnServerPath");

	/**
	 * (non-Javadoc)
	 * 
	 * @see org.quartz.Job#execute(org.quartz.JobExecutionContext)
	 **/
	@Override
	public void execute(JobExecutionContext jobContext) throws JobExecutionException {

		boolean result = false;
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();

		if (log.isDebugEnabled()) {
			log.debug("job[{}] Trigger??     ?: {}", jobContext.getJobDetail().getKey().getName(),
					jobContext.getTrigger().getKey().getName());
			log.debug("job[{}] BackupOpert ID : {}", jobContext.getJobDetail().getKey().getName(),
					dataMap.getString("backupOpertId"));
			log.debug("job[{}]             ?   ?   ?         ?          : {}", jobContext.getJobDetail().getKey().getName(),
					dataMap.getString("backupOrginlDrctry"));
			log.debug("job[{}]             ???      ??      ??: {}", jobContext.getJobDetail().getKey().getName(),
					dataMap.getString("backupStreDrctry"));
			log.debug("job[{}] ?         ?          : {}", jobContext.getJobDetail().getKey().getName(), dataMap.getString("cmprsSe"));
		}

		String backupOpertId = dataMap.getString("backupOpertId");
		String backupOrginlDrctry = dataMap.getString("backupOrginlDrctry");
		String backupStreDrctry = dataMap.getString("backupStreDrctry");
		String cmprsSe = dataMap.getString("cmprsSe");

		String backupFileNm = null;
		if ("01".equals(cmprsSe)) {
			backupFileNm = File.separator + generateBackupFileNm(backupOpertId) + "." + "tar";
		} else if ("02".equals(cmprsSe)) {
			backupFileNm = File.separator + generateBackupFileNm(backupOpertId) + "." + "zip";
		} else {
			String msg = "?         ?            ?" + cmprsSe + "]????              ?         ??      ??      .";
			if (log.isErrorEnabled()) {
				log.error(msg);
			}
			throw new JobExecutionException(msg);
		}
		if (log.isDebugEnabled()) {
			log.debug("            ?            ?: {}", backupFileNm);
		}
		dataMap.put("backupFile", backupFileNm);

		if ("01".equals(cmprsSe)) {
			result = excuteBackup(backupOrginlDrctry, backupStreDrctry, backupFileNm, ArchiveStreamFactory.TAR);
		} else {
			result = excuteBackup(backupOrginlDrctry, backupStreDrctry, backupFileNm, ArchiveStreamFactory.ZIP);
		}

		// jobContext??? ?????
		jobContext.setResult(result);
	}

	/**
	 * ???????. ??: ?ID_???()
	 * 
	 * @param backupOpertId ?ID
	 * @return ??
	 **/
	private String generateBackupFileNm(String backupOpertId) {
		String backupFileNm = null;
		Date currentTime = new Date();
		SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
		backupFileNm = backupOpertId + "_" + formatter.format(currentTime);

		return backupFileNm;
	}

	/**
	 * ?????(tar,zip)?? ?? ??
	 * 
	 * @param backupOrginlDrctry ?????
	 * @param targetFileNm       ????
	 * @param archiveFormat      ????(tar, zip)
	 * @return result ???? True  False   
	 */
	@SuppressWarnings("unchecked")
	public boolean excuteBackup(String backupOrginlDrctry, String backupStreDrctry, String targetFileNm,
			String archiveFormat) throws JobExecutionException {

		File srcFile = new File(SOURCE_BASE_DIRECTORY + EgovWebUtil.filePathBlackList(backupOrginlDrctry));
		// ????.
		File targetFile = new File(TARGET_BASE_DIRECTORY + EgovWebUtil.filePathBlackList(backupStreDrctry)
				+ FilenameUtils.getName(targetFileNm));

		if (!srcFile.exists()) {
			String msg = "            ?   ?   ?         ?         [" + srcFile.getAbsolutePath() + "]                  ???? ??      ??      .";
			if (log.isErrorEnabled()) {
				log.error(msg);
			}
			throw new JobExecutionException(msg);
		}

		// 1. ???????
		if (srcFile.isFile()) {
			// ??????...
			String msg = "            ?   ?   ?         ?         [" + srcFile.getAbsolutePath() + "]         ???   ??      ?? ?         ?                  ??        ?        ????      ??";
			if (log.isErrorEnabled()) {
				log.error(msg);
			}
			throw new JobExecutionException(msg);
		}

		// ?????
		boolean result = false;

		@SuppressWarnings("rawtypes")
		ArchiveOutputStream aosOutput = null;
		ArchiveEntry entry = null;

		// 2. ??????????.
		try (FileOutputStream fosOutput = new FileOutputStream(targetFile);) {
			if (log.isDebugEnabled()) {
				log.debug("charter set : {}", Charset.defaultCharset().name());
			}
			aosOutput = new ArchiveStreamFactory().createArchiveOutputStream(archiveFormat, fosOutput);

			// Zip??????????????? ???
			// if (ArchiveStreamFactory.ZIP.equals(archiveFormat)) {
			// // ???????????~~~ ,
			// ((ZipArchiveOutputStream)
			// aosOutput).setEncoding(Charset.defaultCharset().name());
			// }

			if (ArchiveStreamFactory.TAR.equals(archiveFormat)) {
				((TarArchiveOutputStream) aosOutput).setLongFileMode(TarArchiveOutputStream.LONGFILE_GNU);
			}
			File[] fileArr = srcFile.listFiles();
			// KISA ?? ??(2018-10-29, ????
			if (fileArr == null) {
				fileArr = new File[0];
			}

			List<String> list = EgovFileTool.getSubFilesByAll(fileArr);

			for (int i = 0; i < list.size(); i++) {
				File sfile = new File(list.get(i));
				try (FileInputStream finput = new FileInputStream(sfile);) {

					if (ArchiveStreamFactory.TAR.equals(archiveFormat)) {
						// ???????????~~~
						entry = new TarArchiveEntry(sfile, sfile.getAbsolutePath());
						((TarArchiveEntry) entry).setSize(sfile.length());
					} else {
						entry = new ZipArchiveEntry(sfile.getAbsolutePath());
						((ZipArchiveEntry) entry).setSize(sfile.length());
					}
					aosOutput.putArchiveEntry(entry);
					IOUtils.copy(finput, aosOutput);
					aosOutput.closeArchiveEntry();
					finput.close();
					result = true;
				}
			}
			aosOutput.close();
		} catch (FileNotFoundException e) {// KISA ?? ??(2018-10-29, ????
			String msg = "???   ??         ???? ??      ??      .";
			if (log.isErrorEnabled()) {
				log.error(msg, e);
			}
			throw new JobExecutionException(msg, e);
		} catch (Exception e) {
			// LOGGER.error("?????? ????. ?? : {}", e.getMessage());
			// LOGGER.debug(e.getMessage());

			String msg = "            ?         ??         ??   ?                        ??      ??      .";
			if (log.isErrorEnabled()) {
				log.error(msg, e);
			}
			// result = false;
			throw new JobExecutionException(msg, e);
		} finally {
			EgovResourceCloseHelper.close(aosOutput);

			if (!result) {
				// 2017.02.08 ???? ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
				if (targetFile.delete()) {
					if (log.isDebugEnabled()) {
						log.debug("[file.delete] targetFile : File Deletion Success");
					}
				} else {
					if (log.isErrorEnabled()) {
						log.error("[file.delete] targetFile : File Deletion Fail");
					}
				}
			}
		}

		return result;
	}

}
