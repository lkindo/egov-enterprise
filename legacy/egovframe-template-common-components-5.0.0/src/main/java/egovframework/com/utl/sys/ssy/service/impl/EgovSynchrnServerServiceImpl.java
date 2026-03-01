package egovframework.com.utl.sys.ssy.service.impl;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPFile;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovBasicLogger;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.ssy.service.EgovSynchrnServerService;
import egovframework.com.utl.sys.ssy.service.SynchrnServer;
import egovframework.com.utl.sys.ssy.service.SynchrnServerVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?숆린?붾????쒕쾭?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?숆린?붾????쒕쾭??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?숆린?붾????쒕쾭??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * - 2015.03.31	 ?낅줈???뚯씪??紐⑸줉??議고쉶???낅줈???붾젆?좊━媛 ?놁쓣 寃쎌슦 ?앹꽦?섎룄濡??섏젙
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:34
 *
 *      ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *   -------    --------    ---------------------------
 *   2017-02-08    ?댁젙?        ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2018-11-12    ?댁젙?        processFtp() FILE_TYPE ?ㅼ젙 ?섏젙
 *
 */
@Service("egovSynchrnServerService")
public class EgovSynchrnServerServiceImpl extends EgovAbstractServiceImpl implements EgovSynchrnServerService {

	// LOGGER
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovSynchrnServerServiceImpl.class);
	private static final String SYNCH_SERVER_PATH = EgovProperties.getProperty("Globals.SynchrnServerPath");

	@Resource(name = "synchrnServerDAO")
	private SynchrnServerDAO synchrnServerDAO;

	/**
	 * ?숆린?붾????쒕쾭瑜?愿由ы븯湲??꾪빐 ?깅줉???숆린?붾????쒕쾭紐⑸줉??議고쉶?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return List - ?숆린?붾????쒕쾭 紐⑸줉
	 */
	@Override
	public List<SynchrnServerVO> selectSynchrnServerList(SynchrnServerVO synchrnServerVO) throws Exception {
		return synchrnServerDAO.selectSynchrnServerList(synchrnServerVO);
	}

	/**
	 * ?숆린?붾????쒕쾭紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return int - ?숆린?붾????쒕쾭 移댁슫????
	 */
	@Override
	public int selectSynchrnServerListTotCnt(SynchrnServerVO synchrnServerVO) throws Exception {
		return synchrnServerDAO.selectSynchrnServerListTotCnt(synchrnServerVO);
	}

	/**
	 * ?깅줉???숆린?붾????쒕쾭???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 */
	@Override
	public SynchrnServerVO selectSynchrnServer(SynchrnServerVO synchrnServerVO) throws Exception {
		return synchrnServerDAO.selectSynchrnServer(synchrnServerVO);
	}

	/**
	 * ?깅줉???숆린?붾????쒕쾭???뚯씪 紐⑸줉??議고쉶?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return List<String> - String Type List
	 */
	@Override
	public List<String> selectSynchrnServerFiles(SynchrnServerVO synchrnServerVO) throws Exception {

		List<String> list = new ArrayList<>();

		try {
			FTPClient ftpClient = new FTPClient();
			ftpClient.setControlEncoding("euc-kr");

			if (!EgovWebUtil.isIPAddress(synchrnServerVO.getServerIp())) {
				throw new RuntimeException("IP is needed. (" + synchrnServerVO.getServerIp() + ")");
			}

			InetAddress host = InetAddress.getByName(synchrnServerVO.getServerIp());

			ftpClient.connect(host, Integer.parseInt(synchrnServerVO.getServerPort()));
			boolean isLogin = ftpClient.login(synchrnServerVO.getFtpId(), synchrnServerVO.getFtpPassword());
			if (!isLogin) {
				throw new Exception("FTP Client Login Error : \n");
			}

			FTPFile[] fTPFile = null;

			try {
				ftpClient.changeWorkingDirectory(synchrnServerVO.getSynchrnLc());
				fTPFile = ftpClient.listFiles(synchrnServerVO.getSynchrnLc());

				for (FTPFile element : fTPFile) {
					if (element.isFile()) {
						list.add(element.getName());
					}
				}
			} finally {
				ftpClient.logout();
			}

		} catch (IOException e) {
			list.add("noList");
		}

		return list;
	}

	/**
	 * ?깅줉???숆린?붾????쒕쾭???뚯씪????젣?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 */
	@Override
	public void deleteSynchrnServerFile(SynchrnServerVO synchrnServerVO) throws Exception {

		FTPClient ftpClient = new FTPClient();
		ftpClient.setControlEncoding("euc-kr");

		if (!EgovWebUtil.isIPAddress(synchrnServerVO.getServerIp())) {
			throw new RuntimeException("IP is needed. (" + synchrnServerVO.getServerIp() + ")");
		}

		InetAddress host = InetAddress.getByName(synchrnServerVO.getServerIp());

		ftpClient.connect(host, Integer.parseInt(synchrnServerVO.getServerPort()));
		ftpClient.login(synchrnServerVO.getFtpId(), synchrnServerVO.getFtpPassword());

		FTPFile[] fTPFile = null;

		try {
			ftpClient.changeWorkingDirectory(synchrnServerVO.getSynchrnLc());
			fTPFile = ftpClient.listFiles(synchrnServerVO.getSynchrnLc());

			for (FTPFile element : fTPFile) {
				//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
				if (EgovStringUtil.isNullToString(synchrnServerVO.getDeleteFileNm()).equals(element.getName())) {
					ftpClient.deleteFile(element.getName());
				}
			}

			SynchrnServer synchrnServer = new SynchrnServer();
			synchrnServer.setServerId(synchrnServerVO.getServerId());
			synchrnServer.setReflctAt("N");
			synchrnServerDAO.processSynchrn(synchrnServer);

		} finally {
			ftpClient.logout();
		}
	}

	/**
	 * ?깅줉???숆린?붾????쒕쾭???뚯씪???ㅼ슫濡쒕뱶 ?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @param fileNm - ?ㅼ슫濡쒕뱶 ????뚯씪
	 */
	@Override
	public void downloadFtpFile(SynchrnServerVO synchrnServerVO, String fileNm) throws Exception {

		FTPClient ftpClient = new FTPClient();
		ftpClient.setControlEncoding("euc-kr");

		if (!EgovWebUtil.isIPAddress(synchrnServerVO.getServerIp())) {
			throw new RuntimeException("IP is needed. (" + synchrnServerVO.getServerIp() + ")");
		}

		InetAddress host = InetAddress.getByName(synchrnServerVO.getServerIp());

		ftpClient.connect(host, Integer.parseInt(synchrnServerVO.getServerPort()));
		ftpClient.login(synchrnServerVO.getFtpId(), synchrnServerVO.getFtpPassword());
		ftpClient.changeWorkingDirectory(synchrnServerVO.getSynchrnLc());

		File downFile = new File(EgovWebUtil.filePathBlackList(synchrnServerVO.getFilePath() + fileNm));
		OutputStream outputStream = null;

		try {
			outputStream = new FileOutputStream(downFile);
			ftpClient.retrieveFile(fileNm, outputStream);
		} finally {
			if (outputStream != null) {
				outputStream.close();
			}
		}

		ftpClient.logout();
	}

	/**
	 * ?숆린?붾????쒕쾭?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 * @param synchrnServerVO    - ?숆린?붾????쒕쾭 VO
	 */
	@Override
	public SynchrnServerVO insertSynchrnServer(SynchrnServer synchrnServer, SynchrnServerVO synchrnServerVO) throws Exception {
		synchrnServerDAO.insertSynchrnServer(synchrnServer);
		synchrnServerVO.setServerId(synchrnServer.getServerId());
		return synchrnServerDAO.selectSynchrnServer(synchrnServerVO);
	}

	/**
	 * 湲??깅줉???숆린?붾????쒕쾭?뺣낫瑜??섏젙?쒕떎.
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 */
	@Override
	public void updateSynchrnServer(SynchrnServer synchrnServer) throws Exception {
		synchrnServerDAO.updateSynchrnServer(synchrnServer);
	}

	/**
	 * 湲??깅줉???숆린?붾????쒕쾭?뺣낫瑜???젣?쒕떎.
	 * @param synchrnServer - ?숆린?붾????쒕쾭 model
	 */
	@Override
	public void deleteSynchrnServer(SynchrnServer synchrnServer) throws Exception {
		synchrnServerDAO.deleteSynchrnServer(synchrnServer);
	}

	/**
	 * ?낅줈???뚯씪???숆린?붾????쒕쾭?ㅼ쓣 ??곸쑝濡??숆린??泥섎━瑜??쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return boolean - ?깃났?щ?
	 */
	@Override
	public boolean processSynchrn(SynchrnServerVO synchrnServerVO, File[] uploadFile) throws Exception {

		List<SynchrnServerVO> synchrnServerList = synchrnServerDAO.processSynchrnServerList(synchrnServerVO);
		SynchrnServer synchrnServer = new SynchrnServer();
		boolean reflctAt = false;

		for (SynchrnServerVO SynchrnServerVo : synchrnServerList) {
			reflctAt = processFtp(SynchrnServerVo.getServerIp(), Integer.parseInt(SynchrnServerVo.getServerPort()), SynchrnServerVo.getFtpId(), SynchrnServerVo.getFtpPassword(),
					SynchrnServerVo.getSynchrnLc(), synchrnServerVO.getFilePath(), uploadFile);

			synchrnServer.setServerId(SynchrnServerVo.getServerId());
			if (reflctAt) {
				synchrnServer.setReflctAt("Y");
			} else {
				synchrnServer.setReflctAt("N");
			}

			synchrnServerDAO.processSynchrn(synchrnServer);
		}

		return true;
	}

	/**
	 * FTP ?쒕쾭???덈뒗 ?붿씪 紐⑸줉??議고쉶?쒕떎.
	 * @param serverIp - String
	 * @param port - int
	 * @param user - String
	 * @param password - String
	 * @param synchrnPath - String
	 * @return List - ?붿씪 紐⑸줉
	 */
	public List<String> getFtpFileList(String serverIp, int port, String user, String password, String synchrnPath) throws Exception {

		List<String> list = new ArrayList<>();
		FTPClient ftpClient = new FTPClient();
		ftpClient.setControlEncoding("euc-kr");

		if (!EgovWebUtil.isIPAddress(serverIp)) {
			throw new RuntimeException("IP is needed. (" + serverIp + ")");
		}

		InetAddress host = InetAddress.getByName(serverIp);

		ftpClient.connect(host, port);
		ftpClient.login(user, password);

		ftpClient.changeWorkingDirectory(synchrnPath);
		FTPFile[] fTPFile = ftpClient.listFiles(synchrnPath);
		for (FTPFile element : fTPFile) {
			list.add(element.getName());
		}
		return list;
	}

	/**
	 * ?숆린???쒕쾭?ㅼ쓣 ??곸쑝濡?FTP Upload 泥섎━瑜??쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 * @return boolean - ?깃났?щ?
	 */
	public boolean processFtp(String serverIp, int port, String user, String password, String synchrnPath, String filePath, File[] uploadFile) throws Exception {

		boolean upload = false;

		try {
			FTPClient ftpClient = new FTPClient();
			ftpClient.setControlEncoding("euc-kr");

			if (!EgovWebUtil.isIPAddress(serverIp)) { // 2011.10.25 蹂댁븞?먭? ?꾩냽議곗튂
				throw new RuntimeException("IP is needed. (" + serverIp + ")");
			}

			InetAddress host = InetAddress.getByName(serverIp);

			ftpClient.connect(host, port);
			if (!ftpClient.login(user, password)) {
				throw new Exception("FTP Client Login Error : \n");
			}

			if (synchrnPath.length() != 0) {
				ftpClient.changeWorkingDirectory(synchrnPath);
			}

			FTPFile[] fTPFile = ftpClient.listFiles(synchrnPath);

			FileInputStream fis = null;
			try {
				for (File element : uploadFile) {
					if (element.isFile()) {
						if (!isExist(fTPFile, element)) {
							fis = new FileInputStream(element);
							//ftpClient.setFileType(FTP.ASCII_FILE_TYPE); // TEXT FILE ?꾩넚
							ftpClient.setFileType(FTP.BINARY_FILE_TYPE); // 諛붿씠?덈━ ?뚯씪 ?꾩넚
							ftpClient.storeFile(synchrnPath + element.getName(), fis);
						}
						if (fis != null) {
							fis.close();
						}
					}
				}

				// ?낅줈???뚯씪 紐⑸줉???녿뒗  FTP ?쒕쾭???덈뒗 ?뚯씪????젣?쒕떎.
				fTPFile = ftpClient.listFiles(synchrnPath);
				deleteFtpFile(ftpClient, fTPFile, uploadFile);

				upload = true;

			} catch (IOException ex) {
				EgovBasicLogger.debug("FTP IO error", ex);
			} finally {
				EgovResourceCloseHelper.close(fis);
			}
			ftpClient.logout();

		} catch (IOException e) {//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			EgovBasicLogger.debug("processFtp error (IOException)", e);
			upload = false;
		} catch (Exception e) {
			EgovBasicLogger.debug("processFtp error", e);
			upload = false;
		}

		return upload;
	}

	/**
	 * ?숆린???쒕쾭??upload ???뚯씪??議댁옱?섎뒗吏 ?뺤씤?쒕떎.
	 * @param fTPFiles - ?숆린?붾????쒕쾭???뚯씪 紐⑸줉
	 * @param targetFile - ?숆린?붾????뚯씪
	 * @return boolean - 議댁옱?щ?
	 */
	public boolean isExist(FTPFile[] fTPFiles, File targetFile) throws Exception {

		boolean isExist = false;

		for (FTPFile fTPFile : fTPFiles) {
			if (fTPFile.isFile()) {
				if (fTPFile.getName().equals(targetFile.getName())) {
					isExist = true;
				}
			}
		}

		return isExist;
	}

	/**
	 * ?숆린???쒕쾭???뚯씪 紐⑸줉 以?upload ?뚯씪 紐⑸줉???녿뒗 ?뚯씪? ??젣?쒕떎.
	 * @param fTPFiles - ?숆린?붾????쒕쾭???뚯씪 紐⑸줉
	 * @param uploadFile - ?낅줈???뚯씪 紐⑸줉
	 * @return boolean - 議댁옱?щ?
	 */
	public void deleteFtpFile(FTPClient ftpClient, FTPFile[] fTPFiles, File[] uploadFile) throws Exception {

		boolean isExist = false;

		for (FTPFile fTPFile : fTPFiles) {
			isExist = false;
			for (File element : uploadFile) {
				if (fTPFile.isFile()) {
					if (fTPFile.getName().equals(element.getName())) {
						isExist = true;
					}
				}
			}

			if (!isExist) {
				if (fTPFile.isFile()) {
					ftpClient.deleteFile(fTPFile.getName());
				}
			}
		}
	}

	/**
	 * ?낅줈???뚯씪??紐⑸줉??議고쉶?쒕떎.
	 * @param filePath - ?낅줈??寃쎈줈
	 * @return List - ?낅줈???뚯씪 由ъ뒪??
	 */
	@Override
	public List<String> getFileName() throws Exception {

		File uploadFile = new File(EgovWebUtil.filePathBlackList(SYNCH_SERVER_PATH));

		if(!uploadFile.exists()){
			//2017.02.08 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			if(uploadFile.mkdirs()){
				LOGGER.debug("[file.mkdirs] uploadFile : Directory Creation Success");
			}else{
				LOGGER.error("[file.mkdirs] uploadFile : Directory Creation Fail");
			}
		}

		File[] fileList = uploadFile.listFiles();
		List<String> fileArray = new ArrayList<>();

		//KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		if (fileList != null) {
			for (File element : fileList) {
				if (element.isFile()) {
					fileArray.add(element.getName());
				}
			}
		}

		return fileArray;
	}

	/**
	 * ?숆린??????뚯씪???낅줈???쒕떎.
	 * @param file - ?낅줈??????뚯씪
	 * @param newName - ?낅줈??????뚯씪紐?
	 * @param stordFilePath - ?낅줈??寃쎈줈
	 */
	@Override
	public void writeFile(MultipartFile multipartFile, String newName, SynchrnServerVO synchrnServerVO) throws Exception {

		List<SynchrnServerVO> synchrnServerList = synchrnServerDAO.processSynchrnServerList(synchrnServerVO);
		SynchrnServer synchrnServer = new SynchrnServer();

		InputStream stream = null;
		OutputStream bos = null;

		try {
			stream = multipartFile.getInputStream();
			File cFile = new File(EgovWebUtil.filePathBlackList(SYNCH_SERVER_PATH));

			if (!cFile.isDirectory()) {
				//2017.02.08 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
				if(cFile.mkdir()){
					LOGGER.debug("[file.mkdirs] cFile : Directory Creation Success");
				}else{
					LOGGER.error("[file.mkdirs] cFile : Directory Creation Fail");
				}
			}

			bos = new FileOutputStream(EgovWebUtil.filePathBlackList(SYNCH_SERVER_PATH + File.separator + FilenameUtils.getName(newName)));

			int bytesRead = 0;
			byte[] buffer = new byte[2048];

			while ((bytesRead = stream.read(buffer, 0, 2048)) != -1) {
				bos.write(buffer, 0, bytesRead);
			}

			for (SynchrnServerVO SynchrnServerVo : synchrnServerList) {
				synchrnServer.setServerId(SynchrnServerVo.getServerId());
				synchrnServer.setReflctAt("N");
				synchrnServerDAO.processSynchrn(synchrnServer);
			}

		} finally {
			EgovResourceCloseHelper.close(bos, stream);
		}
	}

	/**
	 * ?낅줈???뚯씪????젣?쒕떎.
	 * @param synchrnServerVO - ?숆린?붾????쒕쾭 Vo
	 */
	@Override
	public void deleteFile(String deleteFiles, SynchrnServerVO synchrnServerVO) throws Exception {

		List<SynchrnServerVO> synchrnServerList = synchrnServerDAO.processSynchrnServerList(synchrnServerVO);
		SynchrnServer synchrnServer = new SynchrnServer();

		String[] strDeleteFiles = deleteFiles.split(";");

		for (String strDeleteFile : strDeleteFiles) {
			File uploadFile = new File(EgovWebUtil.filePathBlackList(SYNCH_SERVER_PATH + FilenameUtils.getName(strDeleteFile)));
			//2017.02.08 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			if(uploadFile.delete()){
				LOGGER.debug("[file.delete] uploadFile : File Deletion Success");
			}else{
				LOGGER.error("[file.delete] uploadFile : File Deletion Fail");
			}
		}

		for (SynchrnServerVO SynchrnServerVo : synchrnServerList) {
			synchrnServer.setServerId(SynchrnServerVo.getServerId());
			synchrnServer.setReflctAt("N");
			synchrnServerDAO.processSynchrn(synchrnServer);
		}
	}
}
