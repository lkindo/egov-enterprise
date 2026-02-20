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
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Vector;

import org.springframework.stereotype.Component;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.aop.EgovFileBasePathSecurityValidator;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import lombok.extern.slf4j.Slf4j;

/**
 * EgovFileToolBean ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @see
 *
 *      <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *  ?섏젙??               ?섏젙??          ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2020.12.07   ?좎슜??      KISA 蹂댁븞?쎌젏 議곗튂
 *  2022.11.11   源?쒖?       ?쒗걧?댁퐫??泥섎━
 *  2024.10.29   win777	    ?붾젆?좊━ ?앹꽦 ?깃났 ???앹꽦???덈?寃쎈줈瑜?由ы꽩?섎룄濡?蹂寃?
 *  2025.02.06   ?좎슜??      deleteFile() KISA ?쒗걧?댁퐫??泥섎━
 *
 *      </pre>
 */

@Component
@Slf4j
public class EgovFileToolBean {

	// ?뚯씪援щ텇??
	static final char FILE_SEPARATOR = File.separatorChar;

	// 理쒕? 臾몄옄湲몄씠
	static final int MAX_STR_LEN = 1024;

	private static final String FILE_STORE_PATH = EgovProperties.getProperty("Globals.fileStorePath");

	/**
	 * ?뚯씪???뱀젙 援щ텇??',', '|', 'TAB')濡??뚯떛?섎뒗 湲곕뒫
	 *
	 * @param parFile  ?뚯씪
	 * @param parChar  援щ텇??',', '|', 'TAB')
	 * @param parField ?꾨뱶??
	 * @return Vector parResult ?뚯떛寃곌낵 援ъ“泥?
	 * @exception Exception
	 */
	public Vector<List<String>> parsFileByChar(String basePath, String parFile, String parChar, int parField)
			throws Exception {

		// ?몄옄 媛믪씠 ?녿뒗 寃쎌슦 "Globals.fileStorePath" 湲곕낯 寃쎈줈瑜?吏?뺥븳??
		if (basePath == null || basePath.equals("")) {
			basePath = FILE_STORE_PATH;
		}

		// AOP ?곸슜??二쇱꽍 泥섎━ ?쒕떎.
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
