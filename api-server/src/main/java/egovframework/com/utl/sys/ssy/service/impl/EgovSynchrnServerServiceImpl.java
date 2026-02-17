package egovframework.com.utl.sys.ssy.service.impl;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPFile;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.company.project.domain.monitoring.SynchrnServerRepository;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovBasicLogger;
import egovframework.com.cmm.util.EgovResourceCloseHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.ssy.service.EgovSynchrnServerService;
import egovframework.com.utl.sys.ssy.service.SynchrnServer;
import egovframework.com.utl.sys.ssy.service.SynchrnServerVO;
import lombok.RequiredArgsConstructor;

/**
 * 개요
 * - 동기화대상 서버에 대한 ServiceImpl 클래스를 정의한다.
 *
 * 상세내용
 * - 동기화대상 서버에 대한 등록, 수정, 삭제, 조회 기능을 제공한다.
 * - 동기화대상 서버의 조회기능은 목록조회, 상세조회로 구분된다.
 * - 2015.03.31 업로드 파일의 목록을 조회시 업로드 디렉토리가 없을 경우 생성하도록 수정
 * 
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 오전 10:44:34
 *
 *          수정일 수정자 수정내용
 *          ------- -------- ---------------------------
 *          2017-02-08 이정은 시큐어코딩(ES) - 시큐어코딩 부적절한 예외 처리[CWE-253, CWE-440,
 *          CWE-754]
 *          2018-11-12 이정은 processFtp() FILE_TYPE 설정 수정
 *
 */
