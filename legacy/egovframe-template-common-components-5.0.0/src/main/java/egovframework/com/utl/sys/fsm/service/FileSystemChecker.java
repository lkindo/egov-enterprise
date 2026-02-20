package egovframework.com.utl.sys.fsm.service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.StringTokenizer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.service.FileSystemUtils;
import egovframework.com.cmm.service.Globals;
import egovframework.com.cmm.util.EgovResourceCloseHelper;

/**
 * 媛쒖슂
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???꾪븳 Check ?대옒??
 *
 * ?곸꽭?댁슜
 * - ?뚯씪?쒖뒪?쒖쓽 珥앺겕湲곗? ?ъ쑀?ш린??寃곌낵瑜??쒓났?쒕떎.
 * - Open Souce??Apache Commons IO 瑜??댁슜?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:43
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *   -------    --------    ---------------------------
 *   2017-02-08    ?댁젙?        ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 */
public class FileSystemChecker {

	// LOGGER
	private static final Logger LOGGER = LoggerFactory.getLogger(FileSystemChecker.class);

	private static final FileSystemChecker INSTANCE = new FileSystemChecker();

	/**
	 * ?뚯씪?쒖뒪?쒖쓽 ?ъ쑀?ш린瑜?怨꾩궛?쒕떎. (GB ?⑥쐞)
	 * @param String - ?뚯씪?쒖뒪?쒕챸
	 * @return  int - ?뚯씪?쒖뒪???ъ쑀?ш린
	 *
	 * @param path
	 */
	public static int freeSpaceGb(String path) throws IOException {
		return (int) (FileSystemUtils.freeSpaceKb(path) / 1024 / 1024);
	}

	/**
	 * ?뚯씪?쒖뒪?쒖쓽 ?ш린瑜?怨꾩궛?쒕떎. (GB ?⑥쐞)
	 * @param String - ?뚯씪?쒖뒪?쒕챸
	 * @return  int - ?뚯씪?쒖뒪???ш린
	 *
	 * @param path
	 */
	public static int totalSpaceGb(String path) throws IOException {
		return (int) (INSTANCE.totalSpaceOS(path, Globals.OS_TYPE) / 1024 / 1024);
	}

	/**
	 * ?뚯씪?쒖뒪?쒖쓽 ?ш린瑜?怨꾩궛?쒕떎.
	 * @param String - ?뚯씪?쒖뒪?쒕챸
	 * @param String - OS醫낅쪟
	 * @return  long - ?뚯씪?쒖뒪???ш린
	 *
	 * @param path
	 * @param os
	 */
	long totalSpaceOS(String path, String os) throws IOException {
		if (path == null) {
			throw new IllegalArgumentException("Path must not be empty");
		}

		if (os.equals("WINDOWS")) {
			return totalSpaceWindows(path);
		} else if (os.equals("UNIX")) {
			return totalSpaceUnix(path);
		} else {
			throw new IllegalStateException("Exception caught when determining operating system");
		}
	}

	/**
	 * ?덈룄?곗쫰 OS?먯꽌???뚯씪?쒖뒪?쒖쓽 ?ш린瑜?怨꾩궛?쒕떎.
	 * @param String - ?뚯씪?쒖뒪?쒕챸
	 * @return  long - ?뚯씪?쒖뒪???ш린
	 *
	 * @param path
	 */
	long totalSpaceWindows(String path) throws IOException {
		String windowsPath = path;
		if (path.length() > 2 && path.charAt(1) == ':') {
			windowsPath = path.substring(0, 2); // seems to make it work
		}

		File folder = new File("C:\\temp\\");
		if (!folder.isDirectory()) {
			//2017.02.08 	?댁젙? 	?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
			if(folder.mkdirs()){
				LOGGER.debug("[file.mkdirs] folder : Directory Creation Success");
			}else{
				LOGGER.error("[file.mkdirs] folder : Directory Creation Fail");
			}
		}

		FileWriter fileWriter = null;
		try {
			fileWriter = new FileWriter("C:\\temp\\diskpart.sc");
			fileWriter.write("select volume " + windowsPath + "\n");
			fileWriter.write("detail partition");
		} finally {
			EgovResourceCloseHelper.close(fileWriter);
		}

		// build and run the 'diskpart' command
		String[] cmdAttribs = new String[] { "cmd.exe", "/C", "diskpart /s C:\\temp\\diskpart.sc" };

		List<String> lines = performCommand(cmdAttribs, Integer.MAX_VALUE);
		String line = "";
		/*
		for (int i = lines.size() - 1; i >= 0; i--) {
			line = (String) lines.get(i);
			break;
		}
		*/
		line = lines.get(lines.size() - 1);

		long totalSpace = 0;
		String size = "";
		line = line.toUpperCase();
		if (line.indexOf("GB") > 0) {
			size = line.substring(line.lastIndexOf("GB") - 8, line.lastIndexOf("GB") - 1).trim();
			size = size.replace(",", "");
			totalSpace = Long.valueOf(size) * 1024 * 1024;
		} else if (line.indexOf("MB") > 0) {
			size = line.substring(line.lastIndexOf("MB") - 8, line.lastIndexOf("MB") - 1).trim();
			size = size.replace(",", "");
			totalSpace = Long.valueOf(size) * 1024;
		}

		// 遺덊븘??
		/*
		if (line == null) {
			throw new IllegalStateException("Exception caught when using diskpart command");
		}
		*/

		return totalSpace;
	}

