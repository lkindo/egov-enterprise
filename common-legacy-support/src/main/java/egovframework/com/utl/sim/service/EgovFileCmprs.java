/**
 *  Class Name : EgovFileCmprs.java
 *  Description : ???(??)??? ???? ?? Business Interface class
 *  Modification Information
 *
 *   ????              ????             ????
 *   ----------   --------    ---------------------------
 *   2009.02.04   ???             ????
 *   2017.03.03   ??             ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
 *   2017.03.03   ??             ??????ES)-Null Pointer ?????CWE-476]
 *   2018.03.19   ???             createDirectories() ????????
 *   2020.08.28   ???             ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
 *   2020.10.29   ???             KISA ?? ??(?????? ??)
 *   2022.11.11   ???			  ????????
 *
 *  @author ????????? ???
 *  @since 2009. 02. 04
 *  @version 1.0
 *  @see
 *
 *  Copyright (C) 2009 by MOPAS  All right reserved.
 **/
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
	 * ???(??)??????? ??
	 * @param source ?????
	 * @param target ?????????
	 * @return boolean result ??????? True  False   
	 */
	public static boolean decmprsFile(String source, String target) throws Exception {

		// ???????
		boolean result = false;
		int cnt = 0;
		// ???? byte ??
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
						// 2022.11.11 ????????
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
