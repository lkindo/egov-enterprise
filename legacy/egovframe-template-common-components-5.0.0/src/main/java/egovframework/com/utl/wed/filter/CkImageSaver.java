/*
 * CKEditor image upload module for Java.
 * Copyright guavatak (https://github.com/guavatak/ckeditor-upload-filter-java)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author guavatak (https://github.com/guavatak/ckeditor-upload-filter-java)
 */
package egovframework.com.utl.wed.filter;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

import org.apache.commons.fileupload2.core.DiskFileItemFactory;
import org.apache.commons.fileupload2.core.FileItem;
import org.apache.commons.fileupload2.core.FileUploadException;
import org.apache.commons.fileupload2.jakarta.servlet6.JakartaServletFileUpload;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.egovframe.rte.fdl.crypto.EgovEnvCryptoService;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.context.support.WebApplicationContextUtils;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Created by guava on 1/20/14.
 *  ?대?吏 ???泥섎━ ?대옒??
 * @author guavatak
 * @since 2014.12.04
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *  ?섏젙??	?섏젙??		?섏젙?댁슜
 *  ----------	-----------		---------------------------
 *  2014.12.04	?쒖??꾨젅?꾩썙??	理쒖큹 ?곸슜 (?⑦궎吏 蹂寃?諛??뚯뒪 ?뺣━)
 *  2016.04.21	?λ룞??		怨듯넻而댄룷?뚰듃 V3.6 ?섏젙
 *  2018.12.11	?좎슜??		KISA 蹂댁븞痍⑥빟?????섏젙
 *  2018.12.28	?좎슜??		?낅줈???대?吏 URL ?앹꽦 遺遺??섏젙
 *  2020.08.28	?좎슜??		蹂댁븞?쎌젏 議곗튂 (Private 諛곗뿴??Public ?곗씠???좊떦[CWE-496])
 *  2023.06.09	?댄깮吏?		NSR 蹂댁븞議곗튂 (?щ줈?ㅼ궗?댄듃 ?ㅽ겕由쏀듃 諛⑹?瑜??꾪븳 ?곗씠??蹂??肄붾뱶 ?섏젙)
 *  2023.06.27	源?쒖?			?щ줈?ㅼ궗?댄듃 ?ㅽ겕由쏀듃 諛⑹? 肄붾뱶 誘몄궗??蹂??媛쒖꽑
 *
 * </pre>
 */
public class CkImageSaver {
	private static final Log log = LogFactory.getLog(CkFilter.class);

	private static final String FUNC_NO = "CKEditorFuncNum";

	private String imageBaseDir;
	private String imageDomain;
	private String[] allowFileTypeArr;
	private FileSaveManager fileSaveManager;

	/**
	 *
	 * @param imageBaseDir
	 * @param imageDomain
	 * @param allowFileTypeArr
	 * @param saveManagerClass	 *
	 */
	public CkImageSaver(String imageBaseDir, String imageDomain, String[] allowFileTypeArr, String saveManagerClass) {
		this.imageBaseDir = EgovWebUtil.filePathBlackList(imageBaseDir);

		if ((EgovStringUtil.isNullToString(imageBaseDir)).endsWith("/")) {
			StringUtils.removeEnd(imageBaseDir, "/");
		}
		if ((EgovStringUtil.isNullToString(imageBaseDir)).endsWith("\\")) {
			StringUtils.removeEnd(imageBaseDir, "\\");
		}

		this.imageDomain = EgovWebUtil.filePathBlackList(imageDomain);
		if ((EgovStringUtil.isNullToString(this.imageDomain)).endsWith("/")) {
			StringUtils.removeEnd(this.imageDomain, "/");
		}

		this.allowFileTypeArr = allowFileTypeArr.clone();

		if (StringUtils.isBlank(saveManagerClass)) {
			fileSaveManager = new DefaultFileSaveManager();
		} else {
			try {
				Class<?> klass = Class.forName(saveManagerClass);
				fileSaveManager = (FileSaveManager) klass.newInstance();
			} catch (ClassNotFoundException e) {
				log.error(e);
				throw new RuntimeException(e);
			} catch (InstantiationException e) {
				log.error(e);
				throw new RuntimeException(e);
			} catch (IllegalAccessException e) {
				log.error(e);
				throw new RuntimeException(e);
			}
		}
	}

