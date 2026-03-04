package egovframework.com.utl.sim.service;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.security.MessageDigest;

import org.apache.commons.codec.binary.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Base64?紐꾪맜???遺욱맜??獄쎻뫗?????곸뒠???怨쀬뵠?怨? ?酉???癰귣벏??酉釉??Business Interface class
 *
 * @author ?⑤벏???뺥돩??븐뻣獄쏆뮉? 獄쏅벡???
 * @since 2009.01.19
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 揶쏆뮇?????Modification Information) >>
 *
 *   ??륁젟??     ??륁젟??          ??륁젟??곸뒠
 *  -------    --------    ---------------------------
 *   2009.01.19  獄쏅벡???         筌ㅼ뮇????밴쉐
 *   2011.08.31  JJY            野껋럥???띻펾 ??쀫탣???뚣끉??怨뺤춳??곸췅甕곌쑴????밴쉐
 *
 *      </pre>
 */
public class EgovFileScrty {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovFileScrty.class);

	// ???뵬?닌됲뀋??
	static final char FILE_SEPARATOR = File.separatorChar;
	// 甕곌쑵????좑쭩?
	static final int BUFFER_SIZE = 1024;

	/**
	 * ???뵬???酉??酉釉??疫꿸퀡??
	 *
	 * @param String source ?酉??酉釉????뵬
	 * @param String target ?酉??遺얜쭆 ???뵬
	 * @return boolean result ?酉??遺용연?봔 True/False
	 * @exception Exception
	 */
	public static boolean encryptFile(String source, String target) throws Exception {

		// ?酉??????
		boolean result = false;

		String sourceFile = source.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR);
		String targetFile = target.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR);
		File srcFile = new File(sourceFile);

		BufferedInputStream input = null;
		BufferedOutputStream output = null;

		byte[] buffer = new byte[BUFFER_SIZE];

		try {
			if (srcFile.exists() && srcFile.isFile()) {

				input = new BufferedInputStream(new FileInputStream(srcFile));
				output = new BufferedOutputStream(new FileOutputStream(targetFile));

				int length = 0;
				while ((length = input.read(buffer)) >= 0) {
					byte[] data = new byte[length];
					System.arraycopy(buffer, 0, data, 0, length);
					output.write(encodeBinary(data).getBytes());
					output.write(System.getProperty("line.separator").getBytes());
				}

				result = true;
			}
		} finally {
			if (input != null) {
				try {
					input.close();
				} catch (IOException ignore) {
					LOGGER.debug("IGNORE: {}", ignore);
				}
			}
			if (output != null) {
				try {
					output.close();
				} catch (IOException ignore) {
					LOGGER.debug("IGNORE: {}", ignore);
				}
			}
		}
		return result;
	}

	/**
	 * ???뵬??癰귣벏??酉釉??疫꿸퀡??
	 *
	 * @param String source 癰귣벏??酉釉????뵬
	 * @param String target 癰귣벏??遺얜쭆 ???뵬
	 * @return boolean result 癰귣벏??遺용연?봔 True/False
	 * @exception Exception
	 */
	public static boolean decryptFile(String source, String target) throws Exception {

		// 癰귣벏??????
		boolean result = false;

		String sourceFile = source.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR);
		String targetFile = target.replace('\\', FILE_SEPARATOR).replace('/', FILE_SEPARATOR);
		File srcFile = new File(sourceFile);

		BufferedReader input = null;
		BufferedOutputStream output = null;

		// byte[] buffer = new byte[BUFFER_SIZE];
		String line = null;

		try {
			if (srcFile.exists() && srcFile.isFile()) {

				input = new BufferedReader(new InputStreamReader(new FileInputStream(srcFile)));
				output = new BufferedOutputStream(new FileOutputStream(targetFile));

				while ((line = input.readLine()) != null) {
					byte[] data = line.getBytes();
					output.write(decodeBinary(new String(data)));
				}

				result = true;
			}
		} finally {
			if (input != null) {
				try {
					input.close();
				} catch (IOException ignore) {
					LOGGER.debug("IGNORE: {}", ignore);
				}
			}
			if (output != null) {
				try {
					output.close();
				} catch (IOException ignore) {
					LOGGER.debug("IGNORE: {}", ignore);
				}
			}
		}
		return result;
	}

	/**
	 * ?怨쀬뵠?怨? ?酉??酉釉??疫꿸퀡??
	 *
	 * @param byte[] data ?酉??酉釉??怨쀬뵠??
	 * @return String result ?酉??遺얜쭆 ?怨쀬뵠??
	 * @exception Exception
	 */
	public static String encodeBinary(byte[] data) throws Exception {
		if (data == null) {
			return "";
		}

		return new String(Base64.encodeBase64(data));
	}

	/**
	 * ?怨쀬뵠?怨? ?酉??酉釉??疫꿸퀡??
	 *
	 * @param String data ?酉??酉釉??怨쀬뵠??
	 * @return String result ?酉??遺얜쭆 ?怨쀬뵠??
	 * @exception Exception
	 */
	public static String encode(String data) throws Exception {
		return encodeBinary(data.getBytes());
	}

	/**
	 * ?怨쀬뵠?怨? 癰귣벏??酉釉??疫꿸퀡??
	 *
	 * @param String data 癰귣벏??酉釉??怨쀬뵠??
	 * @return String result 癰귣벏??遺얜쭆 ?怨쀬뵠??
	 * @exception Exception
	 */
	public static byte[] decodeBinary(String data) throws Exception {
		return Base64.decodeBase64(data.getBytes());
	}

	/**
	 * ?怨쀬뵠?怨? 癰귣벏??酉釉??疫꿸퀡??
	 *
	 * @param String data 癰귣벏??酉釉??怨쀬뵠??
	 * @return String result 癰귣벏??遺얜쭆 ?怨쀬뵠??
	 * @exception Exception
	 */
	public static String decode(String data) throws Exception {
		return new String(decodeBinary(data));
	}

	/**
	 * ??쑬?甕곕뜇?뉒몴??酉??酉釉??疫꿸퀡??癰귣벏??遺? ??롢늺 ??덈┷沃샕嚥?SHA-256 ?紐꾪맜??獄쎻뫗???怨몄뒠).
	 *
	 * deprecated : 癰귣똻釉?揶쏅벤?뺟몴??袁る릭??salt嚥?ID??筌왖?類λ릭??encryptPassword(password, id) ????
	 *
	 * @param String data ?酉??酉釉???쑬?甕곕뜇??
	 * @return String result ?酉??遺얜쭆 ??쑬?甕곕뜇??
	 * @exception Exception
	 */
	@Deprecated
	public static String encryptPassword(String data) throws Exception {

		if (data == null) {
			return "";
		}

		byte[] plainText = null; // ??겆?
		byte[] hashValue = null; // ??곷룴揶?
		plainText = data.getBytes();

		MessageDigest md = MessageDigest.getInstance("SHA-256");

		// 癰궰野???疫꿸퀣??hash 揶쏅?肉?野꺜筌??븍뜃?.. => deprecated ??쀪텕???醫?
		/*
		 * // Random 獄쎻뫗???salt ?곕떽?
		 * SecureRandom ng = new SecureRandom();
		 * byte[] randomBytes = new byte[16];
		 * ng.nextBytes(randomBytes);
		 *
		 * md.reset();
		 * md.update(randomBytes);
		 *
		 */
		hashValue = md.digest(plainText);

		/*
		 * BASE64Encoder encoder = new BASE64Encoder();
		 * return encoder.encode(hashValue);
		 */
		return new String(Base64.encodeBase64(hashValue));
	}

	/**
	 * ??쑬?甕곕뜇?뉒몴??酉??酉釉??疫꿸퀡??癰귣벏??遺? ??롢늺 ??덈┷沃샕嚥?SHA-256 ?紐꾪맜??獄쎻뫗???怨몄뒠)
	 *
	 * @param password ?酉??遺얜쭍 ??λ뮞???굡
	 * @param id       salt嚥???????????ID 筌왖??
	 * @return
	 * @throws Exception
	 */
	public static String encryptPassword(String password, String id) throws Exception {

		if (password == null) {
			return "";
		}

		byte[] hashValue = null; // ??곷룴揶?

		MessageDigest md = MessageDigest.getInstance("SHA-256");

		md.reset();
		md.update(id.getBytes());

		hashValue = md.digest(password.getBytes());

		return new String(Base64.encodeBase64(hashValue));
	}

	/**
	 * ??쑬?甕곕뜇?뉒몴??酉??酉釉??疫꿸퀡??癰귣벏??遺? ??롢늺 ??덈┷沃샕嚥?SHA-256 ?紐꾪맜??獄쎻뫗???怨몄뒠)
	 *
	 * @param data ?酉??酉釉???쑬?甕곕뜇??
	 * @param salt Salt
	 * @return ?酉??遺얜쭆 ??쑬?甕곕뜇??
	 * @throws Exception
	 */
	public static String encryptPassword(String data, byte[] salt) throws Exception {

		if (data == null) {
			return "";
		}

		byte[] hashValue = null; // ??곷룴揶?

		MessageDigest md = MessageDigest.getInstance("SHA-256");

		md.reset();
		md.update(salt);

		hashValue = md.digest(data.getBytes());

		return new String(Base64.encodeBase64(hashValue));
	}

	/**
	 * ??쑬?甕곕뜇?뉒몴??酉??遺얜쭆 ??λ뮞???굡 野꺜筌?salt揶쎛 ?????野껋럩??쭕??怨몄뒠).
	 *
	 * @param data    ????λ뮞???굡
	 * @param encoded ??곷룴筌ｌ꼶?????λ뮞???굡(Base64 ?紐꾪맜??
	 * @return
	 * @throws Exception
	 */
	public static boolean checkPassword(String data, String encoded, byte[] salt) throws Exception {
		byte[] hashValue = null; // ??곷룴揶?

		MessageDigest md = MessageDigest.getInstance("SHA-256");

		md.reset();
		md.update(salt);
		hashValue = md.digest(data.getBytes());

		return MessageDigest.isEqual(hashValue, Base64.decodeBase64(encoded.getBytes()));
	}
}