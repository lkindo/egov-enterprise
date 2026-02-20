package egovframework.com.utl.fcc.service;

import java.io.File;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.apache.commons.lang.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.util.WebUtils;

import egovframework.com.cmm.EgovWebUtil;
import jakarta.servlet.http.HttpServletRequest;

/**
 * @Class Name  : EgovFileUploadUtil.java
 * @Description : Spring 湲곕컲 File Upload ?좏떥由ы떚
 * @Modification Information
 *
 *  ?섏젙??              ?섏젙??           ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2009.08.26   ?쒖꽦怨?           理쒖큹 ?앹꽦
 *  2018.08.17   ?좎슜??           uploadFilesExt(?뺤옣??湲곕줉) 異붽?
 *  2019.12.06   ?좎슜??           checkFileExtension(), checkFileMaxSize() 異붽?
 *  2020.08.05   ?좎슜??           uploadFilesExt Parameter ?섏젙
 *  2021.02.16   ?좎슜??           WebUtils.getNativeRequest(request,MultipartHttpServletRequest.class);
 *  2022.11.11   源?쒖?            ?쒗걧?댁퐫??泥섎━
 *
 * @author 怨듯넻而댄룷?뚰듃 媛쒕컻? ?쒖꽦怨?
 * @since 2009.08.26
 * @version 1.0
 * @see
 */
public class EgovFileUploadUtil extends EgovFormBasedFileUtil {
	/**
	 * ?뚯씪??Upload 泥섎━?쒕떎.
	 *
	 * @param request
	 * @param where
	 * @param maxFileSize
	 * @return
	 * @throws Exception
	 */
	public static List<EgovFormBasedFileVo> uploadFiles(HttpServletRequest request, String where, long maxFileSize) throws Exception {
		List<EgovFormBasedFileVo> list = new ArrayList<>();
		MultipartHttpServletRequest mptRequest = WebUtils.getNativeRequest(request, MultipartHttpServletRequest.class);

		if (mptRequest != null) {//2022.01 Possible null pointer dereference due to return value of called method 議곗튂
			Iterator<?> fileIter = mptRequest.getFileNames();

			while (fileIter.hasNext()) {
				MultipartFile mFile = mptRequest.getFile((String)fileIter.next());

				// 2022.11.11 源?쒖? ?쒗걧?댁퐫??泥섎━
				if (mFile == null) {
					continue;
				}

				EgovFormBasedFileVo vo = new EgovFormBasedFileVo();

				String tmp = mFile.getOriginalFilename();

				//2022.01 Possible null pointer dereference due to return value of called method
				if (StringUtils.isNotEmpty(tmp)) {

					if (tmp.lastIndexOf("\\") >= 0) {
						tmp = tmp.substring(tmp.lastIndexOf("\\") + 1);
					}

					vo.setFileName(tmp);
					vo.setContentType(mFile.getContentType());
					vo.setServerSubPath(getTodayString());
					vo.setPhysicalName(getPhysicalFileName());
					vo.setSize(mFile.getSize());

					if (tmp.lastIndexOf(".") >= 0) {
						vo.setPhysicalName(vo.getPhysicalName()); // 2012.11 KISA 蹂댁븞議곗튂
					}

					if (mFile.getSize() > 0) {
						InputStream is = null;

						try {
							is = mFile.getInputStream();
							saveFile(is, new File(EgovWebUtil.filePathBlackList(
								where + SEPERATOR + vo.getServerSubPath() + SEPERATOR + vo.getPhysicalName())));
						} finally {
							if (is != null) {
								is.close();
							}
						}
						list.add(vo);
					}
				}
			}
		}

		return list;
	}

