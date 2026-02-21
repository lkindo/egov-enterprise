/**
 *  Class Name : EgovFileScrty.java
 *  Description : Base64???????????????? ????????Business Interface class
 *  Modification Information
 *
 *     ????        ????                  ????
 *   -------    --------    ---------------------------
 *   2009.02.04    ???         ????
 *
 *  @author ????????? ???
 *  @since 2009. 02. 04
 *  @version 1.0
 *  @see
 *
 *  Copyright (C) 2009 by MOPAS  All right reserved.
 **/
package egovframework.com.utl.sim.service;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.security.MessageDigest;

import org.apache.commons.codec.binary.Base64;
import org.apache.commons.io.FilenameUtils;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovResourceCloseHelper;

/**
 * @Class Name : EgovFileScrty.java
 * @Description : ??? ???????????????? ? ?????
 * @Modification Information
 *
 *    ????                ????             ????
 *    ----------    -------     -------------------
 *    2019.11.29	???	encryptPassword(String data) ????: KISA ?? ??(????????? ? ??????????????
 *    2022.11.16	???       ????????
 *
 * @author ?????? ????
 * @since 2009.08.26
 * @version 1.0
 **/
public class EgovFileScrty {

	private static final String STORE_FILE_PATH = EgovProperties.getProperty("Globals.fileStorePath");
    // ??????
    static final char FILE_SEPARATOR = File.separatorChar;

    static final int BUFFER_SIZE = 1024;

    /**
     * ????????????
     *
     * @param String source ???????
     * @param String target ??? ???
     * @return boolean result ???? True False   
     * @exception Exception
     */
    public static boolean encryptFile(String source, String target) throws Exception {

		// ???????
		boolean result = false;

		File srcFile = new File(EgovWebUtil.filePathBlackList(STORE_FILE_PATH + FilenameUtils.getName(source)));

		BufferedInputStream input = null;
		BufferedOutputStream output = null;

		byte[] buffer = new byte[BUFFER_SIZE];

		try {
		    if (srcFile.exists() && srcFile.isFile()) {

				input = new BufferedInputStream(new FileInputStream(srcFile));
				output = new BufferedOutputStream(new FileOutputStream(EgovWebUtil.filePathBlackList(STORE_FILE_PATH + FilenameUtils.getName(target))));

				int length = 0;
				while ((length = input.read(buffer)) >= 0) {
					byte[] data = new byte[length];
					System.arraycopy(buffer, 0, data, 0, length);
					output.write(encodeBinary(data).getBytes());
					output.write(System.getProperty("line.separator").getBytes());
				}
				result = true;
			}
		} finally {
			EgovResourceCloseHelper.close(input, output);
		}

		return result;
    }

    /**
     * ???????????
     *
     * @param String source ??????
     * @param String target ?? ???
     * @return boolean result ??? True False   
     * @exception Exception
     */
    public static boolean decryptFile(String source, String target) throws Exception {

		// ??????
		boolean result = false;

		File srcFile = new File(EgovWebUtil.filePathBlackList(STORE_FILE_PATH + FilenameUtils.getName(source)));

		BufferedReader input = null;
		BufferedOutputStream output = null;

		//byte[] buffer = new byte[BUFFER_SIZE];
		String line = null;

		try {
		    if (srcFile.exists() && srcFile.isFile()) {

			input = new BufferedReader(new InputStreamReader(new FileInputStream(srcFile)));
			output = new BufferedOutputStream(new FileOutputStream(EgovWebUtil.filePathBlackList(STORE_FILE_PATH + FilenameUtils.getName(target))));

			while ((line = input.readLine()) != null) {
			    byte[] data = line.getBytes();
			    output.write(decodeBinary(new String(data)));
			}

			result = true;
		    }
		} finally {
			EgovResourceCloseHelper.close(input, output);
		}

		return result;
    }

    /**
     * ??? ???????
     *
     * @param byte[] data ???????
     * @return String result ??? ???
     * @exception Exception
     **/
    public static String encodeBinary(byte[] data) throws Exception {
		if (data == null) {
		    return "";
		}

		return new String(Base64.encodeBase64(data));
    }

    /**
     * ??? ???????
     *
     * @param String data ???????
     * @return String result ??? ???
     * @exception Exception
     **/
    @Deprecated
    public static String encode(String data) throws Exception {
    	return encodeBinary(data.getBytes());
    }

    /**
     * ??? ??????
     *
     * @param String data ??????
     * @return String result ?? ???
     * @exception Exception
     **/
    public static byte[] decodeBinary(String data) throws Exception {
    	return Base64.decodeBase64(data.getBytes());
    }

    /**
     * ??? ??????
     *
     * @param String data ??????
     * @return String result ?? ???
     * @exception Exception
     **/
    @Deprecated
    public static String decode(String data) throws Exception {
    	return new String(decodeBinary(data));
    }

    /**
     * ??????????????? ?? ???SHA-256 ??????)
     *
     * @param password ??? ?????
     * @param id salt???????????ID ??
     * @return
     * @throws Exception
     **/
    public static String encryptPassword(String password, String id) throws Exception {

		if ((password == null) || (id == null))
		 {
			return ""; // KISA ?? ??(2018-12-11, ???
		}

		byte[] hashValue = null; // ???

		MessageDigest md = MessageDigest.getInstance("SHA-256");

		md.reset();
		md.update(id.getBytes());

		hashValue = md.digest(password.getBytes());

		return new String(Base64.encodeBase64(hashValue));
    }

    /**
     * ??????????????? ?? ???SHA-256 ??????)
     * @param data ?????????
     * @param salt Salt
     * @return ??? ?????
     * @throws Exception
     **/
    public static String encryptPassword(String data, byte[] salt) throws Exception {

		if (data == null) {
		    return "";
		}

		byte[] hashValue = null; // ???

		MessageDigest md = MessageDigest.getInstance("SHA-256");

		md.reset();
		md.update(salt);

		hashValue = md.digest(data.getBytes());

		return new String(Base64.encodeBase64(hashValue));
    }

    /**
     * ???????? ????? ?salt ?????????).
     *
     * @param data ???????
     * @param encoded ??????????(Base64 ???
     * @return
     * @throws Exception
     **/
    public static boolean checkPassword(String data, String encoded, byte[] salt) throws Exception {
    	byte[] hashValue = null; // ???

    	MessageDigest md = MessageDigest.getInstance("SHA-256");

    	md.reset();
    	md.update(salt);
    	hashValue = md.digest(data.getBytes());

    	return MessageDigest.isEqual(hashValue, Base64.decodeBase64(encoded.getBytes()));
    }

}