	/**
	 *
	 * @param request
	 * @param response
	 * @throws IOException
	 */
	public void saveAndReturnUrlToClient(HttpServletRequest request, HttpServletResponse response) throws IOException {
		// Parse the request
		try {
			DiskFileItemFactory factory = new DiskFileItemFactory.Builder().get();

			// Create a new file upload handler
			JakartaServletFileUpload upload = new JakartaServletFileUpload(factory);

			List<FileItem> /* FileItem */items = upload.parseRequest(request);
			// We upload just one file at the same time
			FileItem uplFile = items.get(0);

			String errorMessage = null;
			String relUrl = null;

			if (isAllowFileType(FilenameUtils.getName(uplFile.getName()))) {
				String uploadFilePath = fileSaveManager.saveFile(uplFile, imageBaseDir);
				//System.out.println("===>>> uploadFilePath = "+uploadFilePath);

				String fileName = uploadFilePath.substring(uploadFilePath.lastIndexOf('/') + 1);
				String filePath = imageBaseDir+uploadFilePath.substring(0,uploadFilePath.lastIndexOf('/'));

				relUrl = request.getContextPath()
					    + "/utl/web/imageSrc.do?"
					    + "path=" + this.encrypt(filePath,request)
					    + "&physical=" + this.encrypt(fileName,request)
					    + "&contentType=" + this.encrypt(uplFile.getContentType(),request);

				//System.out.println("===>>> relUrl = "+relUrl);
			} else {
				errorMessage = "Restricted Image Format";
			}

			StringBuffer sb = new StringBuffer();
			sb.append("<script type=\"text/javascript\">\n");
			// Compressed version of the document.domain automatic fix script.
			// The original script can be found at [fckeditor_dir]/_dev/domain_fix_template.js
			// sb.append("(function(){var d=document.domain;while (true){try{var A=window.parent.document.domain;break;}catch(e) {};d=d.replace(/.*?(?:\\.|$)/,'');if (d.length==0) break;try{document.domain=d;}catch (e){break;}}})();\n");
			// KISA 蹂댁븞?쎌젏 議곗튂 (2018-12-11, ?좎슜??
			String funcNo = request.getParameter(FUNC_NO);
			boolean isInteger = true;
			try {
				Integer.parseInt(funcNo);
			} catch (NumberFormatException e) {
				isInteger = false;
				log.error(e);
			}
			if(!isInteger) {
				funcNo = "1";		// 媛??留롮씠 ?ъ슜?섎뒗 媛?
			}
			sb.append("window.parent.CKEDITOR.tools.callFunction(").append(funcNo).append(", '");
			sb.append(relUrl);
			if (errorMessage != null) {
				sb.append("', '").append(errorMessage);
			}
			sb.append("');\n </script>");

			response.setContentType("text/html");
			response.setHeader("Cache-Control", "no-cache");
			PrintWriter out = response.getWriter();

			out.print(sb.toString());
			out.flush();
			out.close();

		} catch (FileUploadException e) {
			log.error(e);
		}
	}

	/**
	 *
	 * @param fileName
	 * @return
	 */
	protected boolean isAllowFileType(String fileName) {
		boolean isAllow = false;
		if (allowFileTypeArr != null && allowFileTypeArr.length > 0) {
			for (String allowFileType : allowFileTypeArr) {
				if (StringUtils.equalsIgnoreCase(allowFileType, StringUtils.substringAfterLast(fileName, "."))) {
					isAllow = true;
					break;
				}
			}
		} else {
			isAllow = true;
		}

		return isAllow;
	}

    /**
     * ?뷀샇??
     *
     * @param encrypt
	 * @param request
	 * @return
     */
    private String encrypt(String encrypt,HttpServletRequest request) {

    	WebApplicationContext wac = WebApplicationContextUtils.getRequiredWebApplicationContext(request.getServletContext());
    	EgovEnvCryptoService cryptoService = (EgovEnvCryptoService)wac.getBean("egovEnvCryptoService");

    	try {
    		return cryptoService.encrypt(encrypt);
        } catch(IllegalArgumentException e) {
        	log.error("[IllegalArgumentException] Try/Catch...usingParameters Running : "+ e.getMessage());
        }
		return encrypt;
    }

}