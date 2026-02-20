/**
 *  Class Name : EgovFileCmprs.java
 *  Description : ?뚯씪(?붾젆?좊━)???뺤텞 諛??뺤텞?댁젣 ?섎뒗 Business Interface class
 *  Modification Information
 *
 *   ?섏젙??              ?섏젙??             ?섏젙?댁슜
 *   ----------   --------    ---------------------------
 *   2009.02.04   諛뺤???             理쒖큹 ?앹꽦
 *   2017.03.03   議곗꽦??             ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2017.03.03   議곗꽦??             ?쒗걧?댁퐫??ES)-Null Pointer ??갭議?CWE-476]
 *   2018.03.19   ?좎슜??             createDirectories() ?몄텧諛??덉쇅泥섎━ ?섏젙
 *   2020.08.28   ?좎슜??             ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2020.10.29   ?좎슜??             KISA 蹂댁븞?쎌젏 議곗튂 (寃쎈줈 議곗옉 諛??먯썝 ?쎌엯)
 *   2022.11.11   源?쒖?			  ?쒗걧?댁퐫??泥섎━
 *
 *  @author 怨듯넻 ?쒕퉬??媛쒕컻? 諛뺤???
 *  @since 2009. 02. 04
 *  @version 1.0
 *  @see
 *
 *  Copyright (C) 2009 by MOPAS  All right reserved.
 */
package egovframework.com.utl.sim.service;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.util.EgovResourceCloseHelper;

public class EgovFileCmprs {

	final static int BUFFER_SIZE = 64 * 1024;
	final static char FILE_SEPARATOR = File.separatorChar;

	/**
	 * ?뚯씪(?붾젆?좊━)???뺤텞?댁젣?섎뒗 湲곕뒫
	 * @param source ?뺤텞?뚯씪紐?
	 * @param target ?뺤텧???由??붾젆?좊━
	 * @return boolean result ?뺤텞?댁젣?깃났?щ? True / False
	 */
	public static boolean decmprsFile(String source, String target) throws Exception {

		// ?뺤텞?댁젣?깃났?щ?
		boolean result = false;
		int cnt = 0;
		// ?쎌뼱?ㅼ씪 byte 踰꾪띁
		byte[] buffer = new byte[BUFFER_SIZE];

		FileInputStream finput = null;
		FileOutputStream foutput = null;
		ZipInputStream zinput = null;

		String source1 = source.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR);
		String target1 = target.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR);
		File srcFile = new File(source1);

		if (srcFile.exists() && srcFile.isFile()) {

			String target2 = EgovFileTool.createNewDirectory(target1);
			File tarFile = new File(target2);
			finput = new FileInputStream(srcFile);
			zinput = new ZipInputStream(finput);

			ZipEntry entry;

			try {

				File efile;
				while ((entry = zinput.getNextEntry()) != null) {

					String filename = entry.getName();
					String entryFilePath = tarFile.getAbsolutePath() + FILE_SEPARATOR + filename;
					entryFilePath = EgovWebUtil.filePathBlackList(entryFilePath);
					efile = new File(entryFilePath);
					if (entry.isDirectory()) {
						EgovFileTool.createDirectories(efile.getAbsolutePath());
					} else {
						foutput = new FileOutputStream(efile);
						// 2022.11.11 ?쒗걧?댁퐫??泥섎━
						while ((cnt = zinput.read(buffer)) != -1) {
							foutput.write(buffer, 0, cnt);
						}
					}
				}

				result = true;

			} finally {
				EgovResourceCloseHelper.close(finput, zinput, foutput);
			}
		}
		return result;
	}

}
