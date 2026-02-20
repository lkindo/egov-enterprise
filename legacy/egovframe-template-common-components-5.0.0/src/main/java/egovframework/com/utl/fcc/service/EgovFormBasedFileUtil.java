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
 * Form-based File Upload ?좏떥由ы떚
 * 
 * @author 怨듯넻而댄룷?뚰듃 媛쒕컻? ?쒖꽦怨?
 * @since 2009.08.26
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.08.26  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *   2017.03.03  議곗꽦??         ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2019.12.09  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (?꾪뿕???뺤떇 ?뚯씪 ?낅줈?? : uploadFiles ??젣  => EgovFileUploadUtil.uploadFilesExt(?뺤옣??湲곕줉) ?泥?
 *   2023.06.27  源?쒖?          NSR 蹂댁븞議곗튂 (CKEditor ?대?吏 蹂닿린 湲곕뒫???ㅽ겕由쏀듃 ?ㅽ뻾 痍⑥빟??
 *   2025.09.01  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *   2025.09.01  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AssignmentInOperand(?쇱뿰?곗옄?댁뿉 ?좊떦臾몄씠 ?ъ슜?? ?대떦 肄붾뱶瑜?蹂듭옟?섍퀬 媛?낆꽦???⑥뼱吏寃?留뚮벉)
 *   2025.09.01  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(?섍꺼諛쏅뒗 硫붿냼??parameter 媛믪쓣 吏곸젒 蹂寃쏀븯??肄붾뱶 ?먯?)
 *
 *      </pre>
 */
public class EgovFormBasedFileUtil {
	/** Buffer size */
	public static final int BUFFER_SIZE = 8192;

	public static final String SEPERATOR = File.separator;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovFormBasedFileUtil.class);

	/**
	 * ?ㅻ뒛 ?좎쭨 臾몄옄??痍⑤뱷. ex) 20090101
	 * 
	 * @return
	 */
	public static String getTodayString() {
		SimpleDateFormat format = new SimpleDateFormat("yyyyMMdd", Locale.getDefault());

		return format.format(new Date());
	}

	/**
	 * 臾쇰━???뚯씪紐??앹꽦.
	 * 
	 * @return
	 */
	public static String getPhysicalFileName() {
		return EgovFormBasedUUID.randomUUID().toString().replaceAll("-", "").toUpperCase();
	}

	/**
	 * ?뚯씪紐?蹂??
	 * 
	 * @param filename String
	 * @return
	 * @throws Exception
	 */
	protected static String convert(String filename) throws Exception {
		// return java.net.URLEncoder.encode(filename, "utf-8");
		return filename;
	}

	/**
	 * Stream?쇰줈遺???뚯씪????ν븿.
	 * 
	 * @param is   InputStream
	 * @param file File
	 * @throws IOException
	 */
	public static long saveFile(InputStream is, File file) throws IOException {
		// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		if (file.getParentFile() == null) {
			LOGGER.debug("file.getParentFile() is null");
			throw new RuntimeException("file.getParentFile() is null");
		}

		// ?붾젆?좊━ ?앹꽦
		if (!file.getParentFile().exists()) {
			// 2017.03.03 議곗꽦???쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			if (file.getParentFile().mkdirs()) {
				LOGGER.debug("[file.mkdirs] file : Directory Creation Success");
			} else {
				LOGGER.error("[file.mkdirs] file : Directory Creation Fail");
			}
		}

		return FileCopyUtils.copy(is, new FileOutputStream(file));
	}

	/**
	 * ?뚯씪??Upload 泥섎━?쒕떎. (??젣) EgovFileUploadUtil.uploadFilesExt(?뺤옣???뺤씤) ?泥?
	 *
	 * @param request
	 * @param where
	 * @param maxFileSize
	 * @return
	 * @throws Exception
	 */
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
	 * ?뚯씪??Download 泥섎━?쒕떎.
	 *
	 * @param response
	 * @param where
	 * @param serverSubPath
	 * @param physicalName
	 * @param original
	 * @throws Exception
	 */
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
	 * ?대?吏?????誘몃━蹂닿린 湲곕뒫???쒓났?쒕떎.
	 *
	 * mimeType??寃쎌슦??JSP ?곸뿉???ㅼ쓬怨?媛숈씠 ?살쓣 ???덈떎.
	 * getServletConfig().getServletContext().getMimeType(name);
	 *
	 * @param response
	 * @param where
	 * @param serverSubPath
	 * @param physicalName
	 * @param mimeType
	 * @throws Exception
	 */
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
						response.setContentType(matchMimeType); // 吏?뺣맂 媛믪씠誘濡??덉쟾
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
