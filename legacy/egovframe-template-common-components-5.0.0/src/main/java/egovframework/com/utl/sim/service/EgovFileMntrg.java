**
 *  Class Name : EgovFileMntrg.java
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

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.io.FilenameUtils;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovBasicLogger;

/**
 * ?쒖뒪???ㅽ듃?뚰겕 ?뺣낫瑜??뺤씤?섏뿬 ?쒓났?섎뒗 Business class
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? 議곗옱??
 * @since 2009.01.13
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.01.13  議곗옱??         理쒖큹 ?앹꽦
 *   2017.03.06  議곗꽦??         ?쒗걧?댁퐫??ES)-Null Pointer ??갭議?CWE-476]
 *   2025.09.08  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *   2025.09.08  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AssignmentInOperand(?쇱뿰?곗옄?댁뿉 ?좊떦臾몄씠 ?ъ슜?? ?대떦 肄붾뱶瑜?蹂듭옟?섍퀬 媛?낆꽦???⑥뼱吏寃?留뚮벉)
 *
 *      </pre>
 */
public class EgovFileMntrg extends Thread {

	String storePathString = EgovProperties.getProperty("Globals.fileStorePath");

	/**
	 * <p>
	 * ?대떦 ?뚯씪??蹂寃??좊Т瑜?泥댄겕?섍린 ?꾪븳 Default 珥덉쓽 stati final 蹂?? 湲곕낯 ?곸슜? 媛믪? 60珥?
	 * </p>
	 */
	//
                     final public long DEFAULT_DELAY = 60000; // 60珥?
	static final public long DEFAULT_DELAY = 30000; // 30珥?

	/**
	 * 理쒕? 臾몄옄湲몄씠
	 **/
	static final int MAX_STR_LEN = 1024;

	/**
	 * <p>
	 * ?뚯씪??蹂寃??좊Т瑜?泥댄겕?섍린 ?꾪븳 ?대떦?뚯씪紐?蹂??
	 * </p>
	 */
	protected String filename;

	/**
	 * <p>
	 * ?대떦 ?뚯씪??蹂寃??좊Т瑜?泥댄겕?섍린 ?꾪븳 Default 珥덉쓽 stati final 蹂?? 湲곕낯 ?곸슜? 媛믪?
	 * 60珥?@link #DEFAULT_DELAY}.
	 * </p>
	 */
	protected long delay = DEFAULT_DELAY;

	File file; // ?寃?媛먯떆??? ?붾젆?좊━
	File logFile; // 媛먯떆?뺣낫蹂닿???濡쒓렇?뚯씪
	long lastModif = 0;
	boolean warnedAlready = false;
	boolean interrupted = false;
	List<String> realOriginalList = new ArrayList<String>(); // 理쒖큹???먮낯由ъ뒪??
	List<String> originalList = new ArrayList<String>(); // 吏곸쟾由ъ뒪?몃뒗 二쇨린?곸쑝濡?吏곸쟾紐⑸줉?뺣낫濡?媛깆떊?쒕떎.
	List<String> currentList = new ArrayList<String>(); // 吏곸쟾由ъ뒪?몄? 鍮꾧탳???꾩떆??由ъ뒪??
	List<String> changedList = new ArrayList<String>(); // 吏곸쟾由ъ뒪?몄? 鍮꾧탳???쒖젏??諛쒖깮??蹂寃쎈━?ㅽ듃
	List<String> totalChangedList = new ArrayList<String>(); // 理쒖큹由ъ뒪?몄? 鍮꾧탳??蹂寃?由ъ뒪??
																// totalChangedList???꾩슂??checkAndConfigure?⑥닔 ?댁뿉??二쇱꽍?댁젣??
																// ?ъ슜(遺?섎웾??怨좊젮?섏뿬 ?ъ슜)
	int cnt = 0;

	/**
	 * <p>
	 * 媛먯떆 ?섍퀬???섎뒗 ?뚯씪紐낆쓣 ?뚮씪硫뷀?濡?諛쏅뒗 湲곕낯 而⑥뒪?몃윮??Constructor).
	 * </p>
	 *
	 * @param filename
	 */
	protected EgovFileMntrg(String filename, File logFile) {
		// log.debug("EgovFileMntrg start");
		this.logFile = logFile;
		this.filename = filename;
		file = new File(storePathString + FilenameUtils.getName(filename));
		// 1. 理쒖큹?앹꽦???꾩옱 ?붾젆?좊━???섏쐞?뺣낫瑜?ArrayList??蹂닿??쒕떎. 蹂닿??뺣낫 ==> ?덈?寃쎈줈 + "," + 理쒖쥌?섏젙?쇱떆 + "," +
		// ?ъ씠利?
		File[] fList = file.listFiles();
		// 2017.03.06 議곗꽦???쒗걧?댁퐫??ES)-Null Pointer ??갭議?CWE-476]
		if (fList == null) {
			fList = new File[0];
		}
		for (int i = 0; i < fList.length; i++) {
			realOriginalList.add(fList[i].getAbsolutePath() + "$" + getLastModifiedTime(fList[i]) + "$"
					+ ((fList[i].length() / 1024) > 0 ? (fList[i].length() / 1024) : 1) + "KB");
			writeLog("ORI_" + fList[i].getAbsolutePath() + "$" + getLastModifiedTime(fList[i]) + "$"
					+ ((fList[i].length() / 1024) > 0 ? (fList[i].length() / 1024) : 1) + "KB");
		}

		originalList = new ArrayList<String>(realOriginalList);
		writeLog("START");
		setDaemon(true);
		checkAndConfigure();
		// log.debug("EgovFileMntrg end");
	}

