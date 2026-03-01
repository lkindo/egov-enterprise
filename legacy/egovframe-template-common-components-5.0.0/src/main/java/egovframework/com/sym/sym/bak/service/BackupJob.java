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
 * 諛깆뾽?묒뾽???ㅽ뻾?섎뒗 Quartz Job ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @since 2010.09.06
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.09.06  源吏꾨쭔          理쒖큹 ?앹꽦
 *   2017.02.08  ?댁젙?          ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫?? 遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2022.11.16  ?좎슜??         ?쒗걧?댁퐫??議곗튂
 *   2025.07.22  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-SimplifyBooleanExpressions(boolean ?ъ슜 ??遺덊븘?뷀븳 鍮꾧탳 ?곗궛???쇳븯?꾨줉 ??
 *   2025.07.22  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *
 *      </pre>
 */
@Slf4j
public class BackupJob implements Job {

	/** logger */
	private static final String SOURCE_BASE_DIRECTORY = EgovProperties.getProperty("Globals.SynchrnServerPath");
	private static final String TARGET_BASE_DIRECTORY = EgovProperties.getProperty("Globals.SynchrnServerPath");

	/**
	 * (non-Javadoc)
	 * 
	 * @see org.quartz.Job#execute(org.quartz.JobExecutionContext)
	 */
	@Override
	public void execute(JobExecutionContext jobContext) throws JobExecutionException {

		boolean result = false;
		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();

		if (log.isDebugEnabled()) {
			log.debug("job[{}] Trigger?대쫫 : {}", jobContext.getJobDetail().getKey().getName(),
					jobContext.getTrigger().getKey().getName());
			log.debug("job[{}] BackupOpert ID : {}", jobContext.getJobDetail().getKey().getName(),
					dataMap.getString("backupOpertId"));
			log.debug("job[{}] 諛깆뾽?먮낯?붾젆?좊━ : {}", jobContext.getJobDetail().getKey().getName(),
					dataMap.getString("backupOrginlDrctry"));
			log.debug("job[{}] 諛깆뾽??λ뵒?됲넗由?: {}", jobContext.getJobDetail().getKey().getName(),
					dataMap.getString("backupStreDrctry"));
			log.debug("job[{}] ?뺤텞援щ텇 : {}", jobContext.getJobDetail().getKey().getName(), dataMap.getString("cmprsSe"));
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
			String msg = "?뺤텞援щ텇媛?" + cmprsSe + "]???섎せ吏?뺣릺?덉뒿?덈떎.";
			if (log.isErrorEnabled()) {
				log.error(msg);
			}
			throw new JobExecutionException(msg);
		}
		if (log.isDebugEnabled()) {
			log.debug("諛깆뾽?붿씪紐?: {}", backupFileNm);
		}
		dataMap.put("backupFile", backupFileNm);

		if ("01".equals(cmprsSe)) {
			result = excuteBackup(backupOrginlDrctry, backupStreDrctry, backupFileNm, ArchiveStreamFactory.TAR);
		} else {
			result = excuteBackup(backupOrginlDrctry, backupStreDrctry, backupFileNm, ArchiveStreamFactory.ZIP);
		}

		// jobContext??寃곌낵媛믪쓣 ??ν븳??
		jobContext.setResult(result);
	}

	/**
	 * 諛깆뾽?붿씪紐낆쓣 ?앹꽦?쒕떎. 諛깆뾽?붿씪紐?: 諛깆뾽?묒뾽ID_?꾩옱?쒓컖()
	 * 
	 * @param backupOpertId 諛깆뾽?묒뾽ID
	 * @return 諛깆뾽?붿씪紐?
	 */
	private String generateBackupFileNm(String backupOpertId) {
		String backupFileNm = null;
		Date currentTime = new Date();
		SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault());
		backupFileNm = backupOpertId + "_" + formatter.format(currentTime);

		return backupFileNm;
	}

	/**
	 * ?붾젆?좊━瑜?諛깆뾽?붿씪(tar,zip)?쇰줈 諛깆뾽?섎뒗 湲곕뒫
	 * 
	 * @param backupOrginlDrctry 諛깆뾽?먮낯?붾젆?좊━紐?
	 * @param targetFileNm       諛깆뾽?뚯씪紐?
	 * @param archiveFormat      ??ν룷留?(tar, zip)
	 * @return result 諛깆뾽?깃났?щ? True / False
	 */
	@SuppressWarnings("unchecked")
	public boolean excuteBackup(String backupOrginlDrctry, String backupStreDrctry, String targetFileNm,
			String archiveFormat) throws JobExecutionException {

		File srcFile = new File(SOURCE_BASE_DIRECTORY + EgovWebUtil.filePathBlackList(backupOrginlDrctry));
		// ?붿씪紐??앹꽦.
		File targetFile = new File(TARGET_BASE_DIRECTORY + EgovWebUtil.filePathBlackList(backupStreDrctry)
				+ FilenameUtils.getName(targetFileNm));

		if (!srcFile.exists()) {
			String msg = "諛깆뾽?먮낯?붾젆?좊━[" + srcFile.getAbsolutePath() + "]媛 議댁옱?섏? ?딆뒿?덈떎.";
			if (log.isErrorEnabled()) {
				log.error(msg);
			}
			throw new JobExecutionException(msg);
		}

		// 1. ?뚯씪??寃쎌슦
		if (srcFile.isFile()) {
			// ?먮윭泥섎━??寃?...
			String msg = "諛깆뾽?먮낯?붾젆?좊━[" + srcFile.getAbsolutePath() + "]媛 ?뚯씪?낅땲?? ?붾젆?좊━紐낆쓣 吏?뺥빐???⑸땲??";
			if (log.isErrorEnabled()) {
				log.error(msg);
			}
			throw new JobExecutionException(msg);
		}

		// ?뺤텞?깃났?щ?
		boolean result = false;

		@SuppressWarnings("rawtypes")
		ArchiveOutputStream aosOutput = null;
		ArchiveEntry entry = null;

		// 2. ?붾젆?좊━??寃쎌슦 留?泥섎━?쒕떎.
		try (FileOutputStream fosOutput = new FileOutputStream(targetFile);) {
			if (log.isDebugEnabled()) {
				log.debug("charter set : {}", Charset.defaultCharset().name());
			}
			aosOutput = new ArchiveStreamFactory().createArchiveOutputStream(archiveFormat, fosOutput);

			// Zip?먯꽌??泥섎━?덊빐???쒓??덇묠?몄꽌 二쇱꽍泥섎━??
			// if (ArchiveStreamFactory.ZIP.equals(archiveFormat)) {
			// // ?뚯씪?대쫫 ?쒓?泥섎━ ~~~ ,
			// ((ZipArchiveOutputStream)
			// aosOutput).setEncoding(Charset.defaultCharset().name());
			// 
                    }

			if (ArchiveStreamFactory.TAR.equals(archiveFormat)) {
				((TarArchiveOutputStream) aosOutput).setLongFileMode(TarArchiveOutputStream.LONGFILE_GNU);
			}
			File[] fileArr = srcFile.listFiles();
			// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			if (fileArr == null) {
				fileArr = new File[0];
			}

			List<String> list = EgovFileTool.getSubFilesByAll(fileArr);

			for (int i = 0; i < list.size(); i++) {
				File sfile = new File(list.get(i));
				try (FileInputStream finput = new FileInputStream(sfile);) {

					if (ArchiveStreamFactory.TAR.equals(archiveFormat)) {
						// ?뚯씪?대쫫 ?쒓?泥섎━ ~~~
						entry = new TarArchiveEntry(sfile,
								new String(sfile.getAbsolutePath().getBytes(Charset.defaultCharset().name()), "UTF-8"));
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
		} catch (FileNotFoundException e) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			String msg = "?뚯씪??議댁옱?섏? ?딆뒿?덈떎.";
			if (log.isErrorEnabled()) {
				log.error(msg, e);
			}
			throw new JobExecutionException(msg, e);
		} catch (Exception e) {
			// LOGGER.error("諛깆뾽?붿씪?앹꽦以??먮윭媛 諛쒖깮?덉뒿?덈떎. ?먮윭 : {
                    }", e.getMessage());
			// LOGGER.debug(e.getMessage());

			String msg = "諛깆뾽?붿씪?앹꽦以??먮윭媛 諛쒖깮?덉뒿?덈떎.";
			if (log.isErrorEnabled()) {
				log.error(msg, e);
			}
			// result = false;
			throw new JobExecutionException(msg, e);
		} finally {
			EgovResourceCloseHelper.close(aosOutput);

			if (!result) {
				// 2017.02.08 ?댁젙? ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
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
