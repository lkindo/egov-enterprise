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
 * 諛곗튂?섏뒪?щ┰?몃? ?ㅽ뻾?섎뒗 Quartz Job ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @since 2010.08.30
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.30  源吏꾨쭔          理쒖큹 ?앹꽦
 *   2020.11.05  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 - WhiteList泥섎━
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2025.07.03  ?대갚??         而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnusedFormalParameter(硫붿냼???좎뼵 ?댁뿉?ъ슜?섏? ?딅뒗 ?뚮씪誘명꽣瑜??먯?)
 *
 *      </pre>
 */
public class BatchShellScriptJob implements Job {

	/** logger */
	private static final Logger LOGGER = LoggerFactory.getLogger(BatchShellScriptJob.class);

	@Resource(name = "egovNextUrlWhitelist")
	protected List<String> nextUrlWhitelist;

	/**
	 * (non-Javadoc)
	 * 
	 * @see org.quartz.Job#execute(org.quartz.JobExecutionContext)
	 */
	@Override
	public void execute(JobExecutionContext jobContext) throws JobExecutionException {

		JobDataMap dataMap = jobContext.getJobDetail().getJobDataMap();

		LOGGER.debug("job[{}] Trigger?대쫫 : ", jobContext.getJobDetail().getKey().getName(),
				jobContext.getTrigger().getKey().getName());
		LOGGER.debug("job[{}] BatchOpert?대쫫 : ", jobContext.getJobDetail().getKey().getName(),
				dataMap.getString("batchOpertId"));
		LOGGER.debug("job[{}] BatchProgram?대쫫 : ", jobContext.getJobDetail().getKey().getName(),
				dataMap.getString("batchProgrm"));
		LOGGER.debug("job[{}] Parameter?대쫫 : ", jobContext.getJobDetail().getKey().getName(),
				dataMap.getString("paramtr"));

		int result = executeProgram(dataMap.getString("batchProgrm"), dataMap.getString("paramtr"));

		// jobContext??寃곌낵媛믪쓣 ??ν븳??
		jobContext.setResult(result);
	}

	/**
	 * ?쒖뒪?쒖뿉???뱀젙 ?섑봽濡쒓렇?⑥쓣 ?ㅽ뻾?쒕떎.
	 * 
	 * @param batchProgrm 諛곗튂?ㅽ뻾?붿씪
	 * @param paramtr     諛곗튂?ㅽ뻾?붿씪???꾨떖???뚮씪誘명꽣
	 * @return 諛곗튂?ㅽ뻾?붿씪由ы꽩媛?integer)
	 * @exception Exception
	 */
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
						// 2022.11.11 ?쒗걧?댁퐫??泥섎━
						FileSystemUtils util = new FileSystemUtils();
						Process process = util.processOperate("BatchShellScriptJob", item);
						process.waitFor();
						result = process.exitValue();
						LOGGER.debug("諛곗튂?ㅽ뻾?붿씪 - {} ?ㅽ뻾?꾨즺, 寃곌낵媛? {}", item, result);
					} catch (IOException e) {
						LOGGER.error("諛곗튂?ㅽ겕由쏀듃 ?ㅽ뻾 ?먮윭 : {}", e.getMessage());
					} catch (InterruptedException e) {
						LOGGER.error("諛곗튂?ㅽ겕由쏀듃 ?ㅽ뻾 ?먮윭 : {}", e.getMessage());
					}
				}
			}
		}

		return result;
	}

}
