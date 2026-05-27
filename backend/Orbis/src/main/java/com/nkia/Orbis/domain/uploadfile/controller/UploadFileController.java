package com.nkia.Orbis.domain.uploadfile.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.uploadfile.entity.FileCategory;
import com.nkia.Orbis.domain.uploadfile.entity.UploadFile;
import com.nkia.Orbis.domain.uploadfile.service.UploadFileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@Tag(name = "UploadFile", description = "파일 업로드 API")
public class UploadFileController {

    private final UploadFileService uploadFileService;

    /**
     * 1. 범용 파일 업로드 API 파일을 MinIO에 물리적 업로드하고 DB에 메타데이터를 저장한 뒤, fileId를 반환합니다.
     */
    @Operation(summary = "파일 업로드")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Long>> uploadFile(@RequestPart("file") MultipartFile file,
                                                        @RequestParam("category") FileCategory category
    ) {
        Long fileId = uploadFileService.uploadFile(file, category);
        return ResponseEntity.ok(ApiResponse.success(fileId));
    }

    /**
     * 2. 범용 파일 다운로드 API fileId를 받아 파일 스트림을 반환합니다.
     */
    @Operation(summary = "파일 다운로드")
    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fileId) throws Exception {
        // 1. Service에서 파일 스트림 가져오기
        InputStream inputStream = uploadFileService.downloadFile(fileId);
        Resource resource = new InputStreamResource(inputStream);

        // 2. 다운로드 헤더 설정을 위한 파일 메타데이터 조회
        UploadFile uploadFile = uploadFileService.getUploadFile(fileId);

        String contentDisposition = createContentDisposition(uploadFile);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(uploadFile.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .body(resource);
    }

    private String createContentDisposition(UploadFile uploadFile) {
        return ContentDisposition.attachment()
                .filename(uploadFile.getOriginalFileName(), StandardCharsets.UTF_8)
                .build()
                .toString();
    }

    /**
     * 3. 이미지 조회를 위한 Presigned URL 발급 API 내부적으로 DB 조회를 수행하므로 fileId만 넘겨줍니다.
     */
    @Operation(summary = "이미지 조회 위한 Presigned URL 발급")
    @GetMapping("/{fileId}/view")
    public ResponseEntity<ApiResponse<String>> getFileViewUrl(@PathVariable Long fileId) {
        String presignedUrl = uploadFileService.getPresignedUrl(fileId);
        return ResponseEntity.ok(ApiResponse.success(presignedUrl));
    }

    /**
     * 4. [추가] 파일 삭제 API fileId를 받아 DB Soft Delete 및 MinIO 물리 삭제를 수행합니다.
     */
    @Operation(summary = "파일 삭제")
    @DeleteMapping("/{fileId}")
    public ResponseEntity<ApiResponse<Void>> removeFile(@PathVariable Long fileId) {
        uploadFileService.removeFile(fileId);
        // 삭제 성공 시 204 No Content 반환
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}