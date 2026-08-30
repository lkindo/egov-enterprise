package nuri.migration.jdbc;

/** 외부 driver 경계에서 JVM process-fatal 오류만 식별한다. */
final class JvmFailureBoundary {

    private JvmFailureBoundary() {}

    static boolean isFatal(Throwable failure) {
        return failure instanceof VirtualMachineError
                || "java.lang.ThreadDeath".equals(failure.getClass().getName());
    }

    static void rethrowIfFatal(Throwable failure) {
        if (failure instanceof VirtualMachineError fatal) {
            throw fatal;
        }
        if ("java.lang.ThreadDeath".equals(failure.getClass().getName())) {
            throw (Error) failure;
        }
    }
}
