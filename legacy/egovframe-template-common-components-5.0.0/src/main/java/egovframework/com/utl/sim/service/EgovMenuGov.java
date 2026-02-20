/**
 *  Class Name : EgovMenuGov.java
 *  Description : 
 *  Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *   -------    --------    ---------------------------

 *

 *  @version 1.0
 *  @see
 *
 *  Copyright (C) 2009 by EGOV  All rights reserved.
 */
package egovframework.com.utl.sim.service;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.util.List;
import java.util.Vector;

/**
 * 硫붾돱愿由?Business Interface class
 * 
 * @author 怨듯넻而댄룷?뚰듃 媛쒕컻? ?띻만??
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁슜
 * @since 2009.02.02
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.02.02  ?댁슜           理쒖큹 ?앹꽦
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2025.09.10  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *   2025.09.10  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *
 *      </pre>
 */
public class EgovMenuGov {

	// ?뚯씪援щ텇??
	static final char FILE_SEPARATOR = File.separatorChar;

	/**
	 * <pre>
	 * Comment : DAT ?뚯씪???뚯떛?섏뿬 硫붾돱愿由ы솕硫댁뿉 由ы꽩.
	 * </pre>
	 * 
	 * @param parFile  DAT?뚯씪紐?
	 * @param parChar  援щ텇??
	 * @param parField ?꾨뱶??
	 * @return Vector list
	 * @version 1.0 (2009.02.04.)
	 * @see
	 */
	public static Vector<List<String>> parsFileByMenuChar(String basePath, String parFile, String parChar, int parField)
			throws Exception {
		Vector<List<String>> list = null;

		File file = new File(parFile.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR));

		// ?뚯씪?대ŉ, 議댁옱?섎㈃ ?뚯떛 ?쒖옉
		if (file.exists() && file.isFile()) {
			list = EgovFileTool.parsFileByChar(basePath, parFile, parChar, parField);
		} else {
			list = new Vector<List<String>>();
		}

		return list;
	}

	/**
	 * <pre>
	 * Comment : 硫붾돱愿由??붾㈃???곗씠?瑜?DAT ?뚯씪濡??앹꽦.
	 * </pre>
	 * 
	 * @param menuIDArray    ID Array
	 * @param menuNameArray  Name Array
	 * @param menuLevelArray Lefel Array
	 * @param menuURLArray   URL Array
	 * @return boolean true/false
	 * @version 1.0 (2009.02.04.)
	 * @see
	 */
	public static boolean setDataByDATFile(String parFile, String[] menuIDArray, String[] menuNameArray,
			String[] menuLevelArray, String[] menuURLArray) throws Exception {
		boolean success = false;

		File file = new File(parFile.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR));

		try (BufferedWriter out = new BufferedWriter(new FileWriter(file));) {

			for (int i = 0; i < menuIDArray.length; i++) { // nodeId | parentNodeId | nodeName | nodeUrl
				out.write(menuIDArray[i] + "|" + menuLevelArray[i] + "|" + menuNameArray[i] + "|" + menuURLArray[i]
						+ "|");
				out.newLine();
			}
			success = true;
		}
		return success;
	}

}
