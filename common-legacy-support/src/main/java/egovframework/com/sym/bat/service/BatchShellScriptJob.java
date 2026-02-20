package egovframework.com.sym.bat.service;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import org.apache.commons.lang3.ObjectUtils;
import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.FileSystemUtils;
import egovframework.com.cmm.service.Globals;
import jakarta.annotation.Resource;

/**
 * ???????? ???? Quartz Job ?????? ???.
 *
 * @author ?
 * @since 2010.08.30
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.08.30  ?         ????
 *   2020.11.05  ???         KISA ?? ??- WhiteList??
 *   2022.11.11  ???          ????????
 *   2025.07.03  ????         ??????PMD???????? ????????-UnusedFormalParameter(???? ???????? ?? ??????)
 *
 *      </pre>
 **/
public class BatchShellScriptJob implements Job {

	/** logger **/
	private static final Logger LOGGER = LoggerFactory.getLogger(BatchShellScriptJob.class);

	@Resource(name = "egovNextUrlWhitelist")
	protected List<String> nextUrlWhitelist;

	/**
	 * (non-Javadoc)
	 * 
	 * @see org.quartz.Job#execute(org.quartz.JobExecutionContext)
	 **/
	@Override
	public void execute(JobExecutionContext jobContext) throws JobExecutionException {

		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();

		LOGGER.debug("job[{}] Trigger??     ?: ", jobContext.getJobDetail().getKey().getName(),
				jobContext.getTrigger().getKey().getName());
		LOGGER.debug("job[{}] BatchOpert??     ?: ", jobContext.getJobDetail().getKey().getName(),
				dataMap.getString("batchOpertId"));
		LOGGER.debug("job[{}] BatchProgram??     ?: ", jobContext.getJobDetail().getKey().getName(),
				dataMap.getString("batchProgrm"));
		LOGGER.debug("job[{}] Parameter??     ?: ", jobContext.getJobDetail().getKey().getName(),
				dataMap.getString("paramtr"));

		int result = executeProgram(dataMap.getString("batchProgrm"), dataMap.getString("paramtr"));

		// jobContext??? ?????
		jobContext.setResult(result);
	}

	/**
	 * ?????????????? ????.
	 * 
	 * @param batchProgrm ????
	 * @param paramtr     ?????????????
	 * @return ??????integer)
	 * @exception Exception
	 **/
	private int executeProgram(String batchProgrm, String paramtr) {
		if (LOGGER.isDebugEnabled()) {
			LOGGER.debug("paramtr={}", paramtr);
		}

		int result = 0;

		String propertyValue = EgovProperties.getProperty("SHELL." + Globals.OS_TYPE + ".batchShellFiles");

		if (ObjectUtils.isEmpty(propertyValue) || propertyValue.length() == 0) {

			LOGGER.debug("SHELL.Globals.OSTYPE.batchShellFiles OK");
			LOGGER.debug("SHELL.UNIX/WINDOWS.batchShellFiles properties not defined");
			throw new SecurityException("SHELL.UNIX/WINDOWS.batchShellFiles WhiteList Blocked!");

		} else {

			LOGGER.debug("SHELL.UNIX/WINDOWS.batchShellFiles properties = " + propertyValue);
			List<String> cmdShell = Arrays.asList(propertyValue.split(","));
			LOGGER.debug("SHELL.UNIX/WINDOWS.batchShellFiles size() = " + cmdShell.size());

			for (String item : cmdShell) {
				boolean whiteListStatus = batchProgrm.contains(item);
				LOGGER.debug("SHELL.UNIX/WINDOWS.batchShellFiles WhiteList item = " + item + ", status = "
						+ whiteListStatus);
				if (whiteListStatus) {
					try {
						// 2022.11.11 ????????
						FileSystemUtils util = new FileSystemUtils();
						Process process = util.processOperate("BatchShellScriptJob", item);
						process.waitFor();
						result = process.exitValue();
						LOGGER.debug("         ???      ?          - {} ??      ?         ,          ?      ? {}", item, result);
					} catch (IOException e) {
						LOGGER.error("         ???      ?   ?????       ?   ?    : {}", e.getMessage());
					} catch (InterruptedException e) {
						LOGGER.error("         ???      ?   ?????       ?   ?    : {}", e.getMessage());
					}
				}
			}
		}

		return result;
	}

}
