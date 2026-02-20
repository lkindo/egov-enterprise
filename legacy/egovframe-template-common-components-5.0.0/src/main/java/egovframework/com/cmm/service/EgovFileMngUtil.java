package egovframework.com.cmm.service;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Map.Entry;

import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang.StringUtils;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.multipart.MultipartFile;

import egovframework.com.cmm.EgovWebUtil;

/**
 * ?뚯씪 愿由??좏떥由ы떚
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 02. 13
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.02.13  ?댁궪??         理쒖큹 ?앹꽦
 *   2011.08.09  ?쒖???         utl.fcc?⑦궎吏? Dependency?쒓굅瑜??꾪빐 getTimeStamp()硫붿꽌??異붽?
 *   2017.03.03  議곗꽦??         ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2020.10.26  ?좎슜??         parseFileInf(List<MultipartFile> files ...) 異붽?
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2024.12.04  ?좎슜??         downFile() KISA ?쒗걧?댁퐫??泥섎━
 *   2025.05.26  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(怨듭떇 留ㅺ컻蹂??紐낅챸 洹쒖튃), CloseResource(由ъ냼???リ린), LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃), AssignmentInOperand(?쇱뿰?곗옄???좊떦)
 * 
 *      </pre>
 */
@Component("EgovFileMngUtil")
public class EgovFileMngUtil {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovFileMngUtil.class);
	private static final String FILE_STORE_PATH = EgovProperties.getProperty("Globals.fileStorePath");

	@Resource(name = "egovFileIdGnrService")
	private EgovIdGnrService idgenService;

	/**
	 * 泥⑤??뚯씪?????紐⑸줉 ?뺣낫瑜?痍⑤뱷?쒕떎.
	 *
	 * @param files
	 * @return
	 * @throws Exception
	 */
	public List<FileVO> parseFileInf(Map<String, MultipartFile> files, String keyStr, int fileKeyParam,
			String atchFileId, String storePath) throws Exception {
		int fileKey = fileKeyParam;

		String storePathString = "";
		String atchFileIdString = "";

		if (storePath == null || "".equals(storePath)) {
			storePathString = EgovProperties.getProperty("Globals.fileStorePath");
		} else {
			storePathString = EgovProperties.getProperty(storePath);
		}

		if (atchFileId == null || "".equals(atchFileId)) {
			atchFileIdString = idgenService.getNextStringId();
		} else {
			atchFileIdString = atchFileId;
		}

		File saveFolder = new File(EgovWebUtil.filePathBlackList(storePathString));

		if (!saveFolder.exists() || saveFolder.isFile()) {
			// 2017.03.03 議곗꽦???쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			if (saveFolder.mkdirs()) {
				LOGGER.debug("[file.mkdirs] saveFolder : Creation Success ");
			} else {
				LOGGER.error("[file.mkdirs] saveFolder : Creation Fail ");
			}
		}

		Iterator<Entry<String, MultipartFile>> itr = files.entrySet().iterator();
		MultipartFile file;
		List<FileVO> result = new ArrayList<FileVO>();
		FileVO fvo;

		while (itr.hasNext()) {
			Entry<String, MultipartFile> entry = itr.next();
			file = entry.getValue();
			String orginFileName = file.getOriginalFilename();
			if (StringUtils.isEmpty(orginFileName)) {
				continue;
			}

			// 2022.11.11 ?쒗걧?댁퐫??泥섎━
			String fileExt = FilenameUtils.getExtension(orginFileName).toUpperCase();
			String newName = keyStr + getTimeStamp() + fileKey;
			long size = file.getSize();
			String filePath = storePathString + File.separator + newName;
			file.transferTo(new File(EgovWebUtil.filePathBlackList(filePath)));

			fvo = new FileVO();
			fvo.setFileExtsn(fileExt);
			fvo.setFileStreCours(storePathString);
			fvo.setFileMg(Long.toString(size));
			fvo.setOrignlFileNm(orginFileName);
			fvo.setStreFileNm(newName);
			fvo.setAtchFileId(atchFileIdString);
			fvo.setFileSn(String.valueOf(fileKey));
			result.add(fvo);

			fileKey++;
		}

		return result;
	}

	/**
	 * 泥⑤??뚯씪?????紐⑸줉 ?뺣낫瑜?痍⑤뱷?쒕떎.
	 *
	 * @param files
	 * @return
	 * @throws Exception
	 */
	public List<FileVO> parseFileInf(List<MultipartFile> files, String keyStr, int fileKeyParam, String atchFileId,
			String storePath) throws Exception {
		int fileKey = fileKeyParam;

		String storePathString = "";
		String atchFileIdString = "";

		if (storePath == null || "".equals(storePath)) {
			storePathString = EgovProperties.getProperty("Globals.fileStorePath");
		} else {
			storePathString = EgovProperties.getProperty(storePath);
		}

		if (atchFileId == null || "".equals(atchFileId)) {
			atchFileIdString = idgenService.getNextStringId();
		} else {
			atchFileIdString = atchFileId;
		}

		File saveFolder = new File(EgovWebUtil.filePathBlackList(storePathString));

		if (!saveFolder.exists() || saveFolder.isFile()) {
			// 2017.03.03 議곗꽦???쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			if (saveFolder.mkdirs()) {
				LOGGER.debug("[file.mkdirs] saveFolder : Creation Success ");
			} else {
				LOGGER.error("[file.mkdirs] saveFolder : Creation Fail ");
			}
		}

		List<FileVO> result = new ArrayList<FileVO>();
		FileVO fvo;

		for (MultipartFile file : files) {

			String orginFileName = file.getOriginalFilename();
			if (StringUtils.isEmpty(orginFileName)) {
				continue;
			}

			// 2022.11.11 ?쒗걧?댁퐫??泥섎━
			String fileExt = FilenameUtils.getExtension(orginFileName).toUpperCase();
			String newName = keyStr + getTimeStamp() + fileKey;
			long size = file.getSize();
			String filePath = storePathString + File.separator + newName;
			file.transferTo(new File(EgovWebUtil.filePathBlackList(filePath)));

			fvo = new FileVO();
			fvo.setFileExtsn(fileExt);
			fvo.setFileStreCours(storePathString);
			fvo.setFileMg(Long.toString(size));
			fvo.setOrignlFileNm(orginFileName);
			fvo.setStreFileNm(newName);
			fvo.setAtchFileId(atchFileIdString);
			fvo.setFileSn(String.valueOf(fileKey));

			result.add(fvo);

			fileKey++;
		}

		return result;
	}

	/**
	 * 泥⑤??뚯씪???쒕쾭????ν븳??
	 *
	 * @param file
	 * @param newName
	 * @param stordFilePath
	 * @throws Exception
	 */
	protected void writeUploadedFile(MultipartFile file, String newName) throws Exception {
		File cFile = new File(FILE_STORE_PATH);

		if (!cFile.isDirectory()) {
			boolean flag = cFile.mkdir();
			if (!flag) {
				throw new IOException("Directory creation Failed ");
			}
		}

		String writeFilePath = EgovWebUtil
				.filePathBlackList(FILE_STORE_PATH + File.separator + FilenameUtils.getName(newName));

		try (InputStream stream = file.getInputStream(); OutputStream bos = new FileOutputStream(writeFilePath);) {
			FileCopyUtils.copy(stream, bos);
		}
	}

	/**
	 * ?쒕쾭???뚯씪???ㅼ슫濡쒕뱶?쒕떎.
	 *
	 * @param request
	 * @param response
	 * @throws Exception
	 */
	public static void downFile(HttpServletRequest request, HttpServletResponse response) throws Exception {

		String downFileName = "";
		String orgFileName = "";

		if ((String) request.getAttribute("downFile") == null) {
			downFileName = "";
		} else {
			downFileName = (String) request.getAttribute("downFile");
		}

		if ((String) request.getAttribute("orgFileName") == null) {
			orgFileName = "";
		} else {
			orgFileName = (String) request.getAttribute("orginFile");
		}

		orgFileName = orgFileName.replaceAll("\r", "").replaceAll("\n", "");

		File file = new File(EgovWebUtil.filePathBlackList(FILE_STORE_PATH + downFileName));
		// File file = new File(EgovWebUtil.filePathBlackList(downFileName,FILE_STORE_PATH));

		if (!file.exists()) {
			throw new FileNotFoundException(downFileName);
		}

		if (!file.isFile()) {
			throw new FileNotFoundException(downFileName);
		}

		response.setContentType("application/x-msdownload");
		response.setHeader("Content-Disposition:",
				"attachment; filename=" + new String(orgFileName.getBytes(), "UTF-8"));
		response.setHeader("Content-Transfer-Encoding", "binary");
		response.setHeader("Pragma", "no-cache");
		response.setHeader("Expires", "0");

		try (BufferedInputStream fin = new BufferedInputStream(new FileInputStream(file));
				BufferedOutputStream outs = new BufferedOutputStream(response.getOutputStream());) {
			FileCopyUtils.copy(fin, outs);
		}
	}

	/**
	 * 泥⑤?濡??깅줉???뚯씪???쒕쾭???낅줈?쒗븳??
	 *
	 * @param file
	 * @return
	 * @throws Exception
	 */
	public static HashMap<String, String> uploadFile(MultipartFile file) throws Exception {

		HashMap<String, String> map = new HashMap<String, String>();
		long size = file.getSize();
		String orginFileName = file.getOriginalFilename();
		String fileExt = "";
		String newName = "";
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (StringUtils.isNotEmpty(orginFileName)) {
			fileExt = FilenameUtils.getExtension(orginFileName);
		}

		// 2012.11 KISA 蹂댁븞議곗튂
		newName = getTimeStamp();
		writeFile(file, newName);
		map.put(Globals.ORIGIN_FILE_NM, orginFileName);
		map.put(Globals.UPLOAD_FILE_NM, newName);
		map.put(Globals.FILE_EXT, fileExt);
		map.put(Globals.FILE_PATH, FILE_STORE_PATH);
		map.put(Globals.FILE_SIZE, String.valueOf(size));

		return map;
	}

	/**
	 * ?뚯씪???ㅼ젣 臾쇰━?곸씤 寃쎈줈???앹꽦?쒕떎.
	 *
	 * @param file
	 * @param newName
	 * @param stordFilePath
	 * @throws Exception
	 */
	protected static void writeFile(MultipartFile file, String newName) throws Exception {
		File cFile = new File(EgovWebUtil.filePathBlackList(FILE_STORE_PATH));

		if (!cFile.isDirectory()) {
			// 2017.03.03 議곗꽦???쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			if (cFile.mkdirs()) {
				LOGGER.debug("[file.mkdirs] saveFolder : Creation Success ");
			} else {
				LOGGER.error("[file.mkdirs] saveFolder : Creation Fail ");
			}
		}

		try (InputStream stream = file.getInputStream();
				OutputStream bos = new FileOutputStream(EgovWebUtil
						.filePathBlackList(FILE_STORE_PATH + File.separator + FilenameUtils.getName(newName)));) {

			FileCopyUtils.copy(stream, bos);
		}
	}

	/**
	 * ?쒕쾭 ?뚯씪????섏뿬 ?ㅼ슫濡쒕뱶瑜?泥섎━?쒕떎.
	 *
	 * @param response
	 * @param streFileNm  ?뚯씪???뚯씪紐?
	 * @param orignFileNm
	 * @throws Exception
	 */
	public void downFile(HttpServletResponse response, String streFileNm, String orignFileNm) throws Exception {
		String downFilePath = EgovWebUtil.filePathBlackList(FILE_STORE_PATH + streFileNm);
		// String downFilePath =
		// EgovWebUtil.filePathBlackList(streFileNm,FILE_STORE_PATH);
		String orgFileName = orignFileNm;

		File file = new File(downFilePath);

		if (!file.exists()) {
			throw new FileNotFoundException(downFilePath);
		}

		if (!file.isFile()) {
			throw new FileNotFoundException(downFilePath);
		}

		int fSize = (int) file.length();
		if (fSize > 0) {
			try (BufferedInputStream in = new BufferedInputStream(new FileInputStream(file));) {
				String mimetype = "application/x-msdownload";

				// response.setBufferSize(fSize);
				response.setContentType(mimetype);
				response.setHeader("Content-Disposition:", "attachment; filename=" + orgFileName);
				response.setContentLength(fSize);
				// response.setHeader("Content-Transfer-Encoding","binary");
				// response.setHeader("Pragma","no-cache");
				// response.setHeader("Expires","0");
				FileCopyUtils.copy(in, response.getOutputStream());
			}
			response.getOutputStream().flush();
			response.getOutputStream().close();
		}

		/*
		 * String uploadPath = propertiesService.getString("fileDir");
		 * 
		 * File uFile = new File(uploadPath, requestedFile); int fSize = (int)
		 * uFile.length();
		 * 
		 * if (fSize > 0) { BufferedInputStream in = new BufferedInputStream(new
		 * FileInputStream(uFile));
		 * 
		 * String mimetype = "text/html";
		 * 
		 * //response.setBufferSize(fSize); response.setContentType(mimetype);
		 * response.setHeader("Content-Disposition", "attachment; filename=\"" +
		 * requestedFile + "\""); response.setContentLength(fSize);
		 * 
		 * FileCopyUtils.copy(in, response.getOutputStream()); in.close();
		 * response.getOutputStream().flush(); response.getOutputStream().close(); }
		 * else { response.setContentType("text/html"); PrintWriter printwriter =
		 * response.getWriter(); printwriter.println("<html>");
		 * printwriter.println("<br><br><br><h2>Could not get file name:<br>" +
		 * requestedFile + "</h2>"); printwriter.
		 * println("<br><br><br><center><h3><a href='javascript: history.go(-1)'>Back</a></h3></center>"
		 * ); printwriter.println("<br><br><br>&copy; webAccess");
		 * printwriter.println("</html>"); printwriter.flush(); printwriter.close(); }
		 * //
		 */

		/*
		 * response.setContentType("application/x-msdownload");
		 * response.setHeader("Content-Disposition:", "attachment; filename=" + new
		 * String(orgFileName.getBytes(),"UTF-8" ));
		 * response.setHeader("Content-Transfer-Encoding","binary");
		 * response.setHeader("Pragma","no-cache"); response.setHeader("Expires","0");
		 * 
		 * BufferedInputStream fin = new BufferedInputStream(new FileInputStream(file));
		 * BufferedOutputStream outs = new
		 * BufferedOutputStream(response.getOutputStream()); int read = 0;
		 * 
		 * while ((read = fin.read(b)) != -1) { outs.write(b,0,read); }
		 * log.debug(this.getClass().getName()
		 * +" BufferedOutputStream Write Complete!!! ");
		 * 
		 * outs.close(); fin.close(); //
		 */
	}

	/**
	 * 怨듯넻 而댄룷?뚰듃 utl.fcc ?⑦궎吏? Dependency ?쒓굅瑜??꾪빐 ?대? 硫붿꽌?쒕줈 異붽? ?뺤쓽???묒슜?댄뵆由ъ??댁뀡?먯꽌 怨좎쑀媛믪쓣 ?ъ슜?섍린 ?꾪빐
	 * ?쒖뒪?쒖뿉??17?먮━??TIMESTAMP媛믪쓣 援ы븯??湲곕뒫
	 *
	 * @param
	 * @return Timestamp 媛?
	 * @see
	 */
	private static String getTimeStamp() {

		String rtnStr = null;

		// 臾몄옄?대줈 蹂?섑븯湲??꾪븳 ?⑦꽩 ?ㅼ젙(?곕룄-??????遺?珥?珥??먯젙?댄썑 珥?)
		String pattern = "yyyyMMddhhmmssSSS";

		SimpleDateFormat sdfCurrent = new SimpleDateFormat(pattern, Locale.KOREA);
		Timestamp ts = new Timestamp(System.currentTimeMillis());

		rtnStr = sdfCurrent.format(ts.getTime());

		return rtnStr;
	}
}
