package egovframework.com.sym.log.lgm.service;

import org.aspectj.lang.ProceedingJoinPoint;
import org.springframework.util.StopWatch;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import jakarta.annotation.Resource;

/**
 * ??????????? ASPECT ?????
 * 
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.11  ????         ????
 *   2011.07.01  ????         ??? ???sym.log -> sym.log.lgm)
 *   2025.07.11  ????         2025????????PMD???????? ????????-UnnecessaryBoxing(???WrapperObject ??)
 *
 *      </pre>
 **/
public class EgovSysLogAspect {

	@Resource(name = "EgovSysLogService")
	private EgovSysLogService sysLogService;

	/**
	 * ????????????. sevice Class??insert????? Method
	 *
	 * @param ProceedingJoinPoint
	 * @return Object
	 * @throws Exception
	 **/
	public Object logInsert(ProceedingJoinPoint joinPoint) throws Throwable {

		StopWatch stopWatch = new StopWatch();

		try {
			stopWatch.start();

			Object retValue = joinPoint.proceed();
			return retValue;
		} catch (Throwable e) {
			throw e;
		} finally {
			stopWatch.stop();

			SysLog sysLog = new SysLog();
			String className = joinPoint.getTarget().getClass().getName();
			String methodName = joinPoint.getSignature().getName();
			String processSeCode = "C";
			String processTime = Long.toString(stopWatch.getTotalTimeMillis());

			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			if (loginVO != null) {
				sysLog.setRqesterId(loginVO.getUniqId());
				sysLog.setRqesterIp(loginVO.getIp());
			}

			sysLog.setSrvcNm(className);
			sysLog.setMethodNm(methodName);
			sysLog.setProcessSeCode(processSeCode);
			sysLog.setProcessTime(processTime);

			sysLogService.logInsertSysLog(sysLog);

		}

	}

	/**
	 * ????????????. sevice Class??update????? Method
	 *
	 * @param ProceedingJoinPoint
	 * @return Object
	 * @throws Exception
	 **/
	public Object logUpdate(ProceedingJoinPoint joinPoint) throws Throwable {

		StopWatch stopWatch = new StopWatch();

		try {
			stopWatch.start();

			Object retValue = joinPoint.proceed();
			return retValue;
		} catch (Throwable e) {
			throw e;
		} finally {
			stopWatch.stop();

			SysLog sysLog = new SysLog();
			String className = joinPoint.getTarget().getClass().getName();
			String methodName = joinPoint.getSignature().getName();
			String processSeCode = "U";
			String processTime = Long.toString(stopWatch.getTotalTimeMillis());

			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			if (loginVO != null) {
				sysLog.setRqesterId(loginVO.getUniqId());
				sysLog.setRqesterIp(loginVO.getIp());
			}

			sysLog.setSrvcNm(className);
			sysLog.setMethodNm(methodName);
			sysLog.setProcessSeCode(processSeCode);
			sysLog.setProcessTime(processTime);

			sysLogService.logInsertSysLog(sysLog);

		}

	}

	/**
	 * ????????????. sevice Class??delete????? Method
	 *
	 * @param ProceedingJoinPoint
	 * @return Object
	 * @throws Exception
	 **/
	public Object logDelete(ProceedingJoinPoint joinPoint) throws Throwable {

		StopWatch stopWatch = new StopWatch();

		try {
			stopWatch.start();

			Object retValue = joinPoint.proceed();
			return retValue;
		} catch (Throwable e) {
			throw e;
		} finally {
			stopWatch.stop();

			SysLog sysLog = new SysLog();
			String className = joinPoint.getTarget().getClass().getName();
			String methodName = joinPoint.getSignature().getName();
			String processSeCode = "D";
			String processTime = Long.toString(stopWatch.getTotalTimeMillis());

			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			if (loginVO != null) {
				sysLog.setRqesterId(loginVO.getUniqId());
				sysLog.setRqesterIp(loginVO.getIp());
			}

			sysLog.setSrvcNm(className);
			sysLog.setMethodNm(methodName);
			sysLog.setProcessSeCode(processSeCode);
			sysLog.setProcessTime(processTime);

			sysLogService.logInsertSysLog(sysLog);

		}

	}

	/**
	 * ????????????. sevice Class??select????? Method
	 *
	 * @param ProceedingJoinPoint
	 * @return Object
	 * @throws Exception
	 **/
	public Object logSelect(ProceedingJoinPoint joinPoint) throws Throwable {

		StopWatch stopWatch = new StopWatch();

		try {
			stopWatch.start();

			Object retValue = joinPoint.proceed();
			return retValue;
		} catch (Throwable e) {
			throw e;
		} finally {
			stopWatch.stop();

			SysLog sysLog = new SysLog();
			String className = joinPoint.getTarget().getClass().getName();
			String methodName = joinPoint.getSignature().getName();
			String processSeCode = "R";
			String processTime = Long.toString(stopWatch.getTotalTimeMillis());

			LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			if (loginVO != null) {
				sysLog.setRqesterId(loginVO.getUniqId());
				sysLog.setRqesterIp(loginVO.getIp());
			}

			sysLog.setSrvcNm(className);
			sysLog.setMethodNm(methodName);
			sysLog.setProcessSeCode(processSeCode);
			sysLog.setProcessTime(processTime);

			sysLogService.logInsertSysLog(sysLog);

		}

	}

}
