package nuri.recoveryprobe;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.lang.reflect.InvocationTargetException;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.zip.ZipFile;

/** Test-only reflection probe of the actual boot jar; no application endpoint or business migration. */
public final class ReleaseSmokeProbe {
    private static final String PLAIN = "synthetic-release-crypto-probe-v1";
    private ReleaseSmokeProbe() { }

    public static void main(String[] args) throws Exception {
        if (args.length == 2 && args[0].equals("manifest")) {
            try (var jar = new ZipFile(Path.of(args[1]).toFile())) {
                List<String> rows = new ArrayList<>();
                var entries = jar.entries();
                while (entries.hasMoreElements()) {
                    var entry = entries.nextElement();
                    if (!entry.getName().startsWith("BOOT-INF/classes/db/migration/") || !entry.getName().endsWith(".sql")) continue;
                    if (entry.getSize() < 0 || entry.getSize() > 4 * 1024 * 1024 || !entry.getName().matches("BOOT-INF/classes/db/migration/[A-Za-z0-9_]+\\.sql")) throw new IllegalStateException("Unsafe migration entry");
                    byte[] bytes;
                    try (var input = jar.getInputStream(entry)) { bytes = input.readNBytes(4 * 1024 * 1024 + 1); }
                    if (bytes.length != entry.getSize()) throw new IllegalStateException("Invalid migration size");
                    String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
                    rows.add("{\"path\":\"api-server/src/main/resources/db/migration/" + entry.getName().substring(entry.getName().lastIndexOf('/') + 1) + "\",\"sha256\":\"" + hash + "\"}");
                }
                rows.sort(Comparator.naturalOrder());
                System.out.println("EGOV_PROBE=[" + String.join(",", rows) + "]");
            }
            return;
        }
        String key = System.getenv("ALGORITHM_KEY");
        if (key == null || key.isBlank()) throw new IllegalStateException("Probe key missing");
        var configType = Class.forName("nuri.foundation.core.config.ProjectCryptoConfig");
        Object config = configType.getConstructor().newInstance();
        var configKey = configType.getDeclaredField("algorithmKey"); configKey.setAccessible(true); configKey.set(config, key);
        Object crypto = configType.getMethod("cryptoService").invoke(config);
        var utility = Class.forName("nuri.foundation.core.util.CryptoUtil");
        var service = utility.getDeclaredField("cryptoService"); service.setAccessible(true); service.set(null, crypto);
        var activeKey = utility.getDeclaredField("algorithmKey"); activeKey.setAccessible(true); activeKey.set(null, key);
        var converterType = Class.forName("nuri.business.domain.common.RrnoEncryptionConverter");
        Object converter = converterType.getConstructor().newInstance();
        if (args.length == 1 && args[0].equals("encrypt")) {
            Object cipher = converterType.getMethod("convertToDatabaseColumn", String.class).invoke(converter, PLAIN);
            System.out.println("EGOV_PROBE=" + cipher);
        } else if (args.length == 1 && args[0].equals("verify")) {
            String cipher = new String(System.in.readNBytes(1024), StandardCharsets.UTF_8).trim();
            Object plain = converterType.getMethod("convertToEntityAttribute", String.class).invoke(converter, cipher);
            if (!PLAIN.equals(plain)) throw new IllegalStateException("Cipher readback mismatch");
            // The wrong-key control must fail using the actual packaged crypto implementation.
            boolean rejected = false;
            var decrypt = crypto.getClass().getMethod("decrypt", byte[].class, String.class);
            try { decrypt.invoke(crypto, Base64.getDecoder().decode(cipher), "wrong-owned-probe-key"); }
            catch (InvocationTargetException expected) { rejected = true; }
            if (!rejected) throw new IllegalStateException("Wrong key was accepted");
            System.out.println("EGOV_PROBE=verified");
        } else throw new IllegalArgumentException("Invalid probe mode");
    }
}
