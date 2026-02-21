/**
 *  Class Name : EgovMenuGov.java
 *  Description : 
 *  Modification Information
 *
 *     ????        ????                  ????
 *   -------    --------    ---------------------------

 *

 *  @version 1.0
 *  @see
 *
 *  Copyright (C) 2009 by EGOV  All rights reserved.
 **/
package egovframework.com.utl.sim.service;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.List;

/**
 * ????Business Interface class
 * 
 * @author ???? ?? ????
 * @author ????????? ??
 * @since 2009.02.02
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.02.02  ??           ????
 *   2022.11.11  ???          ????????
 *   2025.09.10  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *   2025.09.10  ????         2025????????PMD???????? ????????-CloseResource(?????? ??)
 *
 *      </pre>
 **/
public class EgovMenuGov {

	// ??????
	static final char FILE_SEPARATOR = File.separatorChar;

	/**
	 * <pre>
	 * Comment : DAT ?????????? ?????.
	 * </pre>
	 * 
	 * @param parFile  DAT????
	 * @param parChar  ???
	 * @param parField ???
	 * @return List list
	 * @version 1.0 (2009.02.04.)
	 * @see
	 **/
	public static List<List<String>> parsFileByMenuChar(String basePath, String parFile, String parChar, int parField)
			throws Exception {
		List<List<String>> list = null;

		File file = new File(parFile.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR));

		// ?????, ??? ??? ??
		if (file.exists() && file.isFile()) {
			list = EgovFileTool.parsFileByChar(basePath, parFile, parChar, parField);
		} else {
			list = new ArrayList<List<String>>();
		}

		return list;
	}

	/**
	 * <pre>
	 * Comment : ????????????DAT ??????.
	 * </pre>
	 * 
	 * @param menuIDArray    ID Array
	 * @param menuNameArray  Name Array
	 * @param menuLevelArray Lefel Array
	 * @param menuURLArray   URL Array
	 * @return boolean true/false
	 * @version 1.0 (2009.02.04.)
	 * @see
	 **/
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
