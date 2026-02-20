/**
 *  Class Name : EgovFileMntrg.java
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

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.io.FilenameUtils;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovBasicLogger;

/**
 * ???????? ?????? ???? Business class
 * 
 * @author ????????? ???
 * @since 2009.01.13
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.01.13  ???         ????
 *   2017.03.06  ??         ??????ES)-Null Pointer ?????CWE-476]
 *   2025.09.08  ????         2025????????PMD???????? ????????-CloseResource(?????? ??)
 *   2025.09.08  ????         2025????????PMD???????? ????????-AssignmentInOperand(????? ????????? ??????????????????
 *
 *      </pre>
 **/
public class EgovFileMntrg extends Thread {

	String storePathString = EgovProperties.getProperty("Globals.fileStorePath");

	/**
	 * <p>
	 * ?????????????? ? Default ???stati final ?? ????? ?? 60??
	 * </p>
	 **/
	// static final public long DEFAULT_DELAY = 60000; // 60??
	static final public long DEFAULT_DELAY = 30000; // 30??

	/**
	 * ? ??
	 ***/
	static final int MAX_STR_LEN = 1024;

	/**
	 * <p>
	 * ?????????? ? ?????????
	 * </p>
	 **/
	protected String filename;

	/**
	 * <p>
	 * ?????????????? ? Default ???stati final ?? ????? ??
	 * 60??@link #DEFAULT_DELAY}.
	 * </p>
	 **/
	protected long delay = DEFAULT_DELAY;

	File file; // ???????? ??
	File logFile; // ?????????
	long lastModif = 0;
	boolean warnedAlready = false;
	boolean interrupted = false;
	List<String> realOriginalList = new ArrayList<String>(); // ????????
	List<String> originalList = new ArrayList<String>(); // ???? ?????????.
	List<String> currentList = new ArrayList<String>(); // ????? ???????????
	List<String> changedList = new ArrayList<String>(); // ????? ??????????????
	List<String> totalChangedList = new ArrayList<String>(); // ????? ?????????
																// totalChangedList?????checkAndConfigure?? ????????
																// ????????????? ????
	int cnt = 0;

	/**
	 * <p>
	 * ???????? ????????????????????Constructor).
	 * </p>
	 *
	 * @param filename
	 **/
	protected EgovFileMntrg(String filename, File logFile) {
		// log.debug("EgovFileMntrg start");
		this.logFile = logFile;
		this.filename = filename;
		file = new File(storePathString + FilenameUtils.getName(filename));
		// 1. ?????? ?????????ArrayList?????. ?? ==> ????+ "," + ???? + "," +
		// ????
		File[] fList = file.listFiles();
		// 2017.03.06 ????????ES)-Null Pointer ?????CWE-476]
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
	 * ???????? ??????????????? delay ?? set.
	 * </p>
	 *
	 * @param delay ?????
	 **/
	public void setDelay(long delay) {
		this.delay = delay;
	}

	/**
	 * <p>
	 * ???????????? ????????????abstract) ???
	 * </p>
	 **/
	// abstract protected void doOnChange();
	protected void doOnChange(List<String> changedList) {
		// log.debug("doOnChange() start");
		writeLog(changedList);
		changedList.clear(); // ????? ????? ????? ??????????
		originalList = new ArrayList<String>(currentList); // ???? ????? ??.(?? ???? ??)
		cnt++;

		// log.debug("doOnChange() end");
	}

	/**
	 * <p>
	 * ?????????? ???
	 * </p>
	 **/
	protected void checkAndConfigure() {
		// log.debug("checkAndConfigure start");
		try {
			currentList.clear();
			file = new File(filename);
			// ????ArrayList???????
			File[] fList = file.listFiles();
			// 2017.03.06 ????????ES)-Null Pointer ?????CWE-476]
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

			Map<String, String> originalMap = new HashMap<>();
			Map<String, String> currentMap = new HashMap<>();

			for (String str : originalList) {
				int idx = str.indexOf("$");
				if (idx != -1) {
					originalMap.put(str.substring(0, idx), str);
				}
			}
			for (String str : currentList) {
				int idx = str.indexOf("$");
				if (idx != -1) {
					currentMap.put(str.substring(0, idx), str);
				}
			}

			// ???????? ?????? ????????. ???????????
			for (String str1 : originalList) {
				int idx = str1.indexOf("$");
				String key = (idx != -1) ? str1.substring(0, idx) : str1;
				if (!currentMap.containsKey(key)) {
					changedList.add("DEL$" + str1);
				}
			}

			// ????? ??? ????? ????????.(??????????????????
			for (String str1 : currentList) {
				int idx = str1.indexOf("$");
				String key = (idx != -1) ? str1.substring(0, idx) : str1;
				String originalStr = originalMap.get(key);

				if (originalStr == null) {
					changedList.add("NEW$" + str1);
					// totalChangedList.add("NEW$"+currentList.get(i));
				} else {
					if (!str1.equals(originalStr)) {
						changedList.add("MODI$" + str1);
						// totalChangedList.add("MODI$"+currentList.get(i));
					}
				}
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
	 * ??????????????????? ???????
	 * </p>
	 **/
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

		// 2022.11.11 ????????
		this.interrupt();
	}

	/**
	 * <pre>
	 * Comment : ??(???)????????????.(??????java.util.Locale.KOREA ?)
	 * </pre>
	 * 
	 * @param File f ??????????????
	 * @return String result ??????????????.
	 **/
	public static String getLastModifiedTime(File f) {
		long date = f.lastModified();
		java.text.SimpleDateFormat dateFormat = new java.text.SimpleDateFormat("yyyyMMdd:HH:mm:ss",
				java.util.Locale.KOREA);
		return dateFormat.format(new java.util.Date(date));
	}

	/**
	 * <pre>
	 * Comment : ??(???)?? ??????.
	 * </pre>
	 *
	 * @param List<String> logList ?????? ???
	 * @return boolean result ?? ????
	 **/
	public boolean writeLog(List<String> logList) {
		boolean result = false;

		try (FileWriter fWriter = new FileWriter(logFile, true);
				BufferedWriter bWriter = new BufferedWriter(fWriter)) {

			for (String logStr : logList) {
				try (BufferedReader br = new BufferedReader(new StringReader(logStr))) {
					String line = br.readLine();
					while (line != null) {
						if (line.length() <= MAX_STR_LEN) {
							bWriter.write(line);
							bWriter.write("\n");
						}
						line = br.readLine();
					}
				}
			}
			result = true;
		} catch (IOException e) {
			throw new RuntimeException("File IO exception", e);
		}

		return result;
	}

	/**
	 * <pre>
	 * Comment : ??(???)?? ??????.
	 * </pre>
	 * 
	 * @param String logStr ??????(????)
	 * @return boolean result ?? ????
	 **/
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
	 * Comment : ?????????????. ???????????????????????????????.
	 * </pre>
	 * 
	 * @return boolean isEnd ????? ????true ?, ?????false ?
	 **/
	public boolean isEnd() {
		// log.debug("isEnd start");
		boolean isEnd = false;
		String lastStr = "";

		try (FileReader fr = new FileReader(logFile); BufferedReader br = new BufferedReader(fr);) {
			if (logFile.exists()) {
				// ?????????????? END ????????

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
				// ???????? ??????????????.
				isEnd = true;
			}
		} catch (IOException e) {
			throw new RuntimeException("File IO exception", e);
		}
		return isEnd;
	}
}
