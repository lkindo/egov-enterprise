/**
 *  Class Name : EgovFileTool.java
 *  Description : ?????? ?????? ????  Business class
 *  Modification Information
 *
 *     ????        ????                  ????
 *   -------    --------    ---------------------------
 *   2009.01.13    ???         ????
 *   2017.03.03    ??	     ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
 *   2017.03.03    ??         ??????ES)-Null Pointer ?????CWE-476]
 *   2018.03.19    ???         createDirectories() ?? : ??????????????????
 *
 *
 *  @author ????????? ??????
 *  @since 2009. 01. 13
 *  @version 1.0
 *  @see
 *
 *  Copyright (C) 2009 by MOPAS  All right reserved.
 **/
package egovframework.com.utl.sim.service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.aop.EgovFileBasePathSecurityValidator;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import lombok.extern.slf4j.Slf4j;

/**
 * EgovFileToolBean ?????? ???.
 *
 * @author ?
 * @see
 *
 *      <pre>
 * == ?????Modification Information) ==
 *
 *  ????               ????          ????
 *  ----------   --------   ---------------------------
 *  2020.12.07   ???      KISA ?? ??
 *  2022.11.11   ???       ????????
 *  2024.10.29   win777	    ?? ?? ? ???????????????
 *  2025.02.06   ???      deleteFile() KISA ????????
 *
 *      </pre>
 **/

@Component
@Slf4j
public class EgovFileToolBean {

	// ??????
	static final char FILE_SEPARATOR = File.separatorChar;

	// ? ??
	static final int MAX_STR_LEN = 1024;

	private static final String FILE_STORE_PATH = EgovProperties.getProperty("Globals.fileStorePath");

	/**
	 * ???????????',', '|', 'TAB')?????? ??
	 *
	 * @param parFile  ???
	 * @param parChar  ???',', '|', 'TAB')
	 * @param parField ???
	 * @return List parResult ???????
	 * @exception Exception
	 **/
	public List<List<String>> parsFileByChar(String basePath, String parFile, String parChar, int parField)
			throws Exception {

		// ? ????? ??"Globals.fileStorePath" ??????
		if (basePath == null || basePath.equals("")) {
			basePath = FILE_STORE_PATH;
		}

		// AOP ????????.
		if (!EgovFileBasePathSecurityValidator.validate(basePath)) {
			throw new SecurityException("Unacceptable base path : " + basePath);
		}

		// ???????
		List<List<String>> parResult = new ArrayList<>();

		// ??? ??
		String parFile1 = parFile.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR);
		File file = new File(EgovWebUtil.filePathBlackList(basePath + parFile1));
		BufferedReader br = null;
		try {
			// ?????, ??? ??? ??
			if (file.exists() && file.isFile()) {

				// 1. ??? ????????????StringBuilder?????
				br = new BufferedReader(new InputStreamReader(new FileInputStream(file)));
				StringBuilder strBuff = new StringBuilder();
				String line = "";
				while ((line = br.readLine()) != null) {
					if (line.length() < MAX_STR_LEN) {
						strBuff.append(line);
					}
				}

				// 2. ?? ?????????? ????? String ?????
				String[] strArr = EgovStringUtil.split(strBuff.toString(), parChar);

				// 3. ? ???????List<ArrayList> ????
				int filedCnt = 1;
				List<String> arr = new ArrayList<>();
				for (int i = 0; i < strArr.length; i++) {

					if (parField != 1) {
						if ((filedCnt % parField) == 1) {
							if (strArr[i] != null) {
								arr.add(strArr[i]);
							}
							if (i == (strArr.length - 1)) {
								parResult.add(arr);
							}
						} else if ((filedCnt % parField) == 0) {
							if (strArr[i] != null) {
								arr.add(strArr[i]);
								parResult.add(arr);
							}
						} else {
							if (strArr[i] != null) {
								arr.add(strArr[i]);
								if (i == (strArr.length - 1)) {
									parResult.add(arr);
								}
							}
						}
					} else {
						arr = new ArrayList<>();
						if (strArr[i] != null) {
							arr.add(strArr[i]);
						}
						parResult.add(arr);
					}

					filedCnt++;
				}
			}
		} finally {
			EgovResourceCloseHelper.close(br);
		}

		return parResult;
	}

}