@Service("EgovSynchrnServerService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovSynchrnServerServiceImpl extends EgovAbstractServiceImpl implements EgovSynchrnServerService {

	// LOGGER
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovSynchrnServerServiceImpl.class);
	private static final String SYNCH_SERVER_PATH = EgovProperties.getProperty("Globals.SynchrnServerPath");

	private final SynchrnServerRepository synchrnServerRepository;

	/**
	 * 동기화대상 서버를 관리하기 위해 등록된 동기화대상 서버목록을 조회한다.
	 */
	@Override
	public List<SynchrnServerVO> selectSynchrnServerList(SynchrnServerVO synchrnServerVO) throws Exception {
		Pageable pageable = PageRequest.of(synchrnServerVO.getFirstIndex() / synchrnServerVO.getRecordCountPerPage(),
				synchrnServerVO.getRecordCountPerPage(), Sort.by("serverId").descending());
		Page<com.company.project.domain.monitoring.SynchrnServer> page = synchrnServerRepository
				.selectSynchrnServerList(
						synchrnServerVO.getSearchCondition(), synchrnServerVO.getSearchKeyword(), pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	/**
	 * 동기화대상 서버목록 총 개수를 조회한다.
	 */
	@Override
	public int selectSynchrnServerListTotCnt(SynchrnServerVO synchrnServerVO) throws Exception {
		Pageable pageable = PageRequest.of(0, 1);
		return (int) synchrnServerRepository.selectSynchrnServerList(
				synchrnServerVO.getSearchCondition(), synchrnServerVO.getSearchKeyword(), pageable).getTotalElements();
	}

	/**
	 * 등록된 동기화대상 서버의 상세정보를 조회한다.
	 */
	@Override
	public SynchrnServerVO selectSynchrnServer(SynchrnServerVO synchrnServerVO) throws Exception {
		return synchrnServerRepository.findById(synchrnServerVO.getServerId())
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 등록된 동기화대상 서버의 파일 목록을 조회한다.
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
	 * 등록된 동기화대상 서버의 파일을 삭제한다.
	 */
	@Override
	@Transactional
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
				if (EgovStringUtil.isNullToString(synchrnServerVO.getDeleteFileNm()).equals(element.getName())) {
					ftpClient.deleteFile(element.getName());
				}
			}

			synchrnServerRepository.findById(synchrnServerVO.getServerId()).ifPresent(e -> e.updateReflctAt("N"));

		} finally {
			ftpClient.logout();
		}
	}

	/**
	 * 등록된 동기화대상 서버의 파일을 다운로드 한다.
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
	 * 동기화대상 서버정보를 신규로 등록한다.
	 */
	@Override
	@Transactional
	public SynchrnServerVO insertSynchrnServer(SynchrnServer model, SynchrnServerVO synchrnServerVO) throws Exception {
		com.company.project.domain.monitoring.SynchrnServer entity = com.company.project.domain.monitoring.SynchrnServer
				.builder()
				.serverId(model.getServerId())
				.serverNm(model.getServerNm())
				.serverIp(model.getServerIp())
				.serverPort(model.getServerPort())
				.ftpId(model.getFtpId())
				.ftpPassword(model.getFtpPassword())
				.synchrnLc(model.getSynchrnLc())
				.reflctAt(model.getReflctAt())
				.frstRegisterId(model.getFrstRegisterId())
				.frstRegisterPnttm(LocalDateTime.now())
				.lastUpdusrId(model.getLastUpdusrId())
				.lastUpdusrPnttm(LocalDateTime.now())
				.build();
		synchrnServerRepository.save(entity);
		synchrnServerVO.setServerId(model.getServerId());
		return selectSynchrnServer(synchrnServerVO);
	}

	/**
	 * 기 등록된 동기화대상 서버정보를 수정한다.
	 */
	@Override
	@Transactional
	public void updateSynchrnServer(SynchrnServer model) throws Exception {
		synchrnServerRepository.findById(model.getServerId()).ifPresent(e -> {
			e.update(model.getServerNm(), model.getServerIp(), model.getServerPort(),
					model.getFtpId(), model.getFtpPassword(), model.getSynchrnLc(), model.getLastUpdusrId());
		});
	}

	/**
	 * 기 등록된 동기화대상 서버정보를 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteSynchrnServer(SynchrnServer model) throws Exception {
		synchrnServerRepository.deleteById(model.getServerId());
	}

	/**
	 * 업로드 파일을 동기화대상 서버들을 대상으로 동기화 처리를 한다.
	 */
	@Override
	@Transactional
	public boolean processSynchrn(SynchrnServerVO synchrnServerVO, File[] uploadFile) throws Exception {

		List<com.company.project.domain.monitoring.SynchrnServer> synchrnServerList = synchrnServerRepository.findAll();
		boolean reflctAt = false;

		for (com.company.project.domain.monitoring.SynchrnServer entity : synchrnServerList) {
			reflctAt = processFtp(entity.getServerIp(), Integer.parseInt(entity.getServerPort()), entity.getFtpId(),
					entity.getFtpPassword(),
					entity.getSynchrnLc(), synchrnServerVO.getFilePath(), uploadFile);

			entity.updateReflctAt(reflctAt ? "Y" : "N");
		}

		return true;
	}

	/**
	 * FTP 서버에 있는 화일 목록을 조회한다.
	 */
	public List<String> getFtpFileList(String serverIp, int port, String user, String password, String synchrnPath)
			throws Exception {

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
	 * 동기화 서버들을 대상으로 FTP Upload 처리를 한다.
	 */
	public boolean processFtp(String serverIp, int port, String user, String password, String synchrnPath,
			String filePath, File[] uploadFile) throws Exception {

		boolean upload = false;

		try {
			FTPClient ftpClient = new FTPClient();
			ftpClient.setControlEncoding("euc-kr");

			if (!EgovWebUtil.isIPAddress(serverIp)) {
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
							ftpClient.setFileType(FTP.BINARY_FILE_TYPE);
							ftpClient.storeFile(synchrnPath + element.getName(), fis);
						}
						if (fis != null) {
							fis.close();
						}
					}
				}

				fTPFile = ftpClient.listFiles(synchrnPath);
				deleteFtpFile(ftpClient, fTPFile, uploadFile);

				upload = true;

			} catch (IOException ex) {
				EgovBasicLogger.debug("FTP IO error", ex);
			} finally {
				EgovResourceCloseHelper.close(fis);
			}
			ftpClient.logout();

		} catch (IOException e) {
			EgovBasicLogger.debug("processFtp error (IOException)", e);
			upload = false;
		} catch (Exception e) {
			EgovBasicLogger.debug("processFtp error", e);
			upload = false;
		}

		return upload;
	}

	/**
	 * 동기화 서버에 upload 할 파일이 존재하는지 확인한다.
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
	 * 동기화 서버의 파일 목록 중 upload 파일 목록에 없는 파일은 삭제한다.
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
	 * 업로드 파일의 목록을 조회한다.
	 */
	@Override
	public List<String> getFileName() throws Exception {

		File uploadFile = new File(EgovWebUtil.filePathBlackList(SYNCH_SERVER_PATH));

		if (!uploadFile.exists()) {
			if (uploadFile.mkdirs()) {
				LOGGER.debug("[file.mkdirs] uploadFile : Directory Creation Success");
			} else {
				LOGGER.error("[file.mkdirs] uploadFile : Directory Creation Fail");
			}
		}

		File[] fileList = uploadFile.listFiles();
		List<String> fileArray = new ArrayList<>();

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
	 * 동기화 대상 파일을 업로드 한다.
	 */
	@Override
	@Transactional
	public void writeFile(MultipartFile multipartFile, String newName, SynchrnServerVO synchrnServerVO)
			throws Exception {

		List<com.company.project.domain.monitoring.SynchrnServer> synchrnServerList = synchrnServerRepository.findAll();

		InputStream stream = null;
		OutputStream bos = null;

		try {
			stream = multipartFile.getInputStream();
			File cFile = new File(EgovWebUtil.filePathBlackList(SYNCH_SERVER_PATH));

			if (!cFile.isDirectory()) {
				if (cFile.mkdir()) {
					LOGGER.debug("[file.mkdirs] cFile : Directory Creation Success");
				} else {
					LOGGER.error("[file.mkdirs] cFile : Directory Creation Fail");
				}
			}

			bos = new FileOutputStream(EgovWebUtil
					.filePathBlackList(SYNCH_SERVER_PATH + File.separator + FilenameUtils.getName(newName)));

			int bytesRead = 0;
			byte[] buffer = new byte[2048];

			while ((bytesRead = stream.read(buffer, 0, 2048)) != -1) {
				bos.write(buffer, 0, bytesRead);
			}

			for (com.company.project.domain.monitoring.SynchrnServer entity : synchrnServerList) {
				entity.updateReflctAt("N");
			}

		} finally {
			EgovResourceCloseHelper.close(bos, stream);
		}
	}

	/**
	 * 업로드 파일을 삭제한다.
	 */
	@Override
	@Transactional
	public void deleteFile(String deleteFiles, SynchrnServerVO synchrnServerVO) throws Exception {

		List<com.company.project.domain.monitoring.SynchrnServer> synchrnServerList = synchrnServerRepository.findAll();

		String[] strDeleteFiles = deleteFiles.split(";");

		for (String strDeleteFile : strDeleteFiles) {
			File uploadFile = new File(
					EgovWebUtil.filePathBlackList(SYNCH_SERVER_PATH + FilenameUtils.getName(strDeleteFile)));
			if (uploadFile.delete()) {
				LOGGER.debug("[file.delete] uploadFile : File Deletion Success");
			} else {
				LOGGER.error("[file.delete] uploadFile : File Deletion Fail");
			}
		}

		for (com.company.project.domain.monitoring.SynchrnServer entity : synchrnServerList) {
			entity.updateReflctAt("N");
		}
	}

	private SynchrnServerVO toVO(com.company.project.domain.monitoring.SynchrnServer entity) {
		SynchrnServerVO vo = new SynchrnServerVO();
		vo.setServerId(entity.getServerId());
		vo.setServerNm(entity.getServerNm());
		vo.setServerIp(entity.getServerIp());
		vo.setServerPort(entity.getServerPort());
		vo.setFtpId(entity.getFtpId());
		vo.setFtpPassword(entity.getFtpPassword());
		vo.setSynchrnLc(entity.getSynchrnLc());
		vo.setReflctAt(entity.getReflctAt());
		vo.setFrstRegisterPnttm(
				entity.getFrstRegisterPnttm() != null ? entity.getFrstRegisterPnttm().toString() : null);
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm() != null ? entity.getLastUpdusrPnttm().toString() : null);
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		return vo;
	}
}