	/**
	 * ?뚯씪??Upload(?뺤옣紐????諛??뺤옣???쒗븳) 泥섎━?쒕떎.
	 *
	 * @param request
	 * @param where
	 * @param maxFileSize
	 * @return
	 * @throws Exception
	 */
	public static List<EgovFormBasedFileVo> uploadFilesExt(MultipartHttpServletRequest mptRequest, String where, long maxFileSize, String extensionWhiteList) throws Exception {
		List<EgovFormBasedFileVo> list = new ArrayList<>();

		if (mptRequest != null) {
			Iterator<?> fileIter = mptRequest.getFileNames();

			while (fileIter.hasNext()) {
				MultipartFile mFile = mptRequest.getFile((String)fileIter.next());

				// 2022.11.11 源?쒖? ?쒗걧?댁퐫??泥섎━
				if (mFile == null) {
					continue;
				}

				EgovFormBasedFileVo vo = new EgovFormBasedFileVo();

				String tmp = mFile.getOriginalFilename();

				//2022.01 Possible null pointer dereference due to return value of called method
				if (StringUtils.isNotEmpty(tmp)) {

					if (tmp.lastIndexOf("\\") >= 0) {
						tmp = tmp.substring(tmp.lastIndexOf("\\") + 1);
					}
					String ext = "";
					if (tmp.lastIndexOf(".") > 0) {
						ext = getFileExtension(tmp).toLowerCase();
					} else {
						throw new SecurityException("Unacceptable file extension."); // ?덉슜?섏? ?딅뒗 ?뺤옣??泥섎━
					}
					if (extensionWhiteList.indexOf(ext) < 0) {
						throw new SecurityException("Unacceptable file extension."); // ?덉슜?섏? ?딅뒗 ?뺤옣??泥섎━
					}

					vo.setFileName(tmp);
					vo.setContentType(mFile.getContentType());
					vo.setServerSubPath(getTodayString());
					vo.setPhysicalName(getPhysicalFileName() + "." + ext);
					vo.setSize(mFile.getSize());

					if (tmp.lastIndexOf(".") >= 0) {
						vo.setPhysicalName(vo.getPhysicalName()); // 2012.11 KISA 蹂댁븞議곗튂
					}

					if (mFile.getSize() > 0) {
						InputStream is = null;

						try {
							is = mFile.getInputStream();
							String fullPath = where + SEPERATOR + vo.getServerSubPath() + SEPERATOR + vo.getPhysicalName() + "_upfile";
							saveFile(is, new File(EgovWebUtil.filePathBlackList( fullPath )));
						} finally {
							if (is != null) {
								is.close();
							}
						}
						list.add(vo);
					}
				}
			}
		}

		return list;
	}

	/**
	 * ?뚯씪 ?뺤옣?먮? 異붿텧?쒕떎.
	 *
	 * @param fileNamePath
	 * @return ?뺤옣??: "" ?먮뒗 異붿텧???뺤옣??
	 */
	public static String getFileExtension(String fileNamePath) {

		if (fileNamePath == null) {
			return "";
		}
		String ext = fileNamePath.substring(fileNamePath.lastIndexOf(".") + 1, fileNamePath.length());

		return (ext == null) ? "" : ext;
	}

	/**
	 * ?뚯씪 ?뺤옣?먯쓽 ?덉슜?좊Т瑜?寃利앺븳??
	 *
	 * @param fileNamePath
	 * @param whiteListExtensions : ex) .png.pdf.txt
	 * @return true : ?덉슜
	 * @return true : 遺덇?
	 */
	public static boolean checkFileExtension(String fileNamePath, String whiteListExtensions) {
		String extension = getFileExtension(fileNamePath);

		if ("".equals(extension) || (whiteListExtensions == null) || "".equals(whiteListExtensions)) {
			return false;
		}

		if (whiteListExtensions.indexOf("." + extension) >= 0) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * 理쒕? ?뚯씪 ?ъ씠利??덉슜?좊Т瑜?寃利앺븳??
	 *
	 * @param multipartFile
	 * @param maxFileSize : ex) 1048576 = 1M , 1K = 1024
	 * @return true : ?덉슜
	 * @return true : 遺덇?
	 */
	public static boolean checkFileMaxSize(MultipartFile multipartFile, long maxFileSize) {

		if (multipartFile == null) {
			return false;
		}

		if (multipartFile.getSize() <= maxFileSize) {
			return true;
		} else {
			return false;
		}
	}

}
