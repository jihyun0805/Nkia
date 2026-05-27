package com.nkia.Orbis.domain.alarm.controller;

import com.nkia.Orbis.common.response.ApiResponse;
import com.nkia.Orbis.domain.alarm.dto.response.AlarmResponse;
import com.nkia.Orbis.domain.alarm.service.AlarmService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "Alarm", description = "알림 관련 API")
@RequestMapping("/alarms")
public class AlarmController {

    private final AlarmService alarmService;

    /**
     * 1. 안 읽은 알림 목록 조회
     */
    @Operation(summary = "나의 안 읽은 알림 목록 조회")
    @GetMapping("/unread")
    public ResponseEntity<ApiResponse<List<AlarmResponse>>> getUnreadAlarms(
            @AuthenticationPrincipal UUID userId) {

        List<AlarmResponse> response = alarmService.getUnreadAlarms(userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 2. 특정 알림 단건 읽음 처리
     */
    @Operation(summary = "알림 읽음 처리 (단건)")
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UUID userId) {

        alarmService.markAsRead(id, userId);

        // 상태만 변경하고 반환 데이터가 없을 경우 null 반환
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 3. 알림 모두 읽음 처리 (선택)
     */
    @Operation(summary = "나의 모든 알림 읽음 처리")
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal UUID userId) {

        alarmService.markAllAsRead(userId);

        return ResponseEntity.ok(ApiResponse.success(null));
    }
}