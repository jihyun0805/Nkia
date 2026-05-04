package com.nkia.Orbis.domain.uploadfile.service;

import com.nkia.Orbis.domain.uploadfile.dto.response.FileUploadResult;
import com.nkia.Orbis.domain.uploadfile.entity.FileCategory;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.http.Method;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class UploadFileService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    /**
     * 파일 업로드 (이미지 및 일반 문서 공용)
     *
     * @param file     업로드할 파일
     * @param category 파일 카테고리 (Enum)
     */
    public FileUploadResult uploadFile(MultipartFile file, FileCategory category) {
        try {
            // 1. 버킷 존재 여부 확인 및 생성
            ensureBucketExists();

            // 2. Object Key(저장 경로) 생성
            // 형식: 카테고리/YYYY/MM/UUID.확장자
            String objectKey = generateObjectKey(category.getDirectory(), file.getOriginalFilename());

            // 3. MinIO에 파일 업로드[cite: 1]
            executeUpload(file, objectKey);

            log.info("파일 업로드 완료: {} -> {}", file.getOriginalFilename(), objectKey);
            return getFileUploadResult(file, objectKey);

        } catch (Exception e) {
            log.error("파일 업로드 중 오류 발생", e);
            throw new RuntimeException("파일 업로드에 실패했습니다.", e);
        }
    }

    private void ensureBucketExists() throws Exception {
        boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!found) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
        }
    }

    private String generateObjectKey(String directory, String originalFileName) {
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
        String uuid = UUID.randomUUID().toString();

        String extension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }

        return String.format("%s/%s/%s%s", directory, datePath, uuid, extension);
    }

    private void executeUpload(MultipartFile file, String objectKey)
            throws Exception {
        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
        }
    }

    private FileUploadResult getFileUploadResult(MultipartFile file, String objectKey) {
        return new FileUploadResult(file.getOriginalFilename(), objectKey, file.getContentType(), file.getSize());
    }

    /**
     * MinIO 파일 삭제
     *
     * @param objectKey 삭제할 파일의 경로
     */
    public void removeFile(String objectKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .build()
            );
            log.info("MinIO 파일 삭제 성공: {}", objectKey);
        } catch (Exception e) {
            log.error("MinIO 파일 삭제 실패: {}", objectKey, e);
        }
    }

    // 파일 다운로드
    public InputStream downloadFile(String objectKey) throws Exception {
        return minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectKey)
                        .build()
        );
    }

    // 이미지 조회 위한 presignedUrl 반환
    public String getPresignedUrl(String objectKey) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(objectKey)
                            .expiry(60 * 60) // 1시간 동안 유효
                            .build()
            );
        } catch (Exception e) {
            log.error("URL 생성 실패", e);
            return null;
        }
    }
}