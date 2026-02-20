/**
 *  Class Name : EgovFileTool.java
 *  Description : ?쒖뒪???붾젆?좊━ ?뺣낫瑜??뺤씤?섏뿬 ?쒓났?섎뒗  Business class
 *  Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *   -------    --------    ---------------------------
 *   2009.01.13    議곗옱??         理쒖큹 ?앹꽦
 *   2017.03.03    議곗꽦??	     ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2017.03.03    議곗꽦??         ?쒗걧?댁퐫??ES)-Null Pointer ??갭議?CWE-476]
 *   2018.03.19    ?좎슜??         createDirectories() 異붽? : ?щ윭 ?덈꺼???붾젆?좊━瑜??쒕쾲???앹꽦
 *
 *
 *  @author 怨듯넻 ?쒕퉬??媛쒕컻? 議곗옱??諛뺤???
 *  @since 2009. 01. 13
 *  @version 1.0
 *  @see
 *
 *  Copyright (C) 2009 by MOPAS  All right reserved.
 */
package egovframework.com.utl.sim.service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Vector;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.aop.EgovFileBasePathSecurityValidator;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;

/**
 * EgovFileTool ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *  ?섏젙??               ?섏젙??          ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2020.12.07   ?좎슜??      KISA 蹂댁븞?쎌젏 議곗튂
 *  2022.11.11   源?쒖?       ?쒗걧?댁퐫??泥섎━
 *  2024.10.29   win777	    ?붾젆?좊━ ?앹꽦 ?깃났 ???앹꽦???덈?寃쎈줈瑜?由ы꽩?섎룄濡?蹂寃?
 *  2025.02.06   ?좎슜??      deleteFile() KISA ?쒗걧?댁퐫??泥섎━
 *
 * </pre>
 */

public class EgovFileTool {

	// ?뚯씪援щ텇??
	static final char FILE_SEPARATOR = File.separatorChar;

	// 理쒕? 臾몄옄湲몄씠
	static final int MAX_STR_LEN = 1024;

