package egovframework.com.utl.fcc.service;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.FileCopyUtils;

import egovframework.com.cmm.EgovWebUtil;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Form-based File Upload ??
 * 
 * @author ???? ?? ????
 * @since 2009.08.26
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.08.26  ????         ????
 *   2017.03.03  ??         ??????ES)-?????? ??CWE-253, CWE-440, CWE-754]
 *   2019.12.09  ???         KISA ?? ??(???? ??? ???? : uploadFiles ???? => EgovFileUploadUtil.uploadFilesExt(???? ???
 *   2023.06.27  ???          NSR ? (CKEditor ??? ???????????? ???
 *   2025.09.01  ????         2025????????PMD???????? ????????-CloseResource(?????? ??)
 *   2025.09.01  ????         2025????????PMD???????? ????????-AssignmentInOperand(????? ????????? ??????????????????
 *   2025.09.01  ????         2025????????PMD???????? ????????-AvoidReassigningParameters(???????parameter ????????????)
 *
 *      </pre>
 **/
public class EgovFormBasedFileUtil {
	/** Buffer size **/
	public static final int BUFFER_SIZE = 8192;

	public static final String SEPERATOR = File.separator;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovFormBasedFileUtil.class);

	/**
	 * ?? ?? ?????? ex) 20090101
	 * 
	 * @return
	 **/
	public static String getTodayString() {
		SimpleDateFormat format = new SimpleDateFormat("yyyyMMdd", Locale.getDefault());

		return format.format(new Date());
	}

	/**
	 * ??????????.
	 * 
	 * @return
	 **/
	public static String getPhysicalFileName() {
		return EgovFormBasedUUID.randomUUID().toString().replaceAll("-", "").toUpperCase();
	}

	/**
	 * ??????
	 * 
	 * @param filename String
	 * @return
	 * @throws Exception
	 **/
	protected static String convert(String filename) throws Exception {
		// return java.net.URLEncoder.encode(filename, "utf-8");
		return filename;
	}

	/**
	 * Stream??????????????
	 * 
	 * @param is   InputStream
	 * @param file File
	 * @throws IOException
	 **/
	public static long saveFile(InputStream is, File file) throws IOException {
		// KISA ?? ??(2018-10-29, ????
		if (file.getParentFile() == null) {
			LOGGER.debug("file.getParentFile() is null");
			throw new RuntimeException("file.getParentFile() is null");
		}

		// ?? ??
		if (!file.getParentFile().exists()) {
			// 2017.03.03 ????????ES)-?????? ??CWE-253, CWE-440, CWE-754]
			if (file.getParentFile().mkdirs()) {
				LOGGER.debug("[file.mkdirs] file : Directory Creation Success");
			} else {
				LOGGER.error("[file.mkdirs] file : Directory Creation Fail");
			}
		}

		return FileCopyUtils.copy(is, new FileOutputStream(file));
	}

	/**
	 * ?????Upload ???. (???? EgovFileUploadUtil.uploadFilesExt(????) ???
	 *
	 * @param request
	 * @param where
	 * @param maxFileSize
	 * @return
	 * @throws Exception
	 **/
	/*
	 * public static List<EgovFormBasedFileVo> uploadFiles(HttpServletRequest
	 * request, String where, long maxFileSize) throws Exception {
	 * List<EgovFormBasedFileVo> list = new ArrayList<EgovFormBasedFileVo>();
	 * 
	 * // Check that we have a file upload request boolean isMultipart =
	 * ServletFileUpload.isMultipartContent(request);
	 * 
	 * if (isMultipart) { // Create a new file upload handler ServletFileUpload
	 * upload = new ServletFileUpload(); upload.setFileSizeMax(maxFileSize); //
	 * SizeLimitExceededException
	 * 
	 * // Parse the request FileItemIterator iter = upload.getItemIterator(request);
	 * while (iter.hasNext()) { FileItemStream item = iter.next(); String name =
	 * item.getFieldName(); InputStream stream = item.openStream(); if
	 * (item.isFormField()) {
	 * LOGGER.info("Form field '{}' with value '{}' detected.", name,
	 * Streams.asString(stream)); } else {
	 * LOGGER.info("File field '{}' with file name '{}' detected.", name,
	 * item.getName());
	 * 
	 * if ("".equals(item.getName())) { continue; }
	 * 
	 * // Process the input stream EgovFormBasedFileVo vo = new
	 * EgovFormBasedFileVo();
	 * 
	 * String tmp = item.getName();
	 * 
	 * if (tmp.lastIndexOf("\\") >= 0) { tmp = tmp.substring(tmp.lastIndexOf("\\") +
	 * 1); }
	 * 
	 * vo.setFileName(tmp); vo.setContentType(item.getContentType());
	 * vo.setServerSubPath(getTodayString());
	 * vo.setPhysicalName(getPhysicalFileName());
	 * 
	 * if (tmp.lastIndexOf(".") >= 0) { vo.setPhysicalName(vo.getPhysicalName() +
	 * tmp.substring(tmp.lastIndexOf("."))); }
	 * 
	 * long size = saveFile(stream, new File(EgovWebUtil.filePathBlackList(where) +
	 * SEPERATOR + vo.getServerSubPath() + SEPERATOR + vo.getPhysicalName()));
	 * 
	 * vo.setSize(size);
	 * 
	 * list.add(vo); } } } else { throw new
	 * IOException("form's 'enctype' attribute have to be 'multipart/form-data'"); }
	 * 
	 * return list; }
	 */

	/**
	 * ?????Download ???.
	 *
	 * @param response
	 * @param where
	 * @param serverSubPath
	 * @param physicalName
	 * @param original
	 * @throws Exception
	 **/
	public static void downloadFile(HttpServletResponse response, String where, String serverSubPath,
			String physicalName, String original) throws Exception {
		String downFileName = where + SEPERATOR + serverSubPath + SEPERATOR + physicalName;

		File file = new File(EgovWebUtil.filePathBlackList(downFileName));

		if (!file.exists()) {
			throw new FileNotFoundException(downFileName);
		}

		if (!file.isFile()) {
			throw new FileNotFoundException(downFileName);
		}

		String original2 = original.replaceAll("\r", "").replaceAll("\n", "");
		response.setContentType("application/octet-stream");
		response.setHeader("Content-Disposition", "attachment; filename=\"" + convert(original2) + "\";");
		response.setHeader("Content-Transfer-Encoding", "binary");
		response.setHeader("Pragma", "no-cache");
		response.setHeader("Expires", "0");

		FileCopyUtils.copy(new FileInputStream(file), response.getOutputStream());
	}

	/**
	 * ??????????? ???????.
	 *
	 * mimeType?????JSP ??????????? ????.
	 * getServletConfig().getServletContext().getMimeType(name);
	 *
	 * @param response
	 * @param where
	 * @param serverSubPath
	 * @param physicalName
	 * @param mimeType
	 * @throws Exception
	 **/
	public static void viewFile(HttpServletResponse response, String where, String serverSubPath, String physicalName,
			String mimeTypeParam) throws Exception {
		String mimeType = mimeTypeParam;
		String downFileName = where + SEPERATOR + serverSubPath + SEPERATOR + physicalName + "_upfile";

		File file = new File(EgovWebUtil.filePathBlackList(downFileName));

		if (!file.exists()) {
			throw new FileNotFoundException(downFileName);
		}

		if (!file.isFile()) {
			throw new FileNotFoundException(downFileName);
		}

		if (mimeType == null) {
			mimeType = "application/octet-stream;";
		}

		response.setContentType(EgovWebUtil.removeCRLF(mimeType));

		boolean contentTypeFlag = false;
		if (mimeType != null) {
			Map<String, String> contentTypeWL = getContentTypeWL();
			if (contentTypeWL != null) {
				for (String ext : contentTypeWL.keySet()) {
					String matchMimeType = contentTypeWL.get(ext);
					if (matchMimeType.equals(mimeType)) {
						response.setContentType(matchMimeType); // ? ??????
						contentTypeFlag = true;
						break;
					}
				}
			}
		}
		if (!contentTypeFlag) {
			response.setContentType("application/octet-stream;");
		}

		response.setHeader("Content-Disposition", "filename=image;");

		FileCopyUtils.copy(new FileInputStream(file), response.getOutputStream());
	}

	public static Map<String, String> getContentTypeWL() {
		Map<String, String> contentTypeWL = new HashMap<>();

		contentTypeWL.put("gif", "image/gif");
		contentTypeWL.put("jpg", "image/jpg");
		contentTypeWL.put("jpeg", "image/jpeg");
		contentTypeWL.put("png", "image/png");

		return contentTypeWL;
	}
}
