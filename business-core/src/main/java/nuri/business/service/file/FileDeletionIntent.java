package nuri.business.service.file;

/** Only storage identifiers and an opaque object identity; original filenames and contents are excluded. */
record FileDeletionIntent(String filename, String targetPath, String identity) {}
