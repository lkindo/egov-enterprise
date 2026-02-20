/**
 *  Class Name : EgovPdfCnvr.java
 *  Description : xls,doc,ppt瑜?Pdf濡?蹂?섑븯???붾㈃ Business Interface class
 *  Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *   -------    --------    ---------------------------
 *   2009.02.02    ????         理쒖큹 ?앹꽦
 *   2017.03.03          議곗꽦??	    ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *
 *  @author 怨듯넻 ?쒕퉬??媛쒕컻? ????
 *  @since 2009. 02. 02
 *  @version 1.0
 *  @see
 * The type com.sun.star.lang.XeventListener cannot be resolved. It is indirectly referenced from required .class files
 *  Copyright (C) 2009 by EGOV  All right reserved.
 */

package egovframework.com.utl.sim.service;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Iterator;

import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.util.WebUtils;

import com.artofsolving.jodconverter.DocumentConverter;
import com.artofsolving.jodconverter.openoffice.connection.SocketOpenOfficeConnection;
import com.artofsolving.jodconverter.openoffice.converter.OpenOfficeDocumentConverter;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovBasicLogger;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class EgovPdfCnvr {
	public static String addrIP = "";
	static final char FILE_SEPARATOR = File.separatorChar;
	// 理쒕? 臾몄옄湲몄씠
	static final int MAX_STR_LEN = 1024;
	public static final int BUFF_SIZE = 2048;
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovPdfCnvr.class);
	private static final String STORE_FILE_PATH = EgovProperties.getProperty("Globals.fileStorePath");

	/**
	 * <pre>
	 * Comment : doc, xls ?뚯씪?깆쓣 PDF蹂??蹂?섑븳??
	 * </pre>
	 * @param String pdfFileSrc        doc, xls ?뚯씪 ?꾩껜寃쎈줈
	 * @param String targetPdf         蹂?섑뙆?쇰챸(?뺤옣???쒖쇅)
	 * @return boolean  status         true/false 瑜?由ы꽩?쒕떎.
	 * @version 1.0 (2009.02.10)
	 * @see
	 */
	public static boolean getPDF(String targetPdf, HttpServletRequest request, HttpServletResponse response) throws Exception {
		boolean status = false;

		try {
			MultipartHttpServletRequest mptRequest = WebUtils.getNativeRequest(request,MultipartHttpServletRequest.class);

			// 2022.01 Possible null pointer dereference due to return value of called method 議곗튂
			if(mptRequest!= null) {
				Iterator<String> file_iter = mptRequest.getFileNames();

				while (file_iter.hasNext()) {

					MultipartFile mFile = mptRequest.getFile(file_iter.next());

					// 2022.11.11 源?쒖? ?쒗걧?댁퐫??泥섎━
					if (mFile == null) {
						continue;
					}

					String newName = "";

					//newName ? Naming Convention???섑빐???앹꽦
					newName = EgovStringUtil.getTimeStamp();
					writeFile(mFile, newName);

					File inputFile = new File(EgovWebUtil.filePathBlackList(STORE_FILE_PATH + FilenameUtils.getName(newName)));

					if (inputFile.exists()) {

						// connect to an OpenOffice.org instance running on port 8100
						SocketOpenOfficeConnection connection = new SocketOpenOfficeConnection(8100);
						connection.connect();
						//?먮낯 ?붾젆?좊━??targetPdf 紐낆묶吏??
						String valueFile = null;
						//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
						valueFile = EgovStringUtil.isNullToString(inputFile.getParent()).replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR);
						File outputFile = new File(valueFile + "/" + targetPdf + ".pdf");
						// convert
						DocumentConverter converter = new OpenOfficeDocumentConverter(connection);
						converter.convert(inputFile, outputFile);
						// close the connection
						connection.disconnect();

						if (inputFile.exists()) {
							//3. ??젣?댁쨳?덈떎.
							status = inputFile.delete();
						}

						status = true;

					} else {
						status = false;
					}

				}

			}
		} catch (IOException ex) {
			EgovBasicLogger.debug("PDF converting error", ex);
			status = false;
		}

		// 硫붿냼??醫낅즺 Log
		return status;
	}

	/**
	 * ?뚯씪???ㅼ젣 臾쇰━?곸씤 寃쎈줈???앹꽦?쒕떎.
	 * @param file
	 * @param newName
	 * @param stordFilePath
	 * @throws Exception
	 */
	protected static void writeFile(MultipartFile file, String newName) throws IOException {
		InputStream stream = null;
		OutputStream bos = null;

		try {

			stream = file.getInputStream();
			File cFile = new File(EgovWebUtil.filePathBlackList(STORE_FILE_PATH));

			if (!cFile.isDirectory()) {
				// 2017.03.03 議곗꽦???쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
				if (cFile.mkdirs()) {
					LOGGER.debug("[file.mkdirs] targetDir : Directory Creation Success");
				} else {
					LOGGER.error("[file.mkdirs] targetDir : Directory Creation Fail");
				}
			}

			bos = new FileOutputStream(EgovWebUtil.filePathBlackList(STORE_FILE_PATH + File.separator + FilenameUtils.getName(newName)));

			int bytesRead = 0;
			byte[] buffer = new byte[BUFF_SIZE];
			while ((bytesRead = stream.read(buffer, 0, BUFF_SIZE)) != -1) {
				bos.write(buffer, 0, bytesRead);
			}

		} finally {
			EgovResourceCloseHelper.close(bos, stream);
		}
	}
}