	// LOGGER
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovFileTool.class);

	private static final String FILE_STORE_PATH = EgovProperties.getProperty("Globals.fileStorePath");


	/**
	 * <pre>
	 * Comment : ?붾젆?좊━(?뚯씪)瑜???젣?쒕떎. (?뚯씪,?붾젆?좊━ 援щ텇?놁씠 議댁옱?섎뒗 寃쎌슦 臾댁“嫄???젣?쒕떎)
	 * </pre>
	 *
	 * @param filePath ??젣?섍퀬???섎뒗 ?뚯씪???덈?寃쎈줈 + ?뚯씪紐?
	 * @return ?깃났?섎㈃ ??젣???덈?寃쎈줈, ?꾨땲硫대툝??겕
	 */
	public static String deletePath(String filePath) {
		return deletePath(FILE_STORE_PATH, filePath);
	}

	/**
	 * <pre>
	 * Comment : ?붾젆?좊━(?뚯씪)瑜???젣?쒕떎. (?뚯씪,?붾젆?좊━ 援щ텇?놁씠 議댁옱?섎뒗 寃쎌슦 臾댁“嫄???젣?쒕떎)
	 * </pre>
	 *
	 * @param basePath 湲곕낯 寃쎈줈
	 * @param filePath ??젣?섍퀬???섎뒗 ?뚯씪???덈?寃쎈줈 + ?뚯씪紐?
	 * @return ?깃났?섎㈃ ??젣???덈?寃쎈줈, ?꾨땲硫대툝??겕
	 */
	public static String deletePath(String basePath, String filePath) {

		// ?몄옄 媛믪씠 ?녿뒗 寃쎌슦 "Globals.fileStorePath" 湲곕낯 寃쎈줈瑜?吏?뺥븳??
		if (basePath == null || basePath.equals("")) {
			basePath = FILE_STORE_PATH;
		}

		String result = "";

		File file = new File(EgovWebUtil.filePathBlackList(basePath + filePath));
		if (file.exists()) {
			result = file.getAbsolutePath();
			if (!file.delete()) {
				result = "";
			}
		}

		return result;
	}

	/**
	 * <pre>
	 * Comment : ?붾젆?좊━瑜??앹꽦?쒕떎. (?щ윭 ?덈꺼??寃쎈줈瑜??숈떆???앹꽦)
	 * </pre>
	 *
	 * @param basePath 湲곕낯 寃쎈줈
	 * @param dirPath ?앹꽦?섍퀬???섎뒗 ?덈?寃쎈줈
	 * @return ?깃났?섎㈃ ?앹꽦???덈?寃쎈줈, ?꾨땲硫?釉붾옲??
	 */
	public static String createDirectories(String dirPath) {
		return createDirectories(FILE_STORE_PATH, dirPath);
	}

	/**
	 * <pre>
	 * Comment : ?붾젆?좊━瑜??앹꽦?쒕떎. (?щ윭 ?덈꺼??寃쎈줈瑜??숈떆???앹꽦)
	 * </pre>
	 *
	 * @param basePath 湲곕낯 寃쎈줈
	 * @param dirPath ?앹꽦?섍퀬???섎뒗 ?덈?寃쎈줈
	 * @return ?깃났?섎㈃ ?앹꽦???덈?寃쎈줈, ?꾨땲硫?釉붾옲??
	 */
	public static String createDirectories(String basePath, String dirPath) {
		String result = "";

		// ?몄옄 媛믪씠 ?녿뒗 寃쎌슦 "Globals.fileStorePath" 湲곕낯 寃쎈줈瑜?吏?뺥븳??
		if (basePath == null || basePath.equals("")) {
			basePath = FILE_STORE_PATH;
		}

		File file = new File(EgovWebUtil.filePathBlackList(basePath + dirPath));
		if (!file.exists()) {
			if (file.mkdirs()) {
				LOGGER.debug("[file.mkdirs] file : Path Creation Success");
				file.getAbsolutePath();
			} else {
				LOGGER.error("[file.mkdirs] file : Path Creation Fail");
			}
		}

		return result;
	}

	/**
	 * ?붾젆?좊━ ?대? ?섏쐞紐⑸줉??以묒뿉???뚯씪??李얜뒗 湲곕뒫(紐⑤뱺 紐⑸줉 議고쉶)
	 *
	 * @param fileArray fileArray ?뚯씪紐⑸줉
	 * @return ArrayList list ?뚯씪紐⑸줉(?덈?寃쎈줈)
	 */
	public static List<String> getSubFilesByAll(File[] fileArray) throws Exception {
		ArrayList<String> list = new ArrayList<>();

		for (File element : fileArray) {
			// ?붾젆?좊━ ?덉뿉 ?붾젆?좊━硫?洹??덉쓽 ?뚯씪紐⑸줉?먯꽌 李얜룄濡??ш??몄텧?쒕떎.
			if (element.isDirectory()) {
				File[] tmpArray = element.listFiles();
				list.addAll(getSubFilesByAll(tmpArray));
				// ?뚯씪?대㈃ ?대뒗??
			} else {
				list.add(element.getAbsolutePath());
			}
		}

		return list;
	}

	/**
	 * <pre>
	 * Comment : ?붾젆?좊━瑜??앹꽦?쒕떎.
	 * </pre>
	 *
	 * @param dirPath ?앹꽦?섍퀬???섎뒗 ?덈?寃쎈줈
	 * @return ?깃났?섎㈃ ?덉꽦???덈?寃쎈줈, ?꾨땲硫?釉붾옲??
	 */
	public static String createNewDirectory(String dirPath) {

		return createNewDirectory(FILE_STORE_PATH, dirPath);
	}

	/**
	 * <pre>
	 * Comment : ?붾젆?좊━瑜??앹꽦?쒕떎.
	 * </pre>
	 *
	 * @param basePath 湲곕낯 寃쎈줈
	 * @param dirPath ?앹꽦?섍퀬???섎뒗 ?덈?寃쎈줈
	 * @return ?깃났?섎㈃ ?덉꽦???덈?寃쎈줈, ?꾨땲硫?釉붾옲??
	 */
	public static String createNewDirectory(String basePath, String dirPath) {

		// ?몄옄 媛믪씠 ?녿뒗 寃쎌슦 "Globals.fileStorePath" 湲곕낯 寃쎈줈瑜?吏?뺥븳??
		if (basePath == null || basePath.equals("")) {
			basePath = FILE_STORE_PATH;
		}

		// ?몄옄媛??좏슚?섏? ?딆? 寃쎌슦 釉붾옲??由ы꽩
		if (dirPath == null || dirPath.equals("")) {
			return "";
		}

		File file = new File(EgovWebUtil.filePathBlackList(basePath + dirPath));
		String result = "";
		// ?놁쑝硫??앹꽦
		if (file.exists()) {
			// ?뱀떆 議댁옱?대룄 ?뚯씪?대㈃ ?앹꽦 - ?앹꽦?섏? ?딅뒗??(?꾨옒???ㅼ쭏?곸쑝濡쒕뒗 吏꾪뻾?섏? ?딆쓬)
			if (file.isFile()) {
				//new File(file.getParent()).mkdirs();
				if (file.mkdirs()) {
					result = file.getAbsolutePath();
				}
			} else {
				result = file.getAbsolutePath();
			}
		} else {
			// 議댄빐?섏? ?딆쑝硫??앹꽦
			if (file.mkdirs()) {
				result = file.getAbsolutePath();
			}
		}

		return result;
	}

	/**
	 * <pre>
	 * Comment : ?뚯씪???앹꽦?쒕떎.
	 * </pre>
	 *
	 * @param filePath fileName ?뚯씪???덈?寃쎈줈 + ?뚯씪紐?
	 * @return ?깃났?섎㈃ ?앹꽦???뚯씪???덈?寃쎈줈, ?꾨땲硫대툝??겕
	 */
	public static String createNewFile(String filePath) {
		return createNewFile(FILE_STORE_PATH, filePath);
	}

	/**
	 * <pre>
	 * Comment : ?뚯씪???앹꽦?쒕떎.
	 * </pre>
	 *
	 * @param basePath 湲곕낯 寃쎈줈
	 * @param filePath fileName ?뚯씪???덈?寃쎈줈 + ?뚯씪紐?
	 * @return ?깃났?섎㈃ ?앹꽦???뚯씪???덈?寃쎈줈, ?꾨땲硫대툝??겕
	 */
	public static String createNewFile(String basePath, String filePath) {

		// ?몄옄 媛믪씠 ?녿뒗 寃쎌슦 "Globals.fileStorePath" 湲곕낯 寃쎈줈瑜?吏?뺥븳??
		if (basePath == null || basePath.equals("")) {
			basePath = FILE_STORE_PATH;
		}

		// ?몄옄媛??좏슚?섏? ?딆? 寃쎌슦 釉붾옲??由ы꽩
		if (filePath == null || filePath.equals("")) {
			return "";
		}

		File file = new File(EgovWebUtil.filePathBlackList(basePath + filePath));
		String result = "";
		try {
			if (file.exists()) {
				result = filePath;
			} else {
				// 議댁옱?섏? ?딆쑝硫??앹꽦??
				// 2017.02.08 ?댁젙? ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
				if (new File(file.getParent()).mkdirs()) {
					LOGGER.debug("[file.mkdirs] file : File Creation Success");
				} else {
					LOGGER.error("[file.mkdirs] file : File Creation Fail");
				}

				if (file.createNewFile()) {
					result = file.getAbsolutePath();
				}
			}
		} catch (IOException e) {
			throw new RuntimeException(e);
		}

		return result;
	}

	/**
	 * <pre>
	 * Comment : ?뚯씪????젣?쒕떎.
	 * </pre>
	 *
	 * @param fileDeletePath ??젣?섍퀬???섎뒗?뚯씪???덈?寃쎈줈
	 * @return ?깃났?섎㈃ ??젣???뚯씪???덈?寃쎈줈, ?꾨땲硫대툝??겕
	 */
	public static String deleteFile(String fileDeletePath) {
		return deleteFile(FILE_STORE_PATH, fileDeletePath);
	}

	/**
	 * <pre>
	 * Comment : ?뚯씪????젣?쒕떎.
	 * </pre>
	 *
	 * @param basePath 湲곕낯 寃쎈줈
	 * @param fileDeletePath ??젣?섍퀬???섎뒗?뚯씪???덈?寃쎈줈
	 * @return ?깃났?섎㈃ ??젣???뚯씪???덈?寃쎈줈, ?꾨땲硫대툝??겕
	 */
	public static String deleteFile(String basePath, String fileDeletePath) {

		// ?몄옄 媛믪씠 ?녿뒗 寃쎌슦 "Globals.fileStorePath" 湲곕낯 寃쎈줈瑜?吏?뺥븳??
		if (basePath == null || basePath.equals("")) {
			basePath = FILE_STORE_PATH;
		}

		// ?몄옄媛??좏슚?섏? ?딆? 寃쎌슦 釉붾옲??由ы꽩
		if (fileDeletePath == null || fileDeletePath.equals("")) {
			return "";
		}
		String result = "";
		File file = new File(EgovWebUtil.filePathBlackList(fileDeletePath));
		if (file.isFile()) {
			result = deletePath(basePath, fileDeletePath);
		} else {
			result = "";
		}

		return result;
	}

	/**
	 * ?뚯씪???뱀젙 援щ텇??',', '|', 'TAB')濡??뚯떛?섎뒗 湲곕뒫
	 *
	 * @param parFile ?뚯씪
	 * @param parChar 援щ텇??',', '|', 'TAB')
	 * @param parField ?꾨뱶??
	 * @return Vector parResult ?뚯떛寃곌낵 援ъ“泥?
	 * @exception Exception
	 */
	public static Vector<List<String>> parsFileByChar(String basePath, String parFile, String parChar, int parField) throws Exception {

		// ?몄옄 媛믪씠 ?녿뒗 寃쎌슦 "Globals.fileStorePath" 湲곕낯 寃쎈줈瑜?吏?뺥븳??
		if (basePath == null || basePath.equals("")) {
			basePath = FILE_STORE_PATH;
		}

		if (!EgovFileBasePathSecurityValidator.validate(basePath)) {
			throw new SecurityException("Unacceptable base path : " + basePath);
		}

		// ?뚯떛寃곌낵 援ъ“泥?
		Vector<List<String>> parResult = new Vector<>();

		// ?뚯씪 ?ㅽ뵂
		String parFile1 = parFile.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR);
		File file = new File(EgovWebUtil.filePathBlackList(basePath + parFile1));
		BufferedReader br = null;
		try {
			// ?뚯씪?대ŉ, 議댁옱?섎㈃ ?뚯떛 ?쒖옉
			if (file.exists() && file.isFile()) {

				// 1. ?뚯씪 ?띿뒪???댁슜???쎌뼱??StringBuffer???볥뒗??
				br = new BufferedReader(new InputStreamReader(new FileInputStream(file)));
				StringBuffer strBuff = new StringBuffer();
				String line = "";
				while ((line = br.readLine()) != null) {
					if (line.length() < MAX_STR_LEN) {
						strBuff.append(line);
					}
				}

				// 2. ?볦? ?댁슜???뱀젙 援щ텇?먮줈 ?뚯떛?섏뿬 String 諛곗뿴濡??삳뒗??
				String[] strArr = EgovStringUtil.split(strBuff.toString(), parChar);

				// 3. ?꾨뱶 ??留뚰겮 ?뚯븘媛硫?Vector<ArrayList> ?뺥깭濡?留뚮뱺??
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
