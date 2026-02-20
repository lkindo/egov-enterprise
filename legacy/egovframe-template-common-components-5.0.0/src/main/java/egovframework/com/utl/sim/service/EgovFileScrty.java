/**
 *  Class Name : EgovFileScrty.java
 *  Description : Base64?몄퐫???붿퐫??諛⑹떇???댁슜???곗씠?곕? ?뷀샇??蹂듯샇?뷀븯??Business Interface class
 *  Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *   -------    --------    ---------------------------
 *   2009.02.04    諛뺤???         理쒖큹 ?앹꽦
 *
 *  @author 怨듯넻 ?쒕퉬??媛쒕컻? 諛뺤???
 *  @since 2009. 02. 04
 *  @version 1.0
 *  @see
 *
 *  Copyright (C) 2009 by MOPAS  All right reserved.
 */
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
 * @Description : ?뚯씪 諛??띿뒪??臾몄옄???뷀샇??泥섎━?섎뒗 援ы쁽 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??                ?섏젙??             ?섏젙?댁슜
 *    ----------    -------     -------------------
 *    2019.11.29	?좎슜??	encryptPassword(String data) ??젣 : KISA 蹂댁븞?쎌젏 議곗튂 (鍮꾨?踰덊샇 ?댁떆?⑥닔 ?곸슜 ???뷀듃瑜??ъ슜?섏뿬????
 *    2022.11.16	?좎슜??       ?뚯뒪肄붾뱶 蹂댁븞 議곗튂
 *
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.08.26
 * @version 1.0
 */
public class EgovFileScrty {

	private static final String STORE_FILE_PATH = EgovProperties.getProperty("Globals.fileStorePath");
    // ?뚯씪援щ텇??
    static final char FILE_SEPARATOR = File.separatorChar;

    static final int BUFFER_SIZE = 1024;

    /**
     * ?뚯씪???뷀샇?뷀븯??湲곕뒫
     *
     * @param String source ?뷀샇?뷀븷 ?뚯씪
     * @param String target ?뷀샇?붾맂 ?뚯씪
     * @return boolean result ?뷀샇?붿뿬遺 True/False
     * @exception Exception
     */
    public static boolean encryptFile(String source, String target) throws Exception {

		// ?뷀샇???щ?
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
     * ?뚯씪??蹂듯샇?뷀븯??湲곕뒫
     *
     * @param String source 蹂듯샇?뷀븷 ?뚯씪
     * @param String target 蹂듯샇?붾맂 ?뚯씪
     * @return boolean result 蹂듯샇?붿뿬遺 True/False
     * @exception Exception
     */
    public static boolean decryptFile(String source, String target) throws Exception {

		// 蹂듯샇???щ?
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
     * ?곗씠?곕? ?뷀샇?뷀븯??湲곕뒫
     *
     * @param byte[] data ?뷀샇?뷀븷 ?곗씠??
     * @return String result ?뷀샇?붾맂 ?곗씠??
     * @exception Exception
     */
    public static String encodeBinary(byte[] data) throws Exception {
		if (data == null) {
		    return "";
		}

		return new String(Base64.encodeBase64(data));
    }

    /**
     * ?곗씠?곕? ?뷀샇?뷀븯??湲곕뒫
     *
     * @param String data ?뷀샇?뷀븷 ?곗씠??
     * @return String result ?뷀샇?붾맂 ?곗씠??
     * @exception Exception
     */
    @Deprecated
    public static String encode(String data) throws Exception {
    	return encodeBinary(data.getBytes());
    }

    /**
     * ?곗씠?곕? 蹂듯샇?뷀븯??湲곕뒫
     *
     * @param String data 蹂듯샇?뷀븷 ?곗씠??
     * @return String result 蹂듯샇?붾맂 ?곗씠??
     * @exception Exception
     */
    public static byte[] decodeBinary(String data) throws Exception {
    	return Base64.decodeBase64(data.getBytes());
    }

    /**
     * ?곗씠?곕? 蹂듯샇?뷀븯??湲곕뒫
     *
     * @param String data 蹂듯샇?뷀븷 ?곗씠??
     * @return String result 蹂듯샇?붾맂 ?곗씠??
     * @exception Exception
     */
    @Deprecated
    public static String decode(String data) throws Exception {
    	return new String(decodeBinary(data));
    }

    /**
     * 鍮꾨?踰덊샇瑜??뷀샇?뷀븯??湲곕뒫(蹂듯샇?붽? ?섎㈃ ?덈릺誘濡?SHA-256 ?몄퐫??諛⑹떇 ?곸슜)
     *
     * @param password ?뷀샇?붾맆 ?⑥뒪?뚮뱶
     * @param id salt濡??ъ슜???ъ슜??ID 吏??
     * @return
     * @throws Exception
     */
    public static String encryptPassword(String password, String id) throws Exception {

		if ((password == null) || (id == null))
		 {
			return ""; // KISA 蹂댁븞?쎌젏 議곗튂 (2018-12-11, ?좎슜??
		}

		byte[] hashValue = null; // ?댁돩媛?

		MessageDigest md = MessageDigest.getInstance("SHA-256");

		md.reset();
		md.update(id.getBytes());

		hashValue = md.digest(password.getBytes());

		return new String(Base64.encodeBase64(hashValue));
    }

    /**
     * 鍮꾨?踰덊샇瑜??뷀샇?뷀븯??湲곕뒫(蹂듯샇?붽? ?섎㈃ ?덈릺誘濡?SHA-256 ?몄퐫??諛⑹떇 ?곸슜)
     * @param data ?뷀샇?뷀븷 鍮꾨?踰덊샇
     * @param salt Salt
     * @return ?뷀샇?붾맂 鍮꾨?踰덊샇
     * @throws Exception
     */
    public static String encryptPassword(String data, byte[] salt) throws Exception {

		if (data == null) {
		    return "";
		}

		byte[] hashValue = null; // ?댁돩媛?

		MessageDigest md = MessageDigest.getInstance("SHA-256");

		md.reset();
		md.update(salt);

		hashValue = md.digest(data.getBytes());

		return new String(Base64.encodeBase64(hashValue));
    }

    /**
     * 鍮꾨?踰덊샇瑜??뷀샇?붾맂 ?⑥뒪?뚮뱶 寃利?salt媛 ?ъ슜??寃쎌슦留??곸슜).
     *
     * @param data ???⑥뒪?뚮뱶
     * @param encoded ?댁돩泥섎━???⑥뒪?뚮뱶(Base64 ?몄퐫??
     * @return
     * @throws Exception
     */
    public static boolean checkPassword(String data, String encoded, byte[] salt) throws Exception {
    	byte[] hashValue = null; // ?댁돩媛?

    	MessageDigest md = MessageDigest.getInstance("SHA-256");

    	md.reset();
    	md.update(salt);
    	hashValue = md.digest(data.getBytes());

    	return MessageDigest.isEqual(hashValue, Base64.decodeBase64(encoded.getBytes()));
    }

}