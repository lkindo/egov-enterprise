package egovframework.com.cmm.util;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.lang.StringUtils;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;

/**
 * ?ㅺ뎅??properties ?뚯씪???⑺궎吏 援ъ“???대뜑濡??쎌뼱?쒕━??MessageSource
 * 
 * @author 2016 ?쒖??꾨젅?꾩썙???좎?蹂댁닔 ?λ룞??
 * @since 2016.06.10
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2016.06.10  ?λ룞??         理쒖큹 ?앹꽦
 *   2025.05.29  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-ImmutableField(遺덈??꾨뱶), UnnecessarySemicolon(遺덊븘?뷀븳 ?몃?肄쒕줎)
 *
 *      </pre>
 */

public class EgovWildcardReloadableResourceBundleMessageSource
		extends org.springframework.context.support.ReloadableResourceBundleMessageSource {
	private final ResourcePatternResolver resourcePatternResolver = new PathMatchingResourcePatternResolver();

	public void setEgovBasenames(String... basenames) {
		if (basenames != null) {
			List<String> baseNames = new ArrayList<String>();
			for (int i = 0; i < basenames.length; i++) {

				String basename = StringUtils.trimToEmpty(basenames[i]);
				if (basename.indexOf("classpath:/") > -1) {
					baseNames.add(basename);
				} else if (StringUtils.isNotBlank(basename)) {
					try {

						Resource[] resources = resourcePatternResolver.getResources(basename);

						for (int j = 0; j < resources.length; j++) {
							Resource resource = resources[j];
							String uri = resource.getURI().toString();
							String baseName = null;

							if (uri.indexOf(".properties") == -1) {
								continue;
							}

							if (resource instanceof FileSystemResource) {
								baseName = "classpath:" + StringUtils.substringBetween(uri, "/classes/", ".properties");
								baseName = baseName.substring(0, baseName.indexOf("_"));
								baseName = baseName.replaceAll("classpath:", "classpath:/");
								if (baseNames.indexOf(baseName) > -1) {
									continue;
								}

							} else if (resource instanceof ClassPathResource) {
								baseName = StringUtils.substringBefore(uri, ".properties");
								baseName = baseName.substring(0, baseName.indexOf("_"));
								baseName = baseName.replaceAll("classpath:", "classpath:/");
							} else if (resource instanceof UrlResource) {
								baseName = "classpath:" + StringUtils.substringBetween(uri, ".jar!/", ".properties");
								baseName = baseName.substring(0, baseName.indexOf("_"));
								baseName = baseName.replaceAll("classpath:", "classpath:/");
							}
							if (baseName != null) {
								String fullName = processBasename(baseName);
								baseNames.add(fullName);
							}
						}
					} catch (IOException e) {
						logger.debug("No message source files found for basename " + basename + ".");
					}
				}

			}

			logger.debug("EgovWildcardReloadableResourceBundleMessageSource>>basenames>[" + baseNames + "}");
			setBasenames(baseNames.toArray(new String[baseNames.size()]));
		}
	}

	String processBasename(String baseName) {
		String prefix = StringUtils.substringBeforeLast(baseName, "/");
		String name = StringUtils.substringAfterLast(baseName, "/");
		do {
			name = StringUtils.substringBeforeLast(name, "_");
		} while (name.contains("_"));
		return prefix + "/" + name;
	}
}