	/**
	 * <p>
	 * 媛먯떆 ?섍퀬???섎뒗 ?뚯씪??蹂寃??좊Т瑜?泥댄겕 ?섍퀬???섎뒗 delay 珥덈? set.
	 * </p>
	 *
	 * @param delay 媛먯떆 二쇨린 珥?
	 */
	public void setDelay(long delay) {
		this.delay = delay;
	}

	/**
	 * <p>
	 * ?대떦 ?뚯씪??蹂寃쎌떆 ?묒뾽 ???댁슜??湲곗닠 ??異붿긽(abstract) 硫붿냼??
	 * </p>
	 */
	// abstract
                     void doOnChange();
	protected void doOnChange(List<String> changedList) {
		// log.debug("doOnChange() start");
		for (int i = 0; i < changedList.size(); i++) {
			writeLog(changedList.get(i));
		}
		changedList.clear(); // 吏곸쟾由ъ뒪?몄? 鍮꾧탳?댁꽌 蹂寃쎈맂 ?댁뿭? 濡쒓렇泥섎━????珥덇린?뷀븳??
		originalList = new ArrayList<String>(currentList); // ?꾩옱由ъ뒪?멸? 吏곸쟾由ъ뒪?멸? ?쒕떎.(?덈줈 ?앹꽦?댁빞 ??)
		cnt++;

		// log.debug("doOnChange() end");
	}

	/**
	 * <p>
	 * ?뚯씪??蹂寃??좊Т瑜?泥댄겕?섎뒗 硫붿냼??
	 * </p>
	 */
	protected void checkAndConfigure() {
		// log.debug("checkAndConfigure start");
		try {
			currentList.clear();
			file = new File(filename);
			// ?꾩옱?뺣낫瑜?ArrayList???대뒗??
			File[] fList = file.listFiles();
			// 2017.03.06 議곗꽦???쒗걧?댁퐫??ES)-Null Pointer ??갭議?CWE-476]
			if (fList == null) {
				fList = new File[0];
			}

			for (int i = 0; i < fList.length; i++) {
				currentList.add(fList[i].getAbsolutePath() + "$" + getLastModifiedTime(fList[i]) + "$"
						+ ((fList[i].length() / 1024) > 0 ? (fList[i].length() / 1024) : 1) + "KB");
			}
			/*
			 * for(int i = 0; i<originalList.size(); i++ ){
			 * //log.debug("in checkAndConfigure() ::: originalList:" +
			 * originalList.get(i)); } for(int i = 0; i<currentList.size(); i++ ){
			 * //log.debug("in checkAndConfigure() ::: currentList:" + currentList.get(i));
			 * }
			 */
			boolean isSame = false;
			boolean isNew = true;
			boolean isDel = true;
			String str1 = "";
			String str2 = "";
			// int tmpCnt = 0;

			// ?꾩옱?섏쐞?붾젆?좊━?뺣낫? 珥덉턀?섏쐞?붾젆?좊━ ?뺣낫瑜?鍮꾧탳?쒕떎. ??젣??寃쎌슦瑜??뺤씤??
			for (int i = 0; i < originalList.size(); i++) {
				for (int j = 0; j < currentList.size(); j++) {
					str1 = originalList.get(i);
					str2 = currentList.get(j);
					if (str1.substring(0, str1.indexOf("$")).equals(str2.substring(0, str2.indexOf("$")))) {
						isDel = false;
					}
				}
				if (isDel) {
					changedList.add("DEL$" + originalList.get(i));
				}
				isDel = true; // 珥덇린??
			}

			// ?꾩옱?섏쐞?붾젆?좊━ ?뺣낫? 理쒖큹?섏쐞?붾젆?좊━ ?뺣낫瑜?鍮꾧탳?쒕떎.(?좉퇋濡??앹꽦?섏뿀嫄곕굹 ?섏젙??寃쎌슦瑜??뺤씤??
			for (int i = 0; i < currentList.size(); i++) {
				for (int j = 0; j < originalList.size(); j++) {
					if (currentList.get(i).equals(originalList.get(j))) {
						isSame = true;
					}
					str1 = currentList.get(i);
					str2 = originalList.get(j);
					if (str1.substring(0, str1.indexOf("$")).equals(str2.substring(0, str2.indexOf("$")))) {
						isNew = false;
					}
				}
				if (!isSame) {
					if (isNew) {
						changedList.add("NEW$" + currentList.get(i));
						// totalChangedList.add("NEW$"+currentList.get(i));
					} else {
						changedList.add("MODI$" + currentList.get(i));
						// totalChangedList.add("MODI$"+currentList.get(i));
					}
				}
				isSame = false; // 珥덇린??
				isNew = true; // 珥덇린??
			}
		} catch (NullPointerException e) {
			EgovBasicLogger.debug("NullPointerException", e);

		} catch (RuntimeException e) {
			// interrupted = true; // there is no point in continuing

			EgovBasicLogger.debug("Checking error", e);
		}

		if (changedList.size() > 0) {
			// log.debug("change occur , changed file check count:"+cnt+ " , changed file
			// count:"+changedList.size());
			doOnChange(changedList);
		}

		if (isEnd()) {
			// log.debug("Thread Process END !!! (CNT :"+cnt+")");
			interrupted = true;
		}
		// log.debug("checkAndConfigure end"+changedList.size());
	}