	/**
	 * UNIX OS?먯꽌???뚯씪?쒖뒪?쒖쓽 ?ш린瑜?怨꾩궛?쒕떎.
	 * @param String - ?뚯씪?쒖뒪?쒕챸
	 * @return  long - ?뚯씪?쒖뒪???ш린
	 *
	 * @param path
	 */
	long totalSpaceUnix(String path) throws IOException {
		if (path.length() == 0) {
			throw new IllegalArgumentException("Path must not be empty");
		}

		String osName = System.getProperty("os.name");
		// build and run the 'dir' command
		String flags = "-";

		if (osName.indexOf("hp-ux") == -1) {
			flags += "k";
		}

		if (osName.indexOf("aix") != -1) {
			flags += "P";
		}

		String dfCommand = "df";

		if (osName.indexOf("hp-ux") != -1) {
			dfCommand = "bdf";
		}

		String[] cmdAttribs = (flags.length() > 1 ? new String[] { dfCommand, flags, path } : new String[] { dfCommand, path });

		// perform the command, asking for up to 3 lines (header, interesting, overflow)
		List<String> lines = performCommand(cmdAttribs, 3);
		if (lines.size() < 2) {
			// unknown problem, throw exception
			throw new IOException("Command line 'df' did not return info as expected " + "for path '" + path + "'- response was " + lines);
		}
		String line2 = lines.get(1); // the line we're interested in

		// Now, we tokenize the string. The fourth element is what we want.
		StringTokenizer tok = new StringTokenizer(line2, " ");
		if (tok.countTokens() < 4) {
			// could be long Filesystem, thus data on third line
			if (tok.countTokens() == 1 && lines.size() >= 3) {
				String line3 = lines.get(2); // the line may be interested in
				tok = new StringTokenizer(line3, " ");
			} else {
				throw new IOException("Command line 'df' did not return data as expected " + "for path '" + path + "'- check path is valid");
			}
		} else {
			tok.nextToken(); // Ignore Filesystem
		}
		String totalSpace = tok.nextToken();
		long freeSpace = 0;
		try {
			freeSpace = Long.valueOf(totalSpace);
			if (freeSpace < 0) {
				throw new IOException("Command line 'df' did not find free space in response " + "for path '" + path + "'- check path is valid");
			}
		} catch (NumberFormatException ex) {
			throw new IOException("Command line 'df' did not return numeric data as expected " + "for path '" + path + "'- check path is valid");
		}
		return freeSpace;
	}

	/**
	 * OS而ㅻ㎤?쒕? ?섑뻾????洹?寃곌낵媛믪쓣 ?쇱씤蹂꾨줈 諛섑솚?댁???
	 * @param String - OS 而ㅻ㎤??
	 * @param int - 理쒕??쇱씤 ??
	 * @return  List<String> - 寃곌낵?쇱씤 由ъ뒪??
	 *
	 * @param cmdAttribs
	 * @param max
	 */
	private static List<String> performCommand(String[] cmdAttribs, int max) throws IOException {
		List<String> lines = new ArrayList<>(20);
		Process p = null;
		BufferedReader b_out = null;
		try {
			p = Runtime.getRuntime().exec(cmdAttribs);
			b_out = new BufferedReader(new InputStreamReader(p.getInputStream()));

			String line = b_out.readLine();
			while (line != null && lines.size() < max) {
				line = line.toLowerCase().trim();
				lines.add(line);
				line = b_out.readLine();
			}

			p.waitFor();
			if (p.exitValue() != 0) {
				// os command problem, throw exception
				throw new IOException("Command line returned OS error code '" + p.exitValue() + "' for command " + Arrays.asList(cmdAttribs));
			}
			if (lines.size() == 0) {
				// unknown problem, throw exception
				throw new IOException("Command line did not return any info " + "for command " + Arrays.asList(cmdAttribs));
			}
			return lines;

		} catch (InterruptedException ex) {
			throw new IOException("Command line threw an InterruptedException '" + ex.getMessage() + "' for command " + Arrays.asList(cmdAttribs));
		} finally {
			EgovResourceCloseHelper.close(b_out);

			if (p != null) {
				p.destroy();
			}
		}
	}

}