	/**
	 * <p>
	 * ?뚯씪??蹂寃??좊Т??泥댄겕瑜?二쇨린??珥??⑥쐞濡??ㅽ뻾 ?쒗궎??硫붿냼??
	 * </p>
	 */
	@Override
	public void run() {
		while (!interrupted) {
			try {
				Thread.sleep(delay);
			} catch (InterruptedException e) {
				EgovBasicLogger.ignore("Interrupted Exception", e);
			}
			checkAndConfigure();
		}

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		this.interrupt();
	}

	/**
	 * <pre>
	 * Comment : ?붾젆?좊━(?뚯씪)??理쒖쥌 ?섏젙?쒓컙瑜??뺤씤?쒕떎.(湲곕낯濡쒖???java.util.Locale.KOREA 湲곗?)
	 * </pre>
	 * 
	 * @param File f ?섏젙?쇱옄瑜??뺤씤????곹뙆??
	 * @return String result 理쒖쥌?섏젙?쇱옄瑜?臾몄옄?대줈 由ы꽩?쒕떎.
	 */
	public static String getLastModifiedTime(File f) {
		long date = f.lastModified();
		java.text.SimpleDateFormat dateFormat = new java.text.SimpleDateFormat("yyyyMMdd:HH:mm:ss",
				java.util.Locale.KOREA);
		return dateFormat.format(new java.util.Date(date));
	}

	/**
	 * <pre>
	 * Comment : ?붾젆?좊━(?뚯씪)?? 濡쒓렇?뺣낫瑜?湲곕줉?쒕떎.
	 * </pre>
	 * 
	 * @param String logStr 異붽???濡쒓렇?뺣낫(?쇱씤?⑥쐞)
	 * @return boolean result 濡쒓렇異붽? ?깃났?щ?
	 */
	public boolean writeLog(String logStr) {
		boolean result = false;

		try (FileWriter fWriter = new FileWriter(logFile, true);
				BufferedWriter bWriter = new BufferedWriter(fWriter);
				BufferedReader br = new BufferedReader(new StringReader(logStr));) {
			String line = br.readLine();
			while (line != null) {
				if (line.length() <= MAX_STR_LEN) {
					bWriter.write(line + "\n", 0, line.length() + 1);
				}
				line = br.readLine();
			}
			result = true;
		} catch (IOException e) {
			throw new RuntimeException("File IO exception", e);
		}

		return result;
	}

	/**
	 * <pre>
	 * Comment : ?붾젆?좊━媛먯떆 醫낅즺?щ?瑜??뺤씤?쒕떎. ?대떦 ?붾젆?좊━?????濡쒓렇?뚯씪????젣??寃쎌슦??媛먯떆瑜?醫낅즺?쒕떎.
	 * </pre>
	 * 
	 * @return boolean isEnd 媛먯떆醫낅즺?щ? 以묐떒?섎젮硫?true 由ы꽩, 怨꾩냽?섎젮硫?false 由ы꽩
	 */
	public boolean isEnd() {
		// log.debug("isEnd start");
		boolean isEnd = false;
		String lastStr = "";

		try (FileReader fr = new FileReader(logFile); BufferedReader br = new BufferedReader(fr);) {
			if (logFile.exists()) {
				// 濡쒓렇?뚯씪???쎌뼱??留덉?留??앹뿉 END媛 ?덉쑝硫?醫낅즺?쒓쾬??

				// int ch = 0;
				String line = br.readLine();
				while (line != null) {
					if (line.length() <= MAX_STR_LEN) {
						lastStr = line;
					}
					line = br.readLine();
				}
				if (lastStr.equals("END")) {
					isEnd = true;
				}
			} else {
				// 濡쒓렇?뚯씪???녿뒗 寃쎌슦(??젣??寃쎌슦)??醫낅즺?쒕떎.
				isEnd = true;
			}
		} catch (IOException e) {
			throw new RuntimeException("File IO exception", e);
		}
		return isEnd;
	}
